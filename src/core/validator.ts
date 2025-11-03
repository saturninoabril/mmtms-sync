/**
 * Test Validator
 *
 * Validates Playwright test documentation against configurable rules.
 * Checks for required JSDoc tags, action/verification comments, and test case ID format.
 *
 * NOTE: This is a stub implementation. Full implementation pending.
 */

import type { ParsedTest } from '../models/parsed-test';
import type { ValidationConfig } from '../models/configuration';

/**
 * Validation issue
 */
export interface ValidationIssue {
    category: 'documentation' | 'action-steps' | 'verification-steps' | 'test-case-id' | 'test-title' | 'syntax';
    severity: 'error' | 'warning' | 'info';
    message: string;
    lineNumber?: number;
    suggestedFix?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
    isValid: boolean;
    issues: ValidationIssue[];
}

/**
 * Validator class for test documentation validation
 */
export class Validator {
    private config: ValidationConfig;

    constructor(config: ValidationConfig) {
        this.config = config;
    }

    /**
     * Validate a parsed test
     */
    // eslint-disable-next-line complexity, max-lines-per-function
    validate(test: ParsedTest): ValidationResult {
        const issues: ValidationIssue[] = [];

        // Validate @objective
        if (
            (this.config.requiredTags.includes('objective') || this.config.requiredTags.includes('@objective')) &&
            !test.jsdocTags.objective
        ) {
            issues.push({
                category: 'documentation',
                severity: 'error',
                message: 'Missing required @objective tag',
                lineNumber: test.lineNumber,
                suggestedFix: 'Add @objective JSDoc tag describing what this test validates',
            });
        }

        // Validate action steps
        if (this.config.enforceActionComments && test.actionSteps.length === 0) {
            issues.push({
                category: 'action-steps',
                severity: 'error',
                message: 'Missing action step comments (// #)',
                lineNumber: test.lineNumber,
                suggestedFix: 'Add // # comments before action statements',
            });
        }

        // Validate verification steps
        if (this.config.enforceVerificationComments && test.verificationSteps.length === 0) {
            issues.push({
                category: 'verification-steps',
                severity: 'error',
                message: 'Missing verification step comments (// *)',
                lineNumber: test.lineNumber,
                suggestedFix: 'Add // * comments before expect/assertion statements',
            });
        }

        // Validate test case ID format
        const projectKey = this.config.projectKey || 'MM';
        const testCasePattern = new RegExp(`^${projectKey}-T\\d+$`);

        if (!test.testCaseId) {
            issues.push({
                category: 'test-case-id',
                severity: 'warning',
                message: 'Missing test case ID in test title (will be assigned automatically)',
                lineNumber: test.lineNumber,
                suggestedFix: `Add test case ID in format ${projectKey}-T#### to test title if already synced with TMS`,
            });
        } else if (!testCasePattern.test(test.testCaseId)) {
            issues.push({
                category: 'test-case-id',
                severity: 'error',
                message: `Invalid test case ID format: ${test.testCaseId}`,
                lineNumber: test.lineNumber,
                suggestedFix: `Use format ${projectKey}-T#### (e.g., ${projectKey}-T12345)`,
            });
        }

        // Validate test title length
        const titleWithoutId = test.title.replace(/^[A-Z]+-T\d+:\s*/, '');
        if (titleWithoutId.length < 10) {
            issues.push({
                category: 'test-title',
                severity: 'warning',
                message: 'Test title is too short',
                lineNumber: test.lineNumber,
                suggestedFix: 'Use a more descriptive test title (at least 10 characters)',
            });
        }

        return {
            isValid: issues.filter((i) => i.severity === 'error').length === 0,
            issues,
        };
    }
}
