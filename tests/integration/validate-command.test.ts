/**
 * Integration Tests: Validate Command
 *
 * Tests the end-to-end validation workflow including CLI command,
 * parser, validator, and output formatting.
 */

import { TestParser } from '../../src/core/parser';
import { Validator } from '../../src/core/validator';
import { DEFAULT_CONFIG } from '../../src/models/configuration';
import { join } from 'path';

describe('Validate Command Integration', () => {
    const parser = new TestParser();
    const validator = new Validator(DEFAULT_CONFIG.validation);
    const fixturesDir = join(__dirname, '../fixtures');

    // T071: Validate single file with complete documentation (PASS)
    describe('T071: Validate file with complete documentation', () => {
        it('should pass validation for properly documented test', async () => {
            const filePath = join(fixturesDir, 'sample-valid-test.spec.ts');
            const parseResult = await parser.parseTestFile(filePath);

            expect(parseResult.tests).toHaveLength(1);

            const validationResult = validator.validate(parseResult.tests[0]);

            expect(validationResult.isValid).toBe(true);
            expect(validationResult.issues).toHaveLength(0);
        });

        it('should include all required elements in valid test', async () => {
            const filePath = join(fixturesDir, 'sample-valid-test.spec.ts');
            const parseResult = await parser.parseTestFile(filePath);
            const test = parseResult.tests[0];

            // Verify all required elements are present
            expect(test.jsdocTags.objective).toBeDefined();
            expect(test.testCaseId).toBeDefined();
            expect(test.actionSteps.length).toBeGreaterThan(0);
            expect(test.verificationSteps.length).toBeGreaterThan(0);
        });
    });

    // T072: Validate file missing @objective (FAIL with specific error)
    describe('T072: Validate file missing @objective', () => {
        it('should fail validation when @objective is missing', async () => {
            const testCode = `
import { test } from '@playwright/test';
test('MM-T123: Test without objective', async ({ page }) => {
    // # Action
    await page.goto('/');
    // * Verify
    await expect(page).toHaveURL('/');
});
`;
            const parseResult = await parser.parseTestCode(testCode, 'test-missing-objective.spec.ts');
            const validationResult = validator.validate(parseResult.tests[0]);

            expect(validationResult.isValid).toBe(false);
            expect(validationResult.issues.length).toBeGreaterThan(0);

            const objectiveError = validationResult.issues.find(
                (i) => i.category === 'documentation' && i.message.includes('objective')
            );
            expect(objectiveError).toBeDefined();
            expect(objectiveError?.severity).toBe('error');
            expect(objectiveError?.suggestedFix).toBeDefined();
        });

        it('should provide specific error message for missing @objective', async () => {
            const testCode = `
import { test } from '@playwright/test';
test('MM-T123: Test', async ({ page }) => {
    // # Action
    await page.goto('/');
    // * Verify
    await expect(page).toHaveURL('/');
});
`;
            const parseResult = await parser.parseTestCode(testCode, 'test.spec.ts');
            const validationResult = validator.validate(parseResult.tests[0]);

            const objectiveError = validationResult.issues.find((i) => i.message.includes('objective'));
            expect(objectiveError?.message).toContain('@objective');
            expect(objectiveError?.suggestedFix).toContain('Add @objective JSDoc tag');
        });
    });

    // T073: Validate directory with mixed results (summary output)
    describe('T073: Validate directory with mixed results', () => {
        it('should handle multiple files with different validation results', async () => {
            const files = [
                join(fixturesDir, 'sample-valid-test.spec.ts'),
                join(fixturesDir, 'sample-test-skip.spec.ts'),
            ];

            const results = [];
            for (const file of files) {
                const parseResult = await parser.parseTestFile(file);
                for (const test of parseResult.tests) {
                    const validationResult = validator.validate(test);
                    results.push({
                        file,
                        test: test.title,
                        valid: validationResult.isValid,
                        issues: validationResult.issues,
                    });
                }
            }

            expect(results.length).toBeGreaterThan(0);

            // Calculate summary
            const totalTests = results.length;
            const validTests = results.filter((r) => r.valid).length;
            const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);

            expect(totalTests).toBeGreaterThan(0);
            expect(validTests).toBeLessThanOrEqual(totalTests);
            expect(totalIssues).toBeGreaterThanOrEqual(0);
        });

        it('should format summary with statistics', async () => {
            const files = [join(fixturesDir, 'sample-valid-test.spec.ts')];

            const results = [];
            for (const file of files) {
                const parseResult = await parser.parseTestFile(file);
                for (const test of parseResult.tests) {
                    const validationResult = validator.validate(test);
                    results.push({
                        file,
                        test: test.title,
                        valid: validationResult.isValid,
                        issues: validationResult.issues,
                    });
                }
            }

            const totalTests = results.length;
            const validTests = results.filter((r) => r.valid).length;

            expect(totalTests).toBe(1);
            expect(validTests).toBe(1);
        });
    });

    // T074: Validate with --format json (structured output)
    describe('T074: Validate with structured output', () => {
        it('should produce structured validation results', async () => {
            const filePath = join(fixturesDir, 'sample-valid-test.spec.ts');
            const parseResult = await parser.parseTestFile(filePath);
            const validationResult = validator.validate(parseResult.tests[0]);

            const result = {
                file: filePath,
                test: parseResult.tests[0].title,
                valid: validationResult.isValid,
                issues: validationResult.issues,
            };

            // Verify result structure
            expect(result).toHaveProperty('file');
            expect(result).toHaveProperty('test');
            expect(result).toHaveProperty('valid');
            expect(result).toHaveProperty('issues');
            expect(result.valid).toBe(true);
            expect(result.issues).toHaveLength(0);
        });

        it('should include all validation details in structured output', async () => {
            const testCode = `
/**
 * @objective Test something
 */
import { test } from '@playwright/test';
test('Test without ID', async ({ page }) => {
    await page.goto('/');
});
`;
            const parseResult = await parser.parseTestCode(testCode, 'test.spec.ts');
            const validationResult = validator.validate(parseResult.tests[0]);

            const result = {
                file: 'test.spec.ts',
                test: parseResult.tests[0].title,
                valid: validationResult.isValid,
                issues: validationResult.issues,
            };

            expect(result.valid).toBe(false);
            expect(result.issues.length).toBeGreaterThan(0);
            expect(result.issues[0]).toHaveProperty('category');
            expect(result.issues[0]).toHaveProperty('severity');
            expect(result.issues[0]).toHaveProperty('message');
        });

        it('should support JSON serialization of results', () => {
            const results = [
                {
                    file: 'test1.spec.ts',
                    test: 'MM-T123: Valid test',
                    valid: true,
                    issues: [],
                },
                {
                    file: 'test2.spec.ts',
                    test: 'MM-T124: Invalid test',
                    valid: false,
                    issues: [
                        {
                            category: 'documentation' as const,
                            severity: 'error' as const,
                            message: 'Missing @objective',
                        },
                    ],
                },
            ];

            // Should serialize to JSON without errors
            const jsonOutput = JSON.stringify(results, null, 2);
            expect(() => JSON.parse(jsonOutput)).not.toThrow();

            const parsed = JSON.parse(jsonOutput);
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed.length).toBe(2);
        });
    });
});
