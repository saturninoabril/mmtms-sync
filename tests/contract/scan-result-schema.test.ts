/**
 * Contract Test: Scan Result Schema
 *
 * Validates that the scan result JSON schema matches the ScanResult interface
 * and enforces metric ranges (0-100 for percentages).
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('scan-result-schema.json Contract Tests', () => {
    let ajv: Ajv;
    let schema: any;

    beforeAll(() => {
        // Load JSON schema
        const schemaPath = join(__dirname, '../../src/contracts/scan-result-schema.json');
        schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

        // Initialize AJV with format validators
        ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
    });

    describe('Schema Structure', () => {
        it('should have valid JSON Schema format', () => {
            expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
            expect(schema.title).toBe('Scan Result Schema');
            expect(schema.type).toBe('object');
        });

        it('should require essential fields', () => {
            expect(schema.required).toContain('summary');
            expect(schema.required).toContain('metrics');
            expect(schema.required).toContain('fileResults');
            expect(schema.required).toContain('scannedAt');
            expect(schema.required).toContain('duration');
        });
    });

    describe('Summary Validation', () => {
        it('should validate complete summary structure', () => {
            const validate = ajv.compile(schema);
            const validResult = {
                summary: {
                    totalTests: 100,
                    synced: 80,
                    unsynced: 10,
                    needsUpdate: 5,
                    conflict: 2,
                    orphaned: 1,
                    validationError: 2,
                },
                metrics: {
                    syncCoverage: 80,
                    documentationCompliance: 95,
                },
                fileResults: [],
                scannedAt: '2025-11-02T12:00:00Z',
                duration: 1500,
            };

            const valid = validate(validResult);
            if (!valid) {
                console.error('Validation errors:', validate.errors);
            }
            expect(valid).toBe(true);
        });

        it('should require all summary count fields', () => {
            const validate = ajv.compile(schema);
            const invalidResult = {
                summary: {
                    totalTests: 100,
                    // Missing other required fields
                },
                metrics: {
                    syncCoverage: 80,
                    documentationCompliance: 95,
                },
                fileResults: [],
                scannedAt: '2025-11-02T12:00:00Z',
                duration: 1500,
            };

            const valid = validate(invalidResult);
            expect(valid).toBe(false);
        });

        it('should enforce non-negative counts', () => {
            const validate = ajv.compile(schema);
            const invalidResult = {
                summary: {
                    totalTests: -1, // Invalid
                    synced: 0,
                    unsynced: 0,
                    needsUpdate: 0,
                    conflict: 0,
                    orphaned: 0,
                    validationError: 0,
                },
                metrics: {
                    syncCoverage: 0,
                    documentationCompliance: 0,
                },
                fileResults: [],
                scannedAt: '2025-11-02T12:00:00Z',
                duration: 0,
            };

            const valid = validate(invalidResult);
            expect(valid).toBe(false);
        });
    });

    describe('Metrics Range Validation', () => {
        it('should validate syncCoverage range (0-100)', () => {
            const validate = ajv.compile(schema);
            const validPercentages = [0, 25, 50, 75, 100];

            for (const coverage of validPercentages) {
                const result = {
                    summary: {
                        totalTests: 100,
                        synced: coverage,
                        unsynced: 0,
                        needsUpdate: 0,
                        conflict: 0,
                        orphaned: 0,
                        validationError: 0,
                    },
                    metrics: {
                        syncCoverage: coverage,
                        documentationCompliance: 90,
                    },
                    fileResults: [],
                    scannedAt: '2025-11-02T12:00:00Z',
                    duration: 1000,
                };

                const valid = validate(result);
                expect(valid).toBe(true);
            }
        });

        it('should reject syncCoverage below 0', () => {
            const validate = ajv.compile(schema);
            const invalidResult = {
                summary: {
                    totalTests: 100,
                    synced: 0,
                    unsynced: 0,
                    needsUpdate: 0,
                    conflict: 0,
                    orphaned: 0,
                    validationError: 0,
                },
                metrics: {
                    syncCoverage: -10, // Invalid
                    documentationCompliance: 90,
                },
                fileResults: [],
                scannedAt: '2025-11-02T12:00:00Z',
                duration: 1000,
            };

            const valid = validate(invalidResult);
            expect(valid).toBe(false);
        });

        it('should reject syncCoverage above 100', () => {
            const validate = ajv.compile(schema);
            const invalidResult = {
                summary: {
                    totalTests: 100,
                    synced: 0,
                    unsynced: 0,
                    needsUpdate: 0,
                    conflict: 0,
                    orphaned: 0,
                    validationError: 0,
                },
                metrics: {
                    syncCoverage: 150, // Invalid
                    documentationCompliance: 90,
                },
                fileResults: [],
                scannedAt: '2025-11-02T12:00:00Z',
                duration: 1000,
            };

            const valid = validate(invalidResult);
            expect(valid).toBe(false);
        });

        it('should validate documentationCompliance range (0-100)', () => {
            const validate = ajv.compile(schema);
            const validResult = {
                summary: {
                    totalTests: 100,
                    synced: 80,
                    unsynced: 0,
                    needsUpdate: 0,
                    conflict: 0,
                    orphaned: 0,
                    validationError: 0,
                },
                metrics: {
                    syncCoverage: 80,
                    documentationCompliance: 100,
                },
                fileResults: [],
                scannedAt: '2025-11-02T12:00:00Z',
                duration: 1000,
            };

            const valid = validate(validResult);
            expect(valid).toBe(true);
        });

        it('should validate optional averageDocumentationScore range', () => {
            const validate = ajv.compile(schema);
            const validResult = {
                summary: {
                    totalTests: 100,
                    synced: 80,
                    unsynced: 0,
                    needsUpdate: 0,
                    conflict: 0,
                    orphaned: 0,
                    validationError: 0,
                },
                metrics: {
                    syncCoverage: 80,
                    documentationCompliance: 95,
                    averageDocumentationScore: 87.5,
                },
                fileResults: [],
                scannedAt: '2025-11-02T12:00:00Z',
                duration: 1000,
            };

            const valid = validate(validResult);
            expect(valid).toBe(true);
        });
    });

    describe('File Results Validation', () => {
        it('should validate file results structure', () => {
            const validate = ajv.compile(schema);
            const validResult = {
                summary: {
                    totalTests: 10,
                    synced: 8,
                    unsynced: 2,
                    needsUpdate: 0,
                    conflict: 0,
                    orphaned: 0,
                    validationError: 0,
                },
                metrics: {
                    syncCoverage: 80,
                    documentationCompliance: 90,
                },
                fileResults: [
                    {
                        filePath: '/path/to/test.spec.ts',
                        testCount: 5,
                        syncedCount: 4,
                        issues: [
                            {
                                testTitle: 'Test 1',
                                syncStatus: 'unsynced',
                                message: 'Test case ID not assigned',
                            },
                        ],
                    },
                ],
                scannedAt: '2025-11-02T12:00:00Z',
                duration: 1500,
            };

            const valid = validate(validResult);
            if (!valid) {
                console.error('Validation errors:', validate.errors);
            }
            expect(valid).toBe(true);
        });

        it('should require filePath, testCount, syncedCount, and issues', () => {
            const validate = ajv.compile(schema);
            const invalidResult = {
                summary: {
                    totalTests: 10,
                    synced: 8,
                    unsynced: 2,
                    needsUpdate: 0,
                    conflict: 0,
                    orphaned: 0,
                    validationError: 0,
                },
                metrics: {
                    syncCoverage: 80,
                    documentationCompliance: 90,
                },
                fileResults: [
                    {
                        filePath: '/path/to/test.spec.ts',
                        // Missing required fields
                    },
                ],
                scannedAt: '2025-11-02T12:00:00Z',
                duration: 1500,
            };

            const valid = validate(invalidResult);
            expect(valid).toBe(false);
        });

        it('should validate issue syncStatus enum', () => {
            const validate = ajv.compile(schema);
            const validStatuses = ['synced', 'unsynced', 'needs-update', 'conflict', 'orphaned', 'validation-error'];

            for (const status of validStatuses) {
                const result = {
                    summary: {
                        totalTests: 1,
                        synced: 0,
                        unsynced: 1,
                        needsUpdate: 0,
                        conflict: 0,
                        orphaned: 0,
                        validationError: 0,
                    },
                    metrics: {
                        syncCoverage: 0,
                        documentationCompliance: 100,
                    },
                    fileResults: [
                        {
                            filePath: '/path/to/test.spec.ts',
                            testCount: 1,
                            syncedCount: 0,
                            issues: [
                                {
                                    testTitle: 'Test 1',
                                    syncStatus: status,
                                },
                            ],
                        },
                    ],
                    scannedAt: '2025-11-02T12:00:00Z',
                    duration: 1000,
                };

                const valid = validate(result);
                expect(valid).toBe(true);
            }
        });
    });

    describe('Timestamp and Duration Validation', () => {
        it('should validate scannedAt as ISO 8601 date-time', () => {
            const validate = ajv.compile(schema);
            const validResult = {
                summary: {
                    totalTests: 0,
                    synced: 0,
                    unsynced: 0,
                    needsUpdate: 0,
                    conflict: 0,
                    orphaned: 0,
                    validationError: 0,
                },
                metrics: {
                    syncCoverage: 0,
                    documentationCompliance: 0,
                },
                fileResults: [],
                scannedAt: '2025-11-02T14:30:45.123Z',
                duration: 500,
            };

            const valid = validate(validResult);
            expect(valid).toBe(true);
        });

        it('should enforce non-negative duration', () => {
            const validate = ajv.compile(schema);
            const invalidResult = {
                summary: {
                    totalTests: 0,
                    synced: 0,
                    unsynced: 0,
                    needsUpdate: 0,
                    conflict: 0,
                    orphaned: 0,
                    validationError: 0,
                },
                metrics: {
                    syncCoverage: 0,
                    documentationCompliance: 0,
                },
                fileResults: [],
                scannedAt: '2025-11-02T12:00:00Z',
                duration: -100, // Invalid
            };

            const valid = validate(invalidResult);
            expect(valid).toBe(false);
        });
    });
});
