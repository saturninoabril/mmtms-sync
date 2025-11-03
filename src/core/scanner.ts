/**
 * Scanner: Detect sync status for test files and directories
 *
 * Implements T096-T100:
 * - T096: Scanner class with status detection logic
 * - T097: scanDirectory() method - glob for .spec.ts files
 * - T098: scanFile() method - parse + validate + detect sync status
 * - T099: detectSyncStatus() method - categorize based on hash, ID, validation
 * - T100: calculateMetrics() method - sync coverage, doc compliance percentages
 */

import { TestParser } from './parser';
import { Validator } from './validator';
import { ChangeDetector } from './change-detector';
import { MappingManager } from './mapping-manager';
import type { ParsedTest } from '../models/parsed-test';
import { SyncStatus, TestCaseMapping } from '../models/test-case-mapping';
import type { FileResult, ScanResult } from '../models/scan-result';
import { DEFAULT_CONFIG, type ValidationConfig } from '../models/configuration';
import fastGlob from 'fast-glob';

export class Scanner {
    private parser: TestParser;
    private validator: Validator;
    private changeDetector: ChangeDetector;
    private mappingManager: MappingManager;

    constructor(validationConfig?: ValidationConfig) {
        const config = validationConfig || DEFAULT_CONFIG.validation;
        this.parser = new TestParser(config.projectKey);
        this.validator = new Validator(config);
        this.changeDetector = new ChangeDetector();
        this.mappingManager = new MappingManager();
    }

    /**
     * Scan a directory for test files and detect sync status
     * T097: Glob for .spec.ts files
     */
    async scanDirectory(directoryPath: string, patterns: string[] = ['**/*.spec.ts']): Promise<ScanResult> {
        const startTime = Date.now();
        const files = await fastGlob(patterns, {
            cwd: directoryPath,
            absolute: true,
            ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
        });

        const fileResults = await this.scanAllFiles(files);
        const metrics = this.calculateMetrics(fileResults);
        const duration = Date.now() - startTime;

        return {
            summary: {
                totalFiles: files.length,
                totalTests: metrics.totalTests,
                syncedTests: metrics.syncedTests,
                unmappedTests: metrics.unmappedTests,
                outOfSyncTests: metrics.outOfSyncTests,
                validationErrors: metrics.validationErrors,
            },
            metrics: {
                syncCoverage: metrics.syncCoverage,
                documentationCompliance: metrics.documentationCompliance,
            },
            fileResults,
            scannedAt: new Date().toISOString(),
            duration,
        };
    }

    private async scanAllFiles(files: string[]): Promise<FileResult[]> {
        const fileResults: FileResult[] = [];
        for (const filePath of files) {
            try {
                const fileResult = await this.scanFile(filePath);
                fileResults.push(fileResult);
            } catch (error) {
                fileResults.push(this.createErrorFileResult(filePath, error));
            }
        }
        return fileResults;
    }

    private createErrorFileResult(filePath: string, error: unknown): FileResult {
        return {
            filePath,
            testCount: 0,
            syncedCount: 0,
            unmappedCount: 0,
            outOfSyncCount: 0,
            validationErrorCount: 1,
            issues: [
                {
                    testTitle: 'File Scan Error',
                    syncStatus: SyncStatus.Unsynced,
                    message: error instanceof Error ? error.message : String(error),
                },
            ],
        };
    }

    /**
     * Scan a single test file
     * T098: Parse + validate + detect sync status
     */
    async scanFile(filePath: string): Promise<FileResult> {
        // Parse the file
        const parseResult = this.parser.parseTestFile(filePath);

        // Load existing mappings for this file
        // Mapping file path is {testFilePath}.mapping.json
        const mappingFilePath = `${filePath}.mapping.json`;
        const mappings = await this.mappingManager.loadMapping(mappingFilePath);
        const mappingMap = this.createMappingMap(mappings);

        // Analyze each test
        const issues: Array<{
            testTitle: string;
            syncStatus: SyncStatus;
            message: string;
        }> = [];

        let syncedCount = 0;
        let unmappedCount = 0;
        let outOfSyncCount = 0;
        let validationErrorCount = 0;

        for (const test of parseResult.tests) {
            // Calculate current hash
            const currentHash = this.changeDetector.calculateHash(test);

            // Get mapping if exists
            const mapping = test.testCaseId ? mappingMap.get(test.testCaseId) || null : null;

            // Check validation before determining sync status
            const validationResult = this.validator.validate(test);
            const hasValidationErrors = validationResult.issues.some((issue) => issue.severity === 'error');

            // Detect sync status
            const syncStatus = this.detectSyncStatus(test, mapping, currentHash);

            // Categorize and collect issues
            this.categorizeTestResult(test, syncStatus, hasValidationErrors, validationResult, issues, {
                synced: () => syncedCount++,
                unmapped: () => unmappedCount++,
                outOfSync: () => outOfSyncCount++,
                validationError: () => validationErrorCount++,
            });
        }

        return {
            filePath,
            testCount: parseResult.tests.length,
            syncedCount,
            unmappedCount,
            outOfSyncCount,
            validationErrorCount,
            issues,
        };
    }

