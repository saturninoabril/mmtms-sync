/**
 * Unit Tests: Test Case Mapping Models
 *
 * Tests test case mapping creation and update functions.
 */

import {
    SyncStatus,
    createTestCaseMapping,
    updateSyncStatus,
    needsSync,
    hasConflict,
} from '../../../src/models/test-case-mapping';

describe('Test Case Mapping Models', () => {
    describe('createTestCaseMapping', () => {
        it('should create default mapping', () => {
            const mapping = createTestCaseMapping('/path/to/file.spec.ts', 'MM-T12345: Test title');

            expect(mapping.id).toBeDefined();
            expect(mapping.testCaseId).toBeNull();
            expect(mapping.testFilePath).toBe('/path/to/file.spec.ts');
            expect(mapping.testTitle).toBe('MM-T12345: Test title');
            expect(mapping.syncStatus).toBe(SyncStatus.Unsynced);
            expect(mapping.lastSyncedHash).toBeNull();
            expect(mapping.lastSyncedAt).toBeNull();
            expect(mapping.metadata.createdBy).toBe('tm-sync-cli');
            expect(mapping.metadata.syncCount).toBe(0);
            expect(mapping.metadata.lastError).toBeNull();
        });

        it('should create mapping without test case ID initially', () => {
            const mapping = createTestCaseMapping('/path/to/file.spec.ts', 'Unmapped test');

            expect(mapping.testCaseId).toBeNull();
            expect(mapping.syncStatus).toBe(SyncStatus.Unsynced);
        });

        it('should set createdAt and updatedAt timestamps', () => {
            const before = new Date();
            const mapping = createTestCaseMapping('/path/to/file.spec.ts', 'Test title');
            const after = new Date();

            const createdAt = new Date(mapping.metadata.createdAt);
            const updatedAt = new Date(mapping.metadata.updatedAt);

            expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
            expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('should generate unique IDs for multiple mappings', () => {
            const mapping1 = createTestCaseMapping('/path1.spec.ts', 'Test 1');
            const mapping2 = createTestCaseMapping('/path2.spec.ts', 'Test 2');

            expect(mapping1.id).not.toBe(mapping2.id);
        });
    });

    describe('updateSyncStatus', () => {
        it('should update sync status to Synced', async () => {
            const original = createTestCaseMapping('/path/to/file.spec.ts', 'Test title');

            // Wait a tiny bit to ensure timestamp difference
            await new Promise((resolve) => setTimeout(resolve, 10));

            const updated = updateSyncStatus(original, SyncStatus.Synced, 'abc123def');

            expect(updated.syncStatus).toBe(SyncStatus.Synced);
            expect(updated.lastSyncedHash).toBe('abc123def');
            expect(updated.lastSyncedAt).not.toBeNull();
            expect(updated.metadata.syncCount).toBe(1);
            expect(new Date(updated.metadata.updatedAt).getTime()).toBeGreaterThanOrEqual(
                new Date(original.metadata.updatedAt).getTime()
            );
        });

        it('should update sync status to NeedsUpdate', () => {
            const original = createTestCaseMapping('/path/to/file.spec.ts', 'Test title');
            const updated = updateSyncStatus(original, SyncStatus.NeedsUpdate);

            expect(updated.syncStatus).toBe(SyncStatus.NeedsUpdate);
            expect(updated.lastSyncedAt).toBeNull();
            expect(updated.metadata.syncCount).toBe(0);
        });

        it('should update sync status to Conflict', () => {
            const original = createTestCaseMapping('/path/to/file.spec.ts', 'Test title');
            const updated = updateSyncStatus(original, SyncStatus.Conflict);

            expect(updated.syncStatus).toBe(SyncStatus.Conflict);
            expect(updated.metadata.syncCount).toBe(0);
        });

        it('should increment sync count on subsequent syncs', () => {
            const original = createTestCaseMapping('/path/to/file.spec.ts', 'Test title');

            const firstSync = updateSyncStatus(original, SyncStatus.Synced, 'hash1');
            expect(firstSync.metadata.syncCount).toBe(1);

            const secondSync = updateSyncStatus(firstSync, SyncStatus.Synced, 'hash2');
            expect(secondSync.metadata.syncCount).toBe(2);

            const thirdSync = updateSyncStatus(secondSync, SyncStatus.Synced, 'hash3');
            expect(thirdSync.metadata.syncCount).toBe(3);
        });

        it('should not increment sync count for non-Synced statuses', () => {
            const original = createTestCaseMapping('/path/to/file.spec.ts', 'Test title');
            const synced = updateSyncStatus(original, SyncStatus.Synced, 'hash1');

            const needsUpdate = updateSyncStatus(synced, SyncStatus.NeedsUpdate);
            expect(needsUpdate.metadata.syncCount).toBe(1);

            const conflict = updateSyncStatus(synced, SyncStatus.Conflict);
            expect(conflict.metadata.syncCount).toBe(1);
        });

        it('should preserve lastSyncedHash when not provided', () => {
            const original = createTestCaseMapping('/path/to/file.spec.ts', 'Test title');
            const synced = updateSyncStatus(original, SyncStatus.Synced, 'original-hash');

            const updated = updateSyncStatus(synced, SyncStatus.NeedsUpdate);
            expect(updated.lastSyncedHash).toBe('original-hash');
        });

        it('should update lastSyncedHash when provided', () => {
            const original = createTestCaseMapping('/path/to/file.spec.ts', 'Test title');
            const synced = updateSyncStatus(original, SyncStatus.Synced, 'original-hash');

            const updated = updateSyncStatus(synced, SyncStatus.Synced, 'new-hash');
            expect(updated.lastSyncedHash).toBe('new-hash');
        });

        it('should only update lastSyncedAt for Synced status', () => {
            const original = createTestCaseMapping('/path/to/file.spec.ts', 'Test title');

            const needsUpdate = updateSyncStatus(original, SyncStatus.NeedsUpdate);
            expect(needsUpdate.lastSyncedAt).toBeNull();

            const conflict = updateSyncStatus(original, SyncStatus.Conflict);
            expect(conflict.lastSyncedAt).toBeNull();

            const synced = updateSyncStatus(original, SyncStatus.Synced, 'hash');
            expect(synced.lastSyncedAt).not.toBeNull();
        });
    });

    describe('needsSync', () => {
        it('should return true for Unsynced status', () => {
            const mapping = createTestCaseMapping('/path/to/file.spec.ts', 'Test title');
            expect(needsSync(mapping)).toBe(true);
        });

        it('should return true for NeedsUpdate status', () => {
            const mapping = createTestCaseMapping('/path/to/file.spec.ts', 'Test title');
            const updated = updateSyncStatus(mapping, SyncStatus.NeedsUpdate);
            expect(needsSync(updated)).toBe(true);
        });

        it('should return true for Conflict status', () => {
            const mapping = createTestCaseMapping('/path/to/file.spec.ts', 'Test title');
            const conflicted = updateSyncStatus(mapping, SyncStatus.Conflict);
            expect(needsSync(conflicted)).toBe(true);
        });

        it('should return false for Synced status', () => {
            const mapping = createTestCaseMapping('/path/to/file.spec.ts', 'Test title');
            const synced = updateSyncStatus(mapping, SyncStatus.Synced, 'hash');
            expect(needsSync(synced)).toBe(false);
        });

        it('should return false for Error status', () => {
            const mapping = createTestCaseMapping('/path/to/file.spec.ts', 'Test title');
            const errored = updateSyncStatus(mapping, SyncStatus.Error);
            expect(needsSync(errored)).toBe(false);
        });
    });

    describe('hasConflict', () => {
        it('should return true for Conflict status with conflict details', () => {
            const mapping = createTestCaseMapping('/path/to/file.spec.ts', 'Test title');
            const conflicted = {
                ...mapping,
                syncStatus: SyncStatus.Conflict,
                conflictDetails: {
                    localChanges: ['Updated objective'],
                    tmsChanges: ['Updated description'],
                    detectedAt: new Date().toISOString(),
                },
            };
            expect(hasConflict(conflicted)).toBe(true);
        });

        it('should return false for Conflict status without conflict details', () => {
            const mapping = createTestCaseMapping('/path/to/file.spec.ts', 'Test title');
            const conflicted = updateSyncStatus(mapping, SyncStatus.Conflict);
            expect(hasConflict(conflicted)).toBe(false);
        });

        it('should return false for non-Conflict status', () => {
            const mapping = createTestCaseMapping('/path/to/file.spec.ts', 'Test title');
            expect(hasConflict(mapping)).toBe(false);

            const synced = updateSyncStatus(mapping, SyncStatus.Synced, 'hash');
            expect(hasConflict(synced)).toBe(false);
        });
    });
});
