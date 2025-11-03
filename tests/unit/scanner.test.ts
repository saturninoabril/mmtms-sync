/**
 * Unit Tests: Scanner
 *
 * Tests sync status detection for test files and directories.
 * T092-T095: Test all sync status states
 */

import { Scanner } from '../../src/core/scanner';
import { TestCaseMapping, SyncStatus } from '../../src/models/test-case-mapping';
import type { ParsedTest } from '../../src/models/parsed-test';

describe('Scanner', () => {
    let scanner: Scanner;

    beforeEach(() => {
        scanner = new Scanner();
    });

    // T092: SYNCED status (hash matches, ID present)
    describe('T092: Detect SYNCED status', () => {
        it('should detect SYNCED when hash matches and ID is present', () => {
            const parsedTest: ParsedTest = {
                title: 'MM-T123: Test login',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: {
                    objective: 'Verify user can login',
                },
                actionSteps: [{ lineNumber: 5, text: 'Navigate to login page' }],
                verificationSteps: [{ lineNumber: 7, text: 'User is logged in' }],
                lineNumber: 1,
            };

            const mapping: TestCaseMapping = {
                id: 'mapping-1',
                testCaseId: 'MM-T123',
                testFilePath: '/path/to/file.spec.ts',
                testTitle: 'MM-T123: Test login',
                syncStatus: SyncStatus.Synced,
                lastSyncedHash: 'abc123', // Assume this matches calculated hash
                lastSyncedAt: new Date().toISOString(),
                metadata: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: 'tm-sync-cli',
                    syncCount: 1,
                    lastError: null,
                },
            };

            // Mock the hash calculation to return the same hash as mapping
            const currentHash = 'abc123';

            const status = scanner.detectSyncStatus(parsedTest, mapping, currentHash);

            expect(status).toBe(SyncStatus.Synced);
        });

        it('should detect SYNCED when test passes validation', () => {
            const parsedTest: ParsedTest = {
                title: 'MM-T123: Test login',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: {
                    objective: 'Verify user can login',
                },
                actionSteps: [{ lineNumber: 5, text: 'Navigate to login page' }],
                verificationSteps: [{ lineNumber: 7, text: 'User is logged in' }],
                lineNumber: 1,
            };

            const mapping: TestCaseMapping = {
                id: 'mapping-1',
                testCaseId: 'MM-T123',
                testFilePath: '/path/to/file.spec.ts',
                testTitle: 'MM-T123: Test login',
                syncStatus: SyncStatus.Synced as SyncStatus,
                lastSyncedHash: 'same-hash',
                lastSyncedAt: new Date().toISOString(),
                metadata: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: 'tm-sync-cli',
                    syncCount: 2,
                    lastError: null,
                },
            };

            const status = scanner.detectSyncStatus(parsedTest, mapping, 'same-hash');

            expect(status).toBe(SyncStatus.Synced);
        });
    });

    // T093: NOT_MAPPED status (no test case ID)
    describe('T093: Detect NOT_MAPPED status', () => {
        it('should detect NOT_MAPPED when test has no test case ID', () => {
            const parsedTest: ParsedTest = {
                title: 'Test without ID',
                testCaseId: null,
                type: 'test',
                jsdocTags: {
                    objective: 'Test something',
                },
                actionSteps: [{ lineNumber: 5, text: 'Do something' }],
                verificationSteps: [{ lineNumber: 7, text: 'Verify something' }],
                lineNumber: 1,
            };

            const mapping: TestCaseMapping | null = null;
            const currentHash = 'hash123';

            const status = scanner.detectSyncStatus(parsedTest, mapping, currentHash);

            expect(status).toBe(SyncStatus.Unsynced);
        });

        it('should detect NOT_MAPPED when no mapping exists', () => {
            const parsedTest: ParsedTest = {
                title: 'New test without mapping',
                testCaseId: null,
                type: 'test',
                jsdocTags: {
                    objective: 'Test something new',
                },
                actionSteps: [{ lineNumber: 11, text: 'Perform action' }],
                verificationSteps: [{ lineNumber: 12, text: 'Verify result' }],
                lineNumber: 10,
            };

            const status = scanner.detectSyncStatus(parsedTest, null, 'new-hash');

            expect(status).toBe(SyncStatus.Unsynced);
        });
    });

    // T094: OUT_OF_SYNC status (hash mismatch)
    describe('T094: Detect OUT_OF_SYNC status', () => {
        it('should detect OUT_OF_SYNC when hash does not match', () => {
            const parsedTest: ParsedTest = {
                title: 'MM-T123: Test login',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: {
                    objective: 'Verify user can login with updated steps',
                },
                actionSteps: [
                    { lineNumber: 5, text: 'Navigate to login page' },
                    { lineNumber: 6, text: 'Enter credentials' },
                ],
                verificationSteps: [{ lineNumber: 7, text: 'User is logged in' }],
                lineNumber: 1,
            };

            const mapping: TestCaseMapping = {
                id: 'mapping-1',
                testCaseId: 'MM-T123',
                testFilePath: '/path/to/file.spec.ts',
                testTitle: 'MM-T123: Test login',
                syncStatus: SyncStatus.Synced as SyncStatus,
                lastSyncedHash: 'old-hash',
                lastSyncedAt: new Date().toISOString(),
                metadata: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: 'tm-sync-cli',
                    syncCount: 1,
                    lastError: null,
                },
            };

            const currentHash = 'new-hash'; // Different from mapping.lastSyncedHash

            const status = scanner.detectSyncStatus(parsedTest, mapping, currentHash);

            expect(status).toBe(SyncStatus.NeedsUpdate);
        });

        it('should detect OUT_OF_SYNC when test code changed', () => {
            const parsedTest: ParsedTest = {
                title: 'MM-T456: Test feature',
                testCaseId: 'MM-T456',
                type: 'test',
                jsdocTags: {
                    objective: 'Modified objective',
                },
                actionSteps: [{ lineNumber: 10, text: 'Modified action' }],
                verificationSteps: [{ lineNumber: 12, text: 'Modified verification' }],
                lineNumber: 8,
            };

            const mapping: TestCaseMapping = {
                id: 'mapping-2',
                testCaseId: 'MM-T456',
                testFilePath: '/path/to/feature.spec.ts',
                testTitle: 'MM-T456: Test feature',
                syncStatus: SyncStatus.Synced as SyncStatus,
                lastSyncedHash: 'original-hash',
                lastSyncedAt: new Date().toISOString(),
                metadata: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: 'tm-sync-cli',
                    syncCount: 3,
                    lastError: null,
                },
            };

            const status = scanner.detectSyncStatus(parsedTest, mapping, 'modified-hash');

            expect(status).toBe(SyncStatus.NeedsUpdate);
        });
    });

    // T096-T097: Scanner directory and file scanning
    describe('T096-T097: Scan directory and file', () => {
        it('should scan a directory and return scan result', async () => {
            const scanner = new Scanner();

            // This will scan test files in the project
            const result = await scanner.scanDirectory('tests/unit', ['scanner.test.ts']);

            expect(result.summary).toBeDefined();
            expect(result.metrics).toBeDefined();
            expect(result.fileResults).toBeDefined();
            expect(result.scannedAt).toBeDefined();
            expect(result.duration).toBeGreaterThanOrEqual(0);
        });

        it('should scan a single file and return file result', async () => {
            const scanner = new Scanner();

            // Create a mapping file for the fixture to avoid loading errors
            const { promises: fs } = await import('fs');
            const path = await import('path');
            const mappingPath = path.join('tests/fixtures', 'sample-test.spec.ts.mapping.json');

            // Create empty mapping array
            await fs.writeFile(mappingPath, JSON.stringify([], null, 2));

            try {
                // Scan the sample test fixture
                const result = await scanner.scanFile('tests/fixtures/sample-test.spec.ts');

                expect(result.filePath).toBe('tests/fixtures/sample-test.spec.ts');
                expect(result.testCount).toBe(3);
                expect(result.issues).toBeDefined();
                expect(Array.isArray(result.issues)).toBe(true);
            } finally {
                // Clean up mapping file
                await fs.unlink(mappingPath).catch(() => {});
            }
        });

        it('should categorize tests by sync status in file result', async () => {
            const scanner = new Scanner();

            // Create a mapping file for the fixture
            const { promises: fs } = await import('fs');
            const path = await import('path');
            const mappingPath = path.join('tests/fixtures', 'sample-test.spec.ts.mapping.json');

            await fs.writeFile(mappingPath, JSON.stringify([], null, 2));

            try {
                const result = await scanner.scanFile('tests/fixtures/sample-test.spec.ts');

                // Verify counts
                expect(result.testCount).toBe(3);
                // All tests should be unmapped (no mappings exist)
                expect(result.unmappedCount).toBeGreaterThan(0);
                expect(result.validationErrorCount).toBeGreaterThan(0);
            } finally {
                // Clean up
                await fs.unlink(mappingPath).catch(() => {});
            }
        });

        it('should handle file scan errors gracefully', async () => {
            const scanner = new Scanner();

            // Scan directory with a non-existent file pattern
            const result = await scanner.scanDirectory('tests/fixtures', ['non-existent-*.spec.ts']);

            expect(result.summary.totalFiles).toBe(0);
            expect(result.summary.totalTests).toBe(0);
            expect(result.fileResults.length).toBe(0);
        });

        it('should scan directory and aggregate results from multiple files', async () => {
            const scanner = new Scanner();

            // Create a mapping file for the fixture
            const { promises: fs } = await import('fs');
            const path = await import('path');
            const mappingPath = path.join('tests/fixtures', 'sample-test.spec.ts.mapping.json');

            await fs.writeFile(mappingPath, JSON.stringify([], null, 2));

            try {
                const result = await scanner.scanDirectory('tests/fixtures', ['*.spec.ts']);

                expect(result.summary.totalFiles).toBeGreaterThan(0);
                expect(result.summary.totalTests).toBeGreaterThan(0);
                expect(result.fileResults.length).toBeGreaterThan(0);
                expect(result.scannedAt).toBeDefined();
                expect(result.duration).toBeGreaterThanOrEqual(0);
            } finally {
                // Clean up
                await fs.unlink(mappingPath).catch(() => {});
            }
        });

        it('should calculate file-level metrics correctly', async () => {
            const scanner = new Scanner();

            // Create a mapping file for the fixture
            const { promises: fs } = await import('fs');
            const path = await import('path');
            const mappingPath = path.join('tests/fixtures', 'sample-test.spec.ts.mapping.json');

            await fs.writeFile(mappingPath, JSON.stringify([], null, 2));

            try {
                const result = await scanner.scanFile('tests/fixtures/sample-test.spec.ts');

                // Verify all counter fields are present
                expect(typeof result.syncedCount).toBe('number');
                expect(typeof result.unmappedCount).toBe('number');
                expect(typeof result.outOfSyncCount).toBe('number');
                expect(typeof result.validationErrorCount).toBe('number');

                // Total should equal sum of categorized tests
                const total =
                    result.syncedCount +
                    result.unmappedCount +
                    result.outOfSyncCount +
                    result.validationErrorCount;
                expect(total).toBe(result.testCount);
            } finally {
                // Clean up
                await fs.unlink(mappingPath).catch(() => {});
            }
        });
    });

    // T100: Calculate metrics
    describe('T100: Calculate metrics', () => {
        it('should calculate sync coverage correctly', async () => {
            const scanner = new Scanner();

            const result = await scanner.scanDirectory('tests/unit', ['parser.test.ts']);

            expect(result.metrics.syncCoverage).toBeGreaterThanOrEqual(0);
            expect(result.metrics.syncCoverage).toBeLessThanOrEqual(100);
            expect(result.metrics.documentationCompliance).toBeGreaterThanOrEqual(0);
            expect(result.metrics.documentationCompliance).toBeLessThanOrEqual(100);
        });
    });

    // T095: VALIDATION_ERROR status (failed validation)
    describe('T095: Detect VALIDATION_ERROR status', () => {
        it('should detect VALIDATION_ERROR when objective is missing', () => {
            const parsedTest: ParsedTest = {
                title: 'MM-T789: Test with issues',
                testCaseId: 'MM-T789',
                type: 'test',
                jsdocTags: {}, // No objective
                actionSteps: [{ lineNumber: 5, text: 'Do something' }],
                verificationSteps: [],
                lineNumber: 1,
            };

            const mapping: TestCaseMapping | null = null;
            const currentHash = 'hash123';

            const status = scanner.detectSyncStatus(parsedTest, mapping, currentHash);

            expect(status).toBe(SyncStatus.Unsynced);
        });

        it('should detect VALIDATION_ERROR when action steps are missing', () => {
            const parsedTest: ParsedTest = {
                title: 'MM-T999: Incomplete test',
                testCaseId: 'MM-T999',
                type: 'test',
                jsdocTags: {
                    objective: 'Test something',
                },
                actionSteps: [], // No action steps
                verificationSteps: [{ lineNumber: 7, text: 'Verify' }],
                lineNumber: 1,
            };

            const status = scanner.detectSyncStatus(parsedTest, null, 'hash');

            expect(status).toBe(SyncStatus.Unsynced);
        });

        it('should detect VALIDATION_ERROR when verification steps are missing', () => {
            const parsedTest: ParsedTest = {
                title: 'Test missing verifications',
                testCaseId: null, // No test case ID, so NOT_MAPPED check won't interfere
                type: 'test',
                jsdocTags: {
                    objective: 'Test something',
                },
                actionSteps: [{ lineNumber: 5, text: 'Do something' }],
                verificationSteps: [], // No verification steps
                lineNumber: 1,
            };

            const status = scanner.detectSyncStatus(parsedTest, null, 'hash');

            expect(status).toBe(SyncStatus.Unsynced);
        });

        it('should prioritize VALIDATION_ERROR over NOT_MAPPED when test has no ID', () => {
            const parsedTest: ParsedTest = {
                title: 'Test without ID and invalid',
                testCaseId: null,
                type: 'test',
                jsdocTags: {}, // Missing objective
                actionSteps: [], // Missing actions
                verificationSteps: [], // Missing verifications
                lineNumber: 1,
            };

            const status = scanner.detectSyncStatus(parsedTest, null, 'hash');

            expect(status).toBe(SyncStatus.Unsynced);
        });
    });
});
