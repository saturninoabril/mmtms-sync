/**
 * Change Detector
 *
 * Detects changes in test content using SHA-256 hash comparison.
 * Normalizes whitespace and step ordering to ignore insignificant changes.
 */

import { createHash } from 'crypto';
import type { ParsedTest, TestStep } from '../models/parsed-test.js';

/**
 * Detects changes in test content for sync status determination
 */
export class ChangeDetector {
    /**
     * Calculate SHA-256 hash of test content
     * Normalizes whitespace and sorts steps by line number
     *
     * @param test - Parsed test to hash
     * @returns 64-character hex string (SHA-256 hash)
     */
    calculateHash(test: ParsedTest): string {
        // Build normalized content string
        const parts: string[] = [];

        // Add objective (trimmed)
        if (test.jsdocTags.objective) {
            parts.push(`objective:${test.jsdocTags.objective.trim()}`);
        }

        // Add precondition (trimmed)
        if (test.jsdocTags.precondition) {
            const preconditions = Array.isArray(test.jsdocTags.precondition)
                ? test.jsdocTags.precondition
                : [test.jsdocTags.precondition];
            parts.push(`precondition:${preconditions.map((p) => p.trim()).join('|')}`);
        }

        // Add action steps (sorted by line number, trimmed)
        if (test.actionSteps.length > 0) {
            const sortedActions = this.sortSteps(test.actionSteps);
            parts.push(`actions:${sortedActions.map((s) => s.text.trim()).join('|')}`);
        }

        // Add verification steps (sorted by line number, trimmed)
        if (test.verificationSteps.length > 0) {
            const sortedVerifications = this.sortSteps(test.verificationSteps);
            parts.push(`verifications:${sortedVerifications.map((s) => s.text.trim()).join('|')}`);
        }

        // Add known issue (trimmed)
        if (test.jsdocTags.knownIssue) {
            parts.push(`knownIssue:${test.jsdocTags.knownIssue.trim()}`);
        }

        // Join all parts with newline
        const normalizedContent = parts.join('\n');

        // Calculate SHA-256 hash
        return createHash('sha256').update(normalizedContent, 'utf-8').digest('hex');
    }

    /**
     * Check if test content has changed compared to previous hash
     *
     * @param currentTest - Current parsed test
     * @param previousHash - SHA-256 hash from previous sync
     * @returns true if test content has changed
     */
    hasChanged(currentTest: ParsedTest, previousHash: string): boolean {
        const currentHash = this.calculateHash(currentTest);
        return currentHash !== previousHash;
    }

    /**
     * Detect detailed changes between current test and previous state
     *
     * @param currentTest - Current parsed test
     * @param previousHash - SHA-256 hash from previous sync
     * @returns Object describing what changed
     */
    detectChanges(
        currentTest: ParsedTest,
        previousHash: string
    ): {
        hasChanged: boolean;
        changedFields: string[];
    } {
        const hasChanged = this.hasChanged(currentTest, previousHash);

        if (!hasChanged) {
            return {
                hasChanged: false,
                changedFields: [],
            };
        }

        // To detect which fields changed, we'd need the previous test content,
        // not just the hash. For now, return generic change detection.
        // This can be enhanced later by storing more metadata in mapping files.
        return {
            hasChanged: true,
            changedFields: ['content'], // Generic indicator that content changed
        };
    }

    /**
     * Sort test steps by line number for consistent ordering
     *
     * @param steps - Array of test steps
     * @returns Sorted copy of steps
     */
    private sortSteps(steps: TestStep[]): TestStep[] {
        return [...steps].sort((a, b) => a.lineNumber - b.lineNumber);
    }
}
