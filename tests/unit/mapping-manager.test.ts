/**
 * Unit Tests: Mapping Manager
 *
 * Tests mapping file I/O operations for test case mappings.
 * Handles JSON persistence for sync state tracking.
 */

import { MappingManager } from '../../src/core/mapping-manager';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MappingManager', () => {
    let mappingManager: MappingManager;
    let testDir: string;

    beforeEach(() => {
        // Create temporary test directory
        testDir = join(tmpdir(), `tm-sync-test-${Date.now()}`);
        mkdirSync(testDir, { recursive: true });

        // Initialize MappingManager with test directory
        mappingManager = new MappingManager(testDir);
    });

    afterEach(() => {
        // Clean up test directory
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
    });

    // T083: Load mapping from JSON
    describe('T083: Load mapping from JSON', () => {
        it('should load mapping from valid JSON file', async () => {
            const mapping = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                testFilePath: '/path/to/test.spec.ts',
                testTitle: 'MM-T123: Test login',
                testCaseId: 'MM-T123',
                syncStatus: 'synced',
                lastSyncedHash: 'a'.repeat(64),
                lastSyncedAt: '2025-01-01T00:00:00.000Z',
                metadata: {
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                    createdBy: 'test',
                    syncCount: 1,
                },
            };

            // Write mapping file
            const mappingPath = join(testDir, 'test.json');
            writeFileSync(mappingPath, JSON.stringify([mapping], null, 2));

            const loaded = await mappingManager.loadMapping(mappingPath);

            expect(loaded).toHaveLength(1);
            expect(loaded[0].id).toBe(mapping.id);
            expect(loaded[0].testCaseId).toBe('MM-T123');
        });

        it('should return empty array for non-existent file', async () => {
            const nonExistentPath = join(testDir, 'nonexistent.json');
            const loaded = await mappingManager.loadMapping(nonExistentPath);

            expect(loaded).toEqual([]);
        });

        it('should load mapping with null testCaseId (unmapped test)', async () => {
            const mapping = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                testFilePath: '/path/to/test.spec.ts',
                testTitle: 'Test without ID',
                testCaseId: null,
                syncStatus: 'unsynced',
                lastSyncedHash: null,
                lastSyncedAt: null,
                metadata: {
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                    createdBy: 'test',
                    syncCount: 0,
                },
            };

            const mappingPath = join(testDir, 'unmapped.json');
            writeFileSync(mappingPath, JSON.stringify([mapping], null, 2));

            const loaded = await mappingManager.loadMapping(mappingPath);

            expect(loaded).toHaveLength(1);
            expect(loaded[0].testCaseId).toBeNull();
            expect(loaded[0].syncStatus).toBe('unsynced');
        });
    });

    // T084: Save mapping to JSON
    describe('T084: Save mapping to JSON', () => {
        it('should save mapping to JSON file with proper formatting', async () => {
            const mapping = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                testFilePath: '/path/to/test.spec.ts',
                testTitle: 'MM-T123: Test login',
                testCaseId: 'MM-T123',
                syncStatus: 'synced' as const,
                lastSyncedHash: 'a'.repeat(64),
                lastSyncedAt: '2025-01-01T00:00:00.000Z',
                metadata: {
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                    createdBy: 'test',
                    syncCount: 1,
                },
            };

            const mappingPath = join(testDir, 'output.json');
            await mappingManager.saveMapping(mappingPath, [mapping]);

            // Verify file exists
            expect(existsSync(mappingPath)).toBe(true);

            // Verify file content can be parsed
            const loaded = await mappingManager.loadMapping(mappingPath);
            expect(loaded).toHaveLength(1);
            expect(loaded[0].testCaseId).toBe('MM-T123');
        });

        it('should create parent directories if they do not exist', async () => {
            const nestedPath = join(testDir, 'nested', 'dir', 'mapping.json');
            const mapping = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                testFilePath: '/path/to/test.spec.ts',
                testTitle: 'MM-T123: Test',
                testCaseId: 'MM-T123',
                syncStatus: 'synced' as const,
                lastSyncedHash: 'a'.repeat(64),
                lastSyncedAt: '2025-01-01T00:00:00.000Z',
                metadata: {
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                    createdBy: 'test',
                    syncCount: 1,
                },
            };

            await mappingManager.saveMapping(nestedPath, [mapping]);

            expect(existsSync(nestedPath)).toBe(true);
        });

        it('should save multiple mappings in single file', async () => {
            const mappings = [
                {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    testFilePath: '/path/to/test1.spec.ts',
                    testTitle: 'MM-T123: Test 1',
                    testCaseId: 'MM-T123',
                    syncStatus: 'synced' as const,
                    lastSyncedHash: 'a'.repeat(64),
                    lastSyncedAt: '2025-01-01T00:00:00.000Z',
                    metadata: {
                        createdAt: '2025-01-01T00:00:00.000Z',
                        updatedAt: '2025-01-01T00:00:00.000Z',
                        createdBy: 'test',
                        syncCount: 1,
                    },
                },
                {
                    id: '223e4567-e89b-12d3-a456-426614174001',
                    testFilePath: '/path/to/test2.spec.ts',
                    testTitle: 'MM-T124: Test 2',
                    testCaseId: 'MM-T124',
                    syncStatus: 'synced' as const,
                    lastSyncedHash: 'b'.repeat(64),
                    lastSyncedAt: '2025-01-01T00:00:00.000Z',
                    metadata: {
                        createdAt: '2025-01-01T00:00:00.000Z',
                        updatedAt: '2025-01-01T00:00:00.000Z',
                        createdBy: 'test',
                        syncCount: 1,
                    },
                },
            ];

            const mappingPath = join(testDir, 'multiple.json');
            await mappingManager.saveMapping(mappingPath, mappings);

            const loaded = await mappingManager.loadMapping(mappingPath);
            expect(loaded).toHaveLength(2);
            expect(loaded[0].testCaseId).toBe('MM-T123');
            expect(loaded[1].testCaseId).toBe('MM-T124');
        });
    });

    // T085: Handle missing file gracefully
    describe('T085: Handle missing file gracefully', () => {
        it('should not throw error when loading non-existent file', async () => {
            const nonExistentPath = join(testDir, 'does-not-exist.json');

            await expect(mappingManager.loadMapping(nonExistentPath)).resolves.not.toThrow();
        });

        it('should return empty array for missing file', async () => {
            const nonExistentPath = join(testDir, 'missing.json');
            const result = await mappingManager.loadMapping(nonExistentPath);

            expect(result).toEqual([]);
        });

        it('should handle empty directory gracefully', async () => {
            const emptyDir = join(testDir, 'empty');
            mkdirSync(emptyDir);

            const mappings = await mappingManager.getAllMappings(emptyDir);

            expect(mappings).toEqual([]);
        });
    });

    // T086: Detect JSON corruption
    describe('T086: Detect JSON corruption', () => {
        it('should throw error for invalid JSON', async () => {
            const corruptedPath = join(testDir, 'corrupted.json');
            writeFileSync(corruptedPath, '{ invalid json }');

            await expect(mappingManager.loadMapping(corruptedPath)).rejects.toThrow();
        });

        it('should throw error for non-array JSON', async () => {
            const invalidPath = join(testDir, 'invalid-structure.json');
            writeFileSync(invalidPath, JSON.stringify({ not: 'an array' }));

            await expect(mappingManager.loadMapping(invalidPath)).rejects.toThrow('must contain an array');
        });

        it('should validate required fields in mapping objects', async () => {
            const incompletePath = join(testDir, 'incomplete.json');
            const incompleteMapping = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                // Missing required fields
            };
            writeFileSync(incompletePath, JSON.stringify([incompleteMapping]));

            await expect(mappingManager.loadMapping(incompletePath)).rejects.toThrow();
        });
    });
});