    /**
     * Create a mapping lookup map from test case ID to mapping
     */
    private createMappingMap(mappings: TestCaseMapping[]): Map<string, TestCaseMapping> {
        const map = new Map<string, TestCaseMapping>();
        for (const mapping of mappings) {
            if (mapping.testCaseId) {
                map.set(mapping.testCaseId, mapping);
            }
        }
        return map;
    }

    /**
     * Categorize test result and update counters
     */
    private categorizeTestResult(
        test: ParsedTest,
        syncStatus: SyncStatus,
        hasValidationErrors: boolean,
        validationResult: { issues: Array<{ severity: string; message: string }> },
        issues: Array<{ testTitle: string; syncStatus: SyncStatus; message: string }>,
        counters: { synced: () => void; unmapped: () => void; outOfSync: () => void; validationError: () => void }
    ): void {
        switch (syncStatus) {
            case SyncStatus.Synced:
                counters.synced();
                break;
            case SyncStatus.Unsynced:
                this.handleUnsyncedStatus(test, hasValidationErrors, validationResult, issues, counters);
                break;
            case SyncStatus.NeedsUpdate:
                counters.outOfSync();
                issues.push({ testTitle: test.title, syncStatus, message: 'Test content has changed since last sync' });
                break;
        }
    }

    private handleUnsyncedStatus(
        test: ParsedTest,
        hasValidationErrors: boolean,
        validationResult: { issues: Array<{ severity: string; message: string }> },
        issues: Array<{ testTitle: string; syncStatus: SyncStatus; message: string }>,
        counters: { validationError: () => void; unmapped: () => void }
    ): void {
        if (hasValidationErrors) {
            counters.validationError();
            const errorMessages = validationResult.issues
                .filter((issue) => issue.severity === 'error')
                .map((issue) => issue.message)
                .join(', ');
            issues.push({
                testTitle: test.title,
                syncStatus: SyncStatus.Unsynced,
                message: `Validation failed: ${errorMessages}`,
            });
        } else {
            counters.unmapped();
            issues.push({
                testTitle: test.title,
                syncStatus: SyncStatus.Unsynced,
                message: 'Test is not mapped to a TMS test case',
            });
        }
    }

    /**
     * Detect sync status for a single test
     * T099: Categorize based on hash, ID, validation
     */
    detectSyncStatus(parsedTest: ParsedTest, mapping: TestCaseMapping | null, currentHash: string): SyncStatus {
        // First check validation - highest priority
        // Validation errors are treated as "unsynced" since they can't be synced until fixed
        const validationResult = this.validator.validate(parsedTest);
        const hasValidationErrors = validationResult.issues.some((issue) => issue.severity === 'error');

        if (hasValidationErrors) {
            return SyncStatus.Unsynced;
        }

        // Check if mapped
        if (!parsedTest.testCaseId || !mapping) {
            return SyncStatus.Unsynced;
        }

        // Check if hash matches
        if (mapping.lastSyncedHash !== currentHash) {
            return SyncStatus.NeedsUpdate;
        }

        // All good - synced
        return SyncStatus.Synced;
    }

    /**
     * Calculate aggregate metrics from file results
     * T100: Sync coverage, doc compliance percentages
     */
    calculateMetrics(fileResults: FileResult[]): {
        totalTests: number;
        syncedTests: number;
        unmappedTests: number;
        outOfSyncTests: number;
        validationErrors: number;
        syncCoverage: number;
        documentationCompliance: number;
    } {
        let totalTests = 0;
        let syncedTests = 0;
        let unmappedTests = 0;
        let outOfSyncTests = 0;
        let validationErrors = 0;

        for (const fileResult of fileResults) {
            totalTests += fileResult.testCount;
            syncedTests += fileResult.syncedCount;
            unmappedTests += fileResult.unmappedCount;
            outOfSyncTests += fileResult.outOfSyncCount;
            validationErrors += fileResult.validationErrorCount;
        }

        // Calculate sync coverage: (synced + out-of-sync) / total * 100
        // Out-of-sync tests are still "mapped" to TMS, just need updating
        const mappedTests = syncedTests + outOfSyncTests;
        const syncCoverage = totalTests > 0 ? Math.round((mappedTests / totalTests) * 100) : 0;

        // Calculate documentation compliance: tests without validation errors / total * 100
        const validTests = totalTests - validationErrors;
        const documentationCompliance = totalTests > 0 ? Math.round((validTests / totalTests) * 100) : 0;

        return {
            totalTests,
            syncedTests,
            unmappedTests,
            outOfSyncTests,
            validationErrors,
            syncCoverage,
            documentationCompliance,
        };
    }
}
