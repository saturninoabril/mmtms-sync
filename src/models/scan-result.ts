/**
 * Scan Result Model
 *
 * Represents the results of scanning test files for sync status.
 * Includes metrics and categorization of tests by sync status.
 */

import type { SyncStatus } from './test-case-mapping.js';

/**
 * File-level scan result
 */
export interface FileResult {
    /** File path */
    filePath: string;

    /** Total tests in file */
    testCount: number;

    /** Number of synced tests */
    syncedCount: number;

    /** Number of unmapped tests */
    unmappedCount: number;

    /** Number of out-of-sync tests */
    outOfSyncCount: number;

    /** Number of validation errors */
    validationErrorCount: number;

    /** Issues found */
    issues: Array<{
        testTitle: string;
        syncStatus: SyncStatus;
        message: string;
    }>;
}

/**
 * Result of scanning test files for sync status
 */
export interface ScanResult {
    /** Summary counts */
    summary: {
        totalFiles: number;
        totalTests: number;
        syncedTests: number;
        unmappedTests: number;
        outOfSyncTests: number;
        validationErrors: number;
    };

    /** Calculated metrics */
    metrics: {
        syncCoverage: number;
        documentationCompliance: number;
    };

    /** File-level results */
    fileResults: FileResult[];

    /** Scan timestamp */
    scannedAt: string;

    /** Scan duration in milliseconds */
    duration: number;
}

/**
 * Create empty scan result
 */
export function createScanResult(): ScanResult {
    return {
        summary: {
            totalFiles: 0,
            totalTests: 0,
            syncedTests: 0,
            unmappedTests: 0,
            outOfSyncTests: 0,
            validationErrors: 0,
        },
        metrics: {
            syncCoverage: 0,
            documentationCompliance: 0,
        },
        fileResults: [],
        scannedAt: new Date().toISOString(),
        duration: 0,
    };
}
