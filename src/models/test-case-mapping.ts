/**
 * Test Case Mapping Model
 *
 * Represents the bidirectional mapping between a test file and its TMS test case.
 * Stored as JSON in .tm-sync/mappings/ directory for persistence.
 */

import { randomUUID } from 'crypto';

/**
 * Sync status between code and TMS
 */
export enum SyncStatus {
    /** Test file has TMS ID and content matches last sync */
    Synced = 'synced',

    /** Test file has no TMS ID */
    Unsynced = 'unsynced',

    /** Test file content changed since last sync */
    NeedsUpdate = 'needs-update',

    /** TMS test case modified externally, conflicts with local changes */
    Conflict = 'conflict',

    /** TMS test case exists but local file deleted */
    Orphaned = 'orphaned',
}

/**
 * Mapping between test file and TMS test case
 */
export interface TestCaseMapping {
    /** Unique mapping ID (UUID) */
    id: string;

    /** Absolute path to test file */
    testFilePath: string;

    /** Test title from code */
    testTitle: string;

    /** TMS test case ID (e.g., MM-T12345) */
    testCaseId: string | null;

    /** TMS test case key (internal TMS identifier) */
    testCaseKey: string | null;

    /** Current sync status */
    syncStatus: SyncStatus;

    /** SHA-256 hash of test content at last sync */
    lastSyncedHash: string | null;

    /** Timestamp of last successful sync */
    lastSyncedAt: string | null;

    /** TMS test case version number */
    tmsVersion: number | null;

    /** Last known TMS update timestamp */
    tmsUpdatedAt: string | null;

    /** Conflict details if syncStatus is 'conflict' */
    conflictDetails: ConflictDetails | null;

    /** Metadata for tracking */
    metadata: MappingMetadata;
}

/**
 * Conflict details when TMS and local changes differ
 */
export interface ConflictDetails {
    /** What changed in local test file */
    localChanges: string[];

    /** What changed in TMS test case */
    tmsChanges: string[];

    /** Timestamp when conflict was detected */
    detectedAt: string;

    /** Resolution strategy: 'prompt', 'keep-local', 'keep-tms', 'merge' */
    resolutionStrategy: ConflictResolution | null;
}

/**
 * Conflict resolution strategies
 */
export enum ConflictResolution {
    /** Ask user interactively */
    Prompt = 'prompt',

    /** Keep local changes, overwrite TMS */
    KeepLocal = 'keep-local',

    /** Keep TMS changes, discard local */
    KeepTMS = 'keep-tms',

    /** Attempt automatic merge */
    Merge = 'merge',

    /** Skip this test case */
    Skip = 'skip',
}

/**
 * Metadata for mapping file
 */
export interface MappingMetadata {
    /** When mapping was created */
    createdAt: string;

    /** When mapping was last updated */
    updatedAt: string;

    /** Who/what created the mapping */
    createdBy: string;

    /** Number of sync operations */
    syncCount: number;

    /** Last error message if sync failed */
    lastError: string | null;
}

/**
 * Create a default test case mapping
 */
export function createTestCaseMapping(testFilePath: string, testTitle: string): TestCaseMapping {
    const now = new Date().toISOString();

    return {
        id: randomUUID(),
        testFilePath,
        testTitle,
        testCaseId: null,
        testCaseKey: null,
        syncStatus: SyncStatus.Unsynced,
        lastSyncedHash: null,
        lastSyncedAt: null,
        tmsVersion: null,
        tmsUpdatedAt: null,
        conflictDetails: null,
        metadata: {
            createdAt: now,
            updatedAt: now,
            createdBy: 'tm-sync-cli',
            syncCount: 0,
            lastError: null,
        },
    };
}

/**
 * Update mapping sync status
 */
export function updateSyncStatus(mapping: TestCaseMapping, status: SyncStatus, hash?: string): TestCaseMapping {
    const now = new Date().toISOString();

    return {
        ...mapping,
        syncStatus: status,
        lastSyncedHash: hash ?? mapping.lastSyncedHash,
        lastSyncedAt: status === SyncStatus.Synced ? now : mapping.lastSyncedAt,
        metadata: {
            ...mapping.metadata,
            updatedAt: now,
            syncCount: status === SyncStatus.Synced ? mapping.metadata.syncCount + 1 : mapping.metadata.syncCount,
        },
    };
}

/**
 * Check if mapping needs sync
 */
export function needsSync(mapping: TestCaseMapping): boolean {
    return (
        mapping.syncStatus === SyncStatus.Unsynced ||
        mapping.syncStatus === SyncStatus.NeedsUpdate ||
        mapping.syncStatus === SyncStatus.Conflict
    );
}

/**
 * Check if mapping has conflicts
 */
export function hasConflict(mapping: TestCaseMapping): boolean {
    return mapping.syncStatus === SyncStatus.Conflict && mapping.conflictDetails !== null;
}
