/**
 * Unit Tests: Change Detector
 *
 * Tests change detection logic for test content comparison.
 * Uses SHA-256 hashing to detect significant changes while ignoring whitespace.
 */

import { ChangeDetector } from '../../src/core/change-detector';
import type { ParsedTest } from '../../src/models/parsed-test';

describe('ChangeDetector', () => {
    let changeDetector: ChangeDetector;

    beforeEach(() => {
        changeDetector = new ChangeDetector();
    });

    // T075: Hash calculation
    describe('T075: Hash calculation', () => {
        it('should calculate SHA-256 hash of test code', () => {
            const test: ParsedTest = {
                title: 'MM-T123: Test login',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: {
                    objective: 'Verify user can login',
                },
                actionSteps: [
                    { lineNumber: 5, text: 'Navigate to login page' },
                    { lineNumber: 6, text: 'Enter credentials' },
                ],
                verificationSteps: [{ lineNumber: 7, text: 'User is logged in' }],
                lineNumber: 1,
            };

            const hash = changeDetector.calculateHash(test);

            // SHA-256 produces 64-character hex string
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
            expect(hash.length).toBe(64);
        });

        it('should produce consistent hash for same test content', () => {
            const test: ParsedTest = {
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

            const hash1 = changeDetector.calculateHash(test);
            const hash2 = changeDetector.calculateHash(test);

            expect(hash1).toBe(hash2);
        });

        it('should produce different hash for different test content', () => {
            const test1: ParsedTest = {
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

            const test2: ParsedTest = {
                ...test1,
                jsdocTags: {
                    objective: 'Verify user can logout',
                },
            };

            const hash1 = changeDetector.calculateHash(test1);
            const hash2 = changeDetector.calculateHash(test2);

            expect(hash1).not.toBe(hash2);
        });
    });

    // T076: Detect objective change
    describe('T076: Detect objective change', () => {
        it('should detect when objective changes', () => {
            const currentTest: ParsedTest = {
                title: 'MM-T123: Test login',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: {
                    objective: 'Verify user can login successfully',
                },
                actionSteps: [{ lineNumber: 5, text: 'Navigate to login page' }],
                verificationSteps: [{ lineNumber: 7, text: 'User is logged in' }],
                lineNumber: 1,
            };

            const previousHash = changeDetector.calculateHash({
                ...currentTest,
                jsdocTags: {
                    objective: 'Verify user login',
                },
            });

            const hasChanged = changeDetector.hasChanged(currentTest, previousHash);

            expect(hasChanged).toBe(true);
        });

        it('should not detect change when objective is identical', () => {
            const test: ParsedTest = {
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

            const previousHash = changeDetector.calculateHash(test);
            const hasChanged = changeDetector.hasChanged(test, previousHash);

            expect(hasChanged).toBe(false);
        });
    });

    // T077: Detect action steps change
    describe('T077: Detect action steps change', () => {
        it('should detect when action steps are added', () => {
            const baseTest: ParsedTest = {
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

            const previousHash = changeDetector.calculateHash(baseTest);

            const modifiedTest: ParsedTest = {
                ...baseTest,
                actionSteps: [
                    { lineNumber: 5, text: 'Navigate to login page' },
                    { lineNumber: 6, text: 'Enter username and password' },
                ],
            };

            const hasChanged = changeDetector.hasChanged(modifiedTest, previousHash);

            expect(hasChanged).toBe(true);
        });

        it('should detect when action steps are modified', () => {
            const baseTest: ParsedTest = {
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

            const previousHash = changeDetector.calculateHash(baseTest);

            const modifiedTest: ParsedTest = {
                ...baseTest,
                actionSteps: [{ lineNumber: 5, text: 'Go to the login page' }],
            };

            const hasChanged = changeDetector.hasChanged(modifiedTest, previousHash);

            expect(hasChanged).toBe(true);
        });

        it('should detect when action steps are removed', () => {
            const baseTest: ParsedTest = {
                title: 'MM-T123: Test login',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: {
                    objective: 'Verify user can login',
                },
                actionSteps: [
                    { lineNumber: 5, text: 'Navigate to login page' },
                    { lineNumber: 6, text: 'Enter credentials' },
                ],
                verificationSteps: [{ lineNumber: 7, text: 'User is logged in' }],
                lineNumber: 1,
            };

            const previousHash = changeDetector.calculateHash(baseTest);

            const modifiedTest: ParsedTest = {
                ...baseTest,
                actionSteps: [{ lineNumber: 5, text: 'Navigate to login page' }],
            };

            const hasChanged = changeDetector.hasChanged(modifiedTest, previousHash);

            expect(hasChanged).toBe(true);
        });
    });

    // T078: Ignore whitespace changes
    describe('T078: Ignore whitespace changes', () => {
        it('should ignore leading/trailing whitespace in objective', () => {
            const test1: ParsedTest = {
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

            const test2: ParsedTest = {
                ...test1,
                jsdocTags: {
                    objective: '  Verify user can login  ',
                },
            };

            const hash1 = changeDetector.calculateHash(test1);
            const hash2 = changeDetector.calculateHash(test2);

            expect(hash1).toBe(hash2);
        });

        it('should ignore whitespace differences in action steps', () => {
            const test1: ParsedTest = {
                title: 'MM-T123: Test login',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: {
                    objective: 'Verify user can login',
                },
                actionSteps: [
                    { lineNumber: 5, text: 'Navigate to login page' },
                    { lineNumber: 6, text: 'Enter credentials' },
                ],
                verificationSteps: [{ lineNumber: 7, text: 'User is logged in' }],
                lineNumber: 1,
            };

            const test2: ParsedTest = {
                ...test1,
                actionSteps: [
                    { lineNumber: 5, text: '  Navigate to login page  ' },
                    { lineNumber: 6, text: '  Enter credentials  ' },
                ],
            };

            const hash1 = changeDetector.calculateHash(test1);
            const hash2 = changeDetector.calculateHash(test2);

            expect(hash1).toBe(hash2);
        });

        it('should ignore empty lines and extra spaces within steps', () => {
            const test1: ParsedTest = {
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

            const test2: ParsedTest = {
                ...test1,
                actionSteps: [{ lineNumber: 5, text: 'Navigate  to  login  page' }],
            };

            // Multiple spaces within content should NOT be normalized (semantic difference)
            const hash1 = changeDetector.calculateHash(test1);
            const hash2 = changeDetector.calculateHash(test2);

            // This should detect a change because internal whitespace is meaningful
            expect(hash1).not.toBe(hash2);
        });

        it('should normalize step order by line number before hashing', () => {
            const test1: ParsedTest = {
                title: 'MM-T123: Test login',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: {
                    objective: 'Verify user can login',
                },
                actionSteps: [
                    { lineNumber: 5, text: 'Navigate to login page' },
                    { lineNumber: 6, text: 'Enter credentials' },
                ],
                verificationSteps: [{ lineNumber: 7, text: 'User is logged in' }],
                lineNumber: 1,
            };

            // Same steps, different order (shouldn't happen in practice, but test robustness)
            const test2: ParsedTest = {
                ...test1,
                actionSteps: [
                    { lineNumber: 6, text: 'Enter credentials' },
                    { lineNumber: 5, text: 'Navigate to login page' },
                ],
            };

            const hash1 = changeDetector.calculateHash(test1);
            const hash2 = changeDetector.calculateHash(test2);

            // After sorting by line number, hashes should match
            expect(hash1).toBe(hash2);
        });
    });

    describe('detectChanges', () => {
        it('should detect no changes when hash matches', () => {
            const test: ParsedTest = {
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

            const previousHash = changeDetector.calculateHash(test);
            const result = changeDetector.detectChanges(test, previousHash);

            expect(result.hasChanged).toBe(false);
            expect(result.changedFields).toEqual([]);
        });

        it('should detect changes when hash differs', () => {
            const originalTest: ParsedTest = {
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

            const previousHash = changeDetector.calculateHash(originalTest);

            const modifiedTest: ParsedTest = {
                ...originalTest,
                jsdocTags: {
                    objective: 'Verify user can logout',
                },
            };

            const result = changeDetector.detectChanges(modifiedTest, previousHash);

            expect(result.hasChanged).toBe(true);
            expect(result.changedFields).toContain('content');
        });
    });

    describe('Edge cases', () => {
        it('should handle test with no objective', () => {
            const test: ParsedTest = {
                title: 'MM-T123: Test login',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: {},
                actionSteps: [{ lineNumber: 5, text: 'Navigate' }],
                verificationSteps: [],
                lineNumber: 1,
            };

            const hash = changeDetector.calculateHash(test);

            expect(hash).toBeDefined();
            expect(hash.length).toBe(64);
        });

        it('should handle test with no action steps', () => {
            const test: ParsedTest = {
                title: 'MM-T123: Test',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: {
                    objective: 'Test something',
                },
                actionSteps: [],
                verificationSteps: [{ lineNumber: 5, text: 'Verify' }],
                lineNumber: 1,
            };

            const hash = changeDetector.calculateHash(test);

            expect(hash).toBeDefined();
            expect(hash.length).toBe(64);
        });

        it('should handle test with no verification steps', () => {
            const test: ParsedTest = {
                title: 'MM-T123: Test',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: {
                    objective: 'Test something',
                },
                actionSteps: [{ lineNumber: 5, text: 'Action' }],
                verificationSteps: [],
                lineNumber: 1,
            };

            const hash = changeDetector.calculateHash(test);

            expect(hash).toBeDefined();
            expect(hash.length).toBe(64);
        });

        it('should handle test with no steps at all', () => {
            const test: ParsedTest = {
                title: 'MM-T123: Test',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: {
                    objective: 'Test something',
                },
                actionSteps: [],
                verificationSteps: [],
                lineNumber: 1,
            };

            const hash = changeDetector.calculateHash(test);

            expect(hash).toBeDefined();
            expect(hash.length).toBe(64);
        });

        it('should handle test with precondition as string', () => {
            const test: ParsedTest = {
                title: 'MM-T123: Test',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: {
                    objective: 'Test',
                    precondition: 'User is logged in',
                },
                actionSteps: [],
                verificationSteps: [],
                lineNumber: 1,
            };

            const hash = changeDetector.calculateHash(test);

            expect(hash).toBeDefined();
            expect(hash.length).toBe(64);
        });

        it('should handle test with precondition as array', () => {
            const test: ParsedTest = {
                title: 'MM-T123: Test',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: {
                    objective: 'Test',
                    precondition: ['User is logged in', 'Admin panel accessible'],
                },
                actionSteps: [],
                verificationSteps: [],
                lineNumber: 1,
            };

            const hash = changeDetector.calculateHash(test);

            expect(hash).toBeDefined();
            expect(hash.length).toBe(64);
        });
    });
});
