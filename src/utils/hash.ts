/**
 * Hash Utilities
 *
 * Provides utilities for generating content hashes used to detect changes in test files.
 * Uses SHA-256 for cryptographic hashing.
 */

import { createHash } from 'crypto';

/**
 * Generate SHA-256 hash of string content
 */
export function hashString(content: string): string {
    return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Generate hash of test content for change detection
 *
 * This normalizes the test content before hashing to avoid false positives
 * from whitespace changes, comment changes, etc.
 */
export function hashTestContent(content: string): string {
    // Normalize content to avoid false positives:
    // 1. Remove leading/trailing whitespace from each line
    // 2. Remove empty lines
    // 3. Normalize multiple spaces to single space
    const normalized = content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => line.replace(/\s+/g, ' '))
        .join('\n');

    return hashString(normalized);
}

/**
 * Generate hash of parsed test for change detection
 *
 * Creates a hash based on the semantic content of the test,
 * ignoring changes that don't affect the test's meaning.
 */
export function hashParsedTest(test: {
    testTitle: string;
    objective: string;
    preconditions: string[];
    tags: string[];
    actionSteps: Array<{ description: string }>;
    verificationSteps: Array<{ description: string }>;
}): string {
    // Create a canonical representation of the test
    const canonical = {
        testTitle: normalizeText(test.testTitle),
        objective: normalizeText(test.objective),
        preconditions: test.preconditions.map((p) => normalizeText(p)).sort(),
        tags: test.tags.slice().sort(), // Sort tags for consistent ordering
        actionSteps: test.actionSteps.map((step) => normalizeText(step.description)),
        verificationSteps: test.verificationSteps.map((step) => normalizeText(step.description)),
    };

    // Convert to stable JSON string and hash
    const jsonString = JSON.stringify(canonical);
    return hashString(jsonString);
}

/**
 * Normalize text for consistent hashing
 */
function normalizeText(text: string): string {
    return text
        .trim()
        .replace(/\s+/g, ' ') // Normalize whitespace
        .toLowerCase(); // Case-insensitive comparison
}

/**
 * Generate short hash (first 8 characters)
 */
export function shortHash(content: string): string {
    return hashString(content).substring(0, 8);
}

/**
 * Generate hash of object (for generic use)
 */
export function hashObject(obj: unknown): string {
    const jsonString = JSON.stringify(obj, Object.keys(obj as object).sort());
    return hashString(jsonString);
}

/**
 * Compare two hashes for equality
 */
export function compareHashes(hash1: string | null, hash2: string | null): boolean {
    if (hash1 === null || hash2 === null) {
        return false;
    }
    return hash1 === hash2;
}

/**
 * Check if content has changed based on hash comparison
 */
export function hasContentChanged(currentContent: string, previousHash: string | null): boolean {
    if (previousHash === null) {
        return true; // No previous hash means this is new content
    }

    const currentHash = hashTestContent(currentContent);
    return !compareHashes(currentHash, previousHash);
}

/**
 * Generate deterministic hash for test case ID
 *
 * Used to generate a unique identifier based on file path and test title
 * when test case ID is not yet assigned.
 */
export function generateTestId(filePath: string, testTitle: string): string {
    const combined = `${filePath}:${testTitle}`;
    return shortHash(combined);
}
