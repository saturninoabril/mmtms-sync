/**
 * Contract Test: Test Case Mapping Schema
 *
 * Validates that the mapping JSON schema matches the TestCaseMapping interface
 * and enforces test case ID format and sync status values.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createTestCaseMapping, SyncStatus } from '../../src/models/test-case-mapping';

describe('mapping-schema.json Contract Tests', () => {
    let ajv: Ajv;
    let schema: any;

    beforeAll(() => {
        // Load JSON schema
        const schemaPath = join(__dirname, '../../src/contracts/mapping-schema.json');
        schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

        // Initialize AJV with format validators
        ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
    });

    describe('Schema Structure', () => {
        it('should have valid JSON Schema format', () => {
            expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
            expect(schema.title).toBe('Test Case Mapping Schema');
            expect(schema.type).toBe('object');
        });

        it('should require essential fields', () => {
            expect(schema.required).toContain('id');
            expect(schema.required).toContain('testFilePath');
            expect(schema.required).toContain('testTitle');
            expect(schema.required).toContain('syncStatus');
            expect(schema.required).toContain('metadata');
        });
    });

    describe('Test Case ID Format Validation', () => {
        it('should validate correct test case ID format (PROJECT-T####)', () => {
            const validate = ajv.compile(schema);
            const validMapping = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                testFilePath: '/path/to/test.spec.ts',
                testTitle: 'Test title',
                testCaseId: 'MM-T12345',
                testCaseKey: 'key-123',
                syncStatus: 'synced',
                lastSyncedHash: 'a'.repeat(64),
                lastSyncedAt: '2025-11-02T12:00:00Z',
                tmsVersion: 1,
                tmsUpdatedAt: '2025-11-02T12:00:00Z',
                conflictDetails: null,
                metadata: {
                    createdAt: '2025-11-02T12:00:00Z',
                    updatedAt: '2025-11-02T12:00:00Z',
                    createdBy: 'tm-sync-cli',
                    syncCount: 0,
                    lastError: null,
                },
            };

            const valid = validate(validMapping);
            if (!valid) {
                console.error('Validation errors:', validate.errors);
            }
            expect(valid).toBe(true);
        });

        it('should reject invalid test case ID format', () => {
            const validate = ajv.compile(schema);
            const invalidMapping = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                testFilePath: '/path/to/test.spec.ts',
                testTitle: 'Test title',
                testCaseId: 'INVALID-ID', // Wrong format
                syncStatus: 'synced',
                metadata: {
                    createdAt: '2025-11-02T12:00:00Z',
                    updatedAt: '2025-11-02T12:00:00Z',
                    createdBy: 'tm-sync-cli',
                    syncCount: 0,
                },
            };

            const valid = validate(invalidMapping);
            expect(valid).toBe(false);
        });

        it('should accept null test case ID for unmapped tests', () => {
            const validate = ajv.compile(schema);
            const validMapping = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                testFilePath: '/path/to/test.spec.ts',
                testTitle: 'Test title',
                testCaseId: null,
                testCaseKey: null,
                syncStatus: 'unsynced',
                lastSyncedHash: null,
                lastSyncedAt: null,
                tmsVersion: null,
                tmsUpdatedAt: null,
                conflictDetails: null,
                metadata: {
                    createdAt: '2025-11-02T12:00:00Z',
                    updatedAt: '2025-11-02T12:00:00Z',
                    createdBy: 'tm-sync-cli',
                    syncCount: 0,
                    lastError: null,
                },
            };

            const valid = validate(validMapping);
            expect(valid).toBe(true);
        });

        it('should validate various project key patterns', () => {
            const validate = ajv.compile(schema);
            const testCaseIds = ['MM-T123', 'PROJECT-T99999', 'A-T1'];

            for (const testCaseId of testCaseIds) {
                const mapping = {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    testFilePath: '/path/to/test.spec.ts',
                    testTitle: 'Test title',
                    testCaseId,
                    syncStatus: 'synced',
                    metadata: {
                        createdAt: '2025-11-02T12:00:00Z',
                        updatedAt: '2025-11-02T12:00:00Z',
                        createdBy: 'tm-sync-cli',
                        syncCount: 0,
                    },
                };

                const valid = validate(mapping);
                expect(valid).toBe(true);
            }
        });
    });

    describe('Sync Status Validation', () => {
        it('should validate all sync status enum values', () => {
            const validate = ajv.compile(schema);
            const statuses: SyncStatus[] = [
                SyncStatus.Synced,
                SyncStatus.Unsynced,
                SyncStatus.NeedsUpdate,
                SyncStatus.Conflict,
                SyncStatus.Orphaned,
            ];

            for (const status of statuses) {
                const mapping = {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    testFilePath: '/path/to/test.spec.ts',
                    testTitle: 'Test title',
                    syncStatus: status,
                    metadata: {
                        createdAt: '2025-11-02T12:00:00Z',
                        updatedAt: '2025-11-02T12:00:00Z',
                        createdBy: 'tm-sync-cli',
                        syncCount: 0,
                    },
                };

                const valid = validate(mapping);
                expect(valid).toBe(true);
            }
        });

        it('should reject invalid sync status values', () => {
            const validate = ajv.compile(schema);
            const invalidMapping = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                testFilePath: '/path/to/test.spec.ts',
                testTitle: 'Test title',
                syncStatus: 'invalid-status',
                metadata: {
                    createdAt: '2025-11-02T12:00:00Z',
                    updatedAt: '2025-11-02T12:00:00Z',
                    createdBy: 'tm-sync-cli',
                    syncCount: 0,
                },
            };

            const valid = validate(invalidMapping);
            expect(valid).toBe(false);
        });
    });

    describe('Hash Validation', () => {
        it('should validate SHA-256 hash format (64 hex characters)', () => {
            const validate = ajv.compile(schema);
            const validHash = 'a'.repeat(64);
            const mapping = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                testFilePath: '/path/to/test.spec.ts',
                testTitle: 'Test title',
                syncStatus: 'synced',
                lastSyncedHash: validHash,
                metadata: {
                    createdAt: '2025-11-02T12:00:00Z',
                    updatedAt: '2025-11-02T12:00:00Z',
                    createdBy: 'tm-sync-cli',
                    syncCount: 0,
                },
            };

            const valid = validate(mapping);
            expect(valid).toBe(true);
        });

        it('should reject invalid hash lengths', () => {
            const validate = ajv.compile(schema);
            const invalidMapping = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                testFilePath: '/path/to/test.spec.ts',
                testTitle: 'Test title',
                syncStatus: 'synced',
                lastSyncedHash: 'abc123', // Too short
                metadata: {
                    createdAt: '2025-11-02T12:00:00Z',
                    updatedAt: '2025-11-02T12:00:00Z',
                    createdBy: 'tm-sync-cli',
                    syncCount: 0,
                },
            };

            const valid = validate(invalidMapping);
            expect(valid).toBe(false);
        });
    });

    describe('Conflict Details Validation', () => {
        it('should validate conflict details structure', () => {
            const validate = ajv.compile(schema);
            const mapping = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                testFilePath: '/path/to/test.spec.ts',
                testTitle: 'Test title',
                syncStatus: 'conflict',
                conflictDetails: {
                    localChanges: ['Changed objective'],
                    tmsChanges: ['Updated steps'],
                    detectedAt: '2025-11-02T12:00:00Z',
                    resolutionStrategy: 'prompt',
                },
                metadata: {
                    createdAt: '2025-11-02T12:00:00Z',
                    updatedAt: '2025-11-02T12:00:00Z',
                    createdBy: 'tm-sync-cli',
                    syncCount: 0,
                },
            };

            const valid = validate(mapping);
            expect(valid).toBe(true);
        });

        it('should require localChanges, tmsChanges, and detectedAt in conflict details', () => {
            const validate = ajv.compile(schema);
            const invalidMapping = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                testFilePath: '/path/to/test.spec.ts',
                testTitle: 'Test title',
                syncStatus: 'conflict',
                conflictDetails: {
                    resolutionStrategy: 'prompt',
                    // Missing required fields
                },
                metadata: {
                    createdAt: '2025-11-02T12:00:00Z',
                    updatedAt: '2025-11-02T12:00:00Z',
                    createdBy: 'tm-sync-cli',
                    syncCount: 0,
                },
            };

            const valid = validate(invalidMapping);
            expect(valid).toBe(false);
        });
    });

    describe('Model Integration', () => {
        it('should validate mapping created by createTestCaseMapping()', () => {
            const validate = ajv.compile(schema);
            const mapping = createTestCaseMapping('/path/to/test.spec.ts', 'Test title');

            const valid = validate(mapping);
            if (!valid) {
                console.error('Validation errors:', validate.errors);
            }
            expect(valid).toBe(true);
        });
    });

    describe('Metadata Validation', () => {
        it('should require metadata fields', () => {
            const validate = ajv.compile(schema);
            const invalidMapping = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                testFilePath: '/path/to/test.spec.ts',
                testTitle: 'Test title',
                syncStatus: 'synced',
                metadata: {
                    createdAt: '2025-11-02T12:00:00Z',
                    // Missing required fields
                },
            };

            const valid = validate(invalidMapping);
            expect(valid).toBe(false);
        });

        it('should validate syncCount is non-negative', () => {
            const validate = ajv.compile(schema);
            const invalidMapping = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                testFilePath: '/path/to/test.spec.ts',
                testTitle: 'Test title',
                syncStatus: 'synced',
                metadata: {
                    createdAt: '2025-11-02T12:00:00Z',
                    updatedAt: '2025-11-02T12:00:00Z',
                    createdBy: 'tm-sync-cli',
                    syncCount: -1, // Invalid
                    lastError: null,
                },
            };

            const valid = validate(invalidMapping);
            expect(valid).toBe(false);
        });
    });
});
