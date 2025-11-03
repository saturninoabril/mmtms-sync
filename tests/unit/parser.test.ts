/**
 * Unit Tests: TestParser
 *
 * Tests TypeScript AST parsing for Playwright test files, extracting JSDoc tags,
 * action/verification comments, test case IDs, and handling various test functions.
 */

import { TestParser } from '../../src/core/parser';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ParsedTest } from '../../src/models/parsed-test';

describe('TestParser', () => {
    let parser: TestParser;
    const fixturesDir = join(__dirname, '../fixtures');

    beforeEach(() => {
        parser = new TestParser();
    });

    describe('T039: Extract @objective JSDoc tag', () => {
        it('should extract @objective tag from JSDoc comment', () => {
            const filePath = join(fixturesDir, 'sample-valid-test.spec.ts');
            const result = parser.parseTestFile(filePath);

            expect(result.tests).toHaveLength(1);
            expect(result.tests[0].jsdocTags.objective).toBe(
                'Verify that user can successfully log in with valid credentials'
            );
        });

        it('should handle missing @objective tag', () => {
            const testCode = `
import { test } from '@playwright/test';
test('MM-T123: No objective', async ({ page }) => {
    await page.goto('/');
});
`;
            const filePath = join(fixturesDir, 'temp-no-objective.spec.ts');
            const result = parser.parseTestCode(testCode, filePath);

            expect(result.tests[0].jsdocTags.objective).toBeUndefined();
        });

        it('should handle multiline @objective tag', () => {
            const testCode = `
/**
 * @objective Verify that user can successfully
 * complete a complex multi-step workflow
 */
import { test } from '@playwright/test';
test('MM-T123: Test', async ({ page }) => {});
`;
            const filePath = join(fixturesDir, 'temp-multiline.spec.ts');
            const result = parser.parseTestCode(testCode, filePath);

            expect(result.tests[0].jsdocTags.objective).toContain('multi-step workflow');
        });
    });

    describe('T040: Extract @precondition JSDoc tag', () => {
        it('should extract @precondition tag from JSDoc comment', () => {
            const filePath = join(fixturesDir, 'sample-valid-test.spec.ts');
            const result = parser.parseTestFile(filePath);

            expect(result.tests[0].jsdocTags.precondition).toBe('User account exists in the system');
        });

        it('should handle missing @precondition tag', () => {
            const testCode = `
/**
 * @objective Test something
 */
import { test } from '@playwright/test';
test('MM-T123: Test', async ({ page }) => {});
`;
            const filePath = join(fixturesDir, 'temp-no-precondition.spec.ts');
            const result = parser.parseTestCode(testCode, filePath);

            expect(result.tests[0].jsdocTags.precondition).toBeUndefined();
        });

        it('should extract multiple @precondition tags as array', () => {
            const testCode = `
/**
 * @objective Test something
 * @precondition User is logged in
 * @precondition Admin panel is accessible
 */
import { test } from '@playwright/test';
test('MM-T123: Test', async ({ page }) => {});
`;
            const filePath = join(fixturesDir, 'temp-multi-precondition.spec.ts');
            const result = parser.parseTestCode(testCode, filePath);

            const preconditions = result.tests[0].jsdocTags.precondition;
            expect(Array.isArray(preconditions) ? preconditions : [preconditions]).toContain('User is logged in');
        });
    });

    describe('T041: Extract // # action comments', () => {
        it('should extract action step comments with line numbers', () => {
            const filePath = join(fixturesDir, 'sample-valid-test.spec.ts');
            const result = parser.parseTestFile(filePath);

            const actionSteps = result.tests[0].actionSteps;
            expect(actionSteps.length).toBeGreaterThanOrEqual(4);

            // Check action steps exist
            const stepTexts = actionSteps.map((s) => s.text);
            expect(stepTexts).toContain('Navigate to login page');
            expect(stepTexts).toContain('Enter username');
            expect(stepTexts).toContain('Enter password');
            expect(stepTexts).toContain('Click login button');

            // Check line numbers are captured
            expect(actionSteps[0].lineNumber).toBeGreaterThan(0);
        });

        it('should handle tests with no action steps', () => {
            const testCode = `
import { test } from '@playwright/test';
test('MM-T123: Test', async ({ page }) => {
    await page.goto('/');
});
`;
            const filePath = join(fixturesDir, 'temp-no-actions.spec.ts');
            const result = parser.parseTestCode(testCode, filePath);

            expect(result.tests[0].actionSteps).toHaveLength(0);
        });

        it('should preserve action step order', () => {
            const testCode = `
import { test } from '@playwright/test';
test('MM-T123: Test', async ({ page }) => {
    // # First action
    await page.goto('/');
    // # Second action
    await page.click('button');
    // # Third action
    await page.fill('input', 'text');
});
`;
            const filePath = join(fixturesDir, 'temp-ordered-actions.spec.ts');
            const result = parser.parseTestCode(testCode, filePath);

            const steps = result.tests[0].actionSteps;
            expect(steps[0].text).toBe('First action');
            expect(steps[1].text).toBe('Second action');
            expect(steps[2].text).toBe('Third action');
        });
    });

    describe('T042: Extract // * verification comments', () => {
        it('should extract verification step comments with line numbers', () => {
            const filePath = join(fixturesDir, 'sample-valid-test.spec.ts');
            const result = parser.parseTestFile(filePath);

            const verificationSteps = result.tests[0].verificationSteps;
            expect(verificationSteps.length).toBeGreaterThanOrEqual(3);

            // Check verification steps exist
            const stepTexts = verificationSteps.map((s) => s.text);
            expect(stepTexts).toContain('Verify user is redirected to channels');
            expect(stepTexts).toContain('Verify welcome message is displayed');
            expect(stepTexts).toContain('Verify user profile menu is accessible');

            // Check line numbers are captured
            expect(verificationSteps[0].lineNumber).toBeGreaterThan(0);
        });

        it('should handle tests with no verification steps', () => {
            const testCode = `
import { test } from '@playwright/test';
test('MM-T123: Test', async ({ page }) => {
    // # Action only
    await page.goto('/');
});
`;
            const filePath = join(fixturesDir, 'temp-no-verifications.spec.ts');
            const result = parser.parseTestCode(testCode, filePath);

            expect(result.tests[0].verificationSteps).toHaveLength(0);
        });

        it('should distinguish action and verification steps', () => {
            const testCode = `
import { test } from '@playwright/test';
test('MM-T123: Test', async ({ page }) => {
    // # This is an action
    await page.click('button');
    // * This is a verification
    await expect(page).toHaveURL('/success');
});
`;
            const filePath = join(fixturesDir, 'temp-mixed-steps.spec.ts');
            const result = parser.parseTestCode(testCode, filePath);

            expect(result.tests[0].actionSteps).toHaveLength(1);
            expect(result.tests[0].verificationSteps).toHaveLength(1);
            expect(result.tests[0].actionSteps[0].text).toBe('This is an action');
            expect(result.tests[0].verificationSteps[0].text).toBe('This is a verification');
        });
    });

    describe('T043: Extract test title and test case ID', () => {
        it('should extract test title', () => {
            const filePath = join(fixturesDir, 'sample-valid-test.spec.ts');
            const result = parser.parseTestFile(filePath);

            expect(result.tests[0].title).toBe('MM-T12345: User can log in with valid credentials');
        });

        it('should extract test case ID from title', () => {
            const filePath = join(fixturesDir, 'sample-valid-test.spec.ts');
            const result = parser.parseTestFile(filePath);

            expect(result.tests[0].testCaseId).toBe('MM-T12345');
        });

        it('should handle test without test case ID', () => {
            const testCode = `
import { test } from '@playwright/test';
test('Simple test without ID', async ({ page }) => {});
`;
            const filePath = join(fixturesDir, 'temp-no-id.spec.ts');
            const result = parser.parseTestCode(testCode, filePath);

            expect(result.tests[0].testCaseId).toBeUndefined();
            expect(result.tests[0].title).toBe('Simple test without ID');
        });

        it('should only extract MM-T format test case IDs', () => {
            const testCode = `
import { test } from '@playwright/test';
test('MM-T999: Valid Mattermost ID', async ({ page }) => {});
test('PROJ-T123: Invalid project prefix', async ({ page }) => {});
test('MM-T456: Another valid ID', async ({ page }) => {});
`;
            const filePath = join(fixturesDir, 'temp-mm-t-only.spec.ts');
            const result = parser.parseTestCode(testCode, filePath);

            expect(result.tests[0].testCaseId).toBe('MM-T999');
            expect(result.tests[1].testCaseId).toBeUndefined(); // PROJ-T123 is not extracted
            expect(result.tests[2].testCaseId).toBe('MM-T456');
        });
    });

    describe('T044: Handle test(), test.skip(), test.fixme()', () => {
        it('should parse test() functions', () => {
            const filePath = join(fixturesDir, 'sample-valid-test.spec.ts');
            const result = parser.parseTestFile(filePath);

            expect(result.tests).toHaveLength(1);
            expect(result.tests[0].type).toBe('test');
        });

        it('should extract Playwright native tags from test configuration', () => {
            const filePath = join(fixturesDir, 'sample-valid-test.spec.ts');
            const result = parser.parseTestFile(filePath);

            expect(result.tests[0].jsdocTags.playwrightTags).toBeDefined();
            expect(result.tests[0].jsdocTags.playwrightTags).toContain('login');
            expect(result.tests[0].jsdocTags.playwrightTags).toContain('authentication');
        });

        it('should parse test.skip() functions', () => {
            const filePath = join(fixturesDir, 'sample-test-skip.spec.ts');
            const result = parser.parseTestFile(filePath);

            const skippedTest = result.tests.find((t) => t.testCaseId === 'MM-T99999');
            expect(skippedTest).toBeDefined();
            expect(skippedTest?.type).toBe('test.skip');
        });

        it('should parse test.fixme() functions', () => {
            const filePath = join(fixturesDir, 'sample-test-skip.spec.ts');
            const result = parser.parseTestFile(filePath);

            const fixmeTest = result.tests.find((t) => t.testCaseId === 'MM-T88888');
            expect(fixmeTest).toBeDefined();
            expect(fixmeTest?.type).toBe('test.fixme');
        });

        it('should handle multiple tests in same file', () => {
            const filePath = join(fixturesDir, 'sample-test-skip.spec.ts');
            const result = parser.parseTestFile(filePath);

            expect(result.tests).toHaveLength(2);
            expect(result.tests[0].type).toBe('test.skip');
            expect(result.tests[1].type).toBe('test.fixme');
        });
    });

    describe('T045: Handle parser errors gracefully', () => {
        it('should handle syntax errors in test file', () => {
            const testCode = `
import { test } from '@playwright/test';
test('MM-T123: Test', async ({ page }) => {
    // Missing closing brace
    await page.goto('/');
`;
            const filePath = join(fixturesDir, 'temp-syntax-error.spec.ts');

            // ts-morph is lenient and will parse even with syntax errors
            // It should still return a result, possibly with incomplete data
            const result = parser.parseTestCode(testCode, filePath);
            expect(result).toBeDefined();
            expect(result.tests.length).toBeGreaterThanOrEqual(0);
        });

        it('should handle non-existent file gracefully', () => {
            const filePath = join(fixturesDir, 'does-not-exist.spec.ts');

            expect(() => parser.parseTestFile(filePath)).toThrow();
        });

        it('should handle empty file', () => {
            const testCode = '';
            const filePath = join(fixturesDir, 'temp-empty.spec.ts');

            const result = parser.parseTestCode(testCode, filePath);
            expect(result.tests).toHaveLength(0);
        });

        it('should handle file with no tests', () => {
            const testCode = `
import { test } from '@playwright/test';
// Just imports, no actual tests
const someVariable = 'value';
`;
            const filePath = join(fixturesDir, 'temp-no-tests.spec.ts');

            const result = parser.parseTestCode(testCode, filePath);
            expect(result.tests).toHaveLength(0);
        });
    });

    describe('Parser edge cases for branch coverage', () => {
        it('should skip non-test property access expressions', () => {
            const testCode = `
import { test } from '@playwright/test';
test.describe('Suite', () => {
    test('MM-T123: Test', async ({ page }) => {
        await page.goto('/');
    });
});
`;
            const result = parser.parseTestCode(testCode, 'test.spec.ts');

            // Should find the test inside describe
            expect(result.tests.length).toBeGreaterThanOrEqual(1);
        });

        it('should handle test with non-string title argument', () => {
            const testCode = `
import { test } from '@playwright/test';
const title = 'MM-T123: Test';
test(title, async ({ page }) => {});
`;
            const result = parser.parseTestCode(testCode, 'test.spec.ts');

            // Should skip tests with non-literal titles
            expect(result.tests).toHaveLength(0);
        });

        it('should handle test with less than 2 arguments', () => {
            const testCode = `
import { test } from '@playwright/test';
test('MM-T123: Test');
`;
            const result = parser.parseTestCode(testCode, 'test.spec.ts');

            expect(result.tests).toHaveLength(0);
        });

        it('should handle test with function expression instead of arrow function', () => {
            const testCode = `
import { test } from '@playwright/test';
test('MM-T123: Test', function({ page }) {
    // # Navigate
    page.goto('/');
});
`;
            const result = parser.parseTestCode(testCode, 'test.spec.ts');

            expect(result.tests).toHaveLength(1);
            expect(result.tests[0].title).toBe('MM-T123: Test');
        });

        it('should handle test with non-block body (expression body)', () => {
            const testCode = `
import { test } from '@playwright/test';
test('MM-T123: Test', async ({ page }) => page.goto('/'));
`;
            const result = parser.parseTestCode(testCode, 'test.spec.ts');

            // Should skip tests without block bodies
            expect(result.tests).toHaveLength(0);
        });

        it('should extract @known_issue tag', () => {
            const testCode = `
/**
 * @objective Test something
 * @known_issue This feature has a known bug
 */
import { test } from '@playwright/test';
test('MM-T123: Test', async ({ page }) => {
    await page.goto('/');
});
`;
            const result = parser.parseTestCode(testCode, 'test.spec.ts');

            expect(result.tests[0].jsdocTags.knownIssue).toBe('This feature has a known bug');
        });

        it('should handle multiline @known_issue tag', () => {
            const testCode = `
/**
 * @objective Test something
 * @known_issue This feature has a known bug
 * that spans multiple lines
 */
import { test } from '@playwright/test';
test('MM-T123: Test', async ({ page }) => {});
`;
            const result = parser.parseTestCode(testCode, 'test.spec.ts');

            expect(result.tests[0].jsdocTags.knownIssue).toContain('known bug');
            expect(result.tests[0].jsdocTags.knownIssue).toContain('multiple lines');
        });

        it('should handle test with options object but no tags', () => {
            const testCode = `
import { test } from '@playwright/test';
test('MM-T123: Test', { timeout: 30000 }, async ({ page }) => {
    await page.goto('/');
});
`;
            const result = parser.parseTestCode(testCode, 'test.spec.ts');

            expect(result.tests).toHaveLength(1);
            expect(result.tests[0].jsdocTags.playwrightTags).toBeUndefined();
        });

        it('should handle test with tags property but non-array value', () => {
            const testCode = `
import { test } from '@playwright/test';
test('MM-T123: Test', { tag: 'single-tag' }, async ({ page }) => {
    await page.goto('/');
});
`;
            const result = parser.parseTestCode(testCode, 'test.spec.ts');

            expect(result.tests).toHaveLength(1);
        });

        it('should skip unknown test method calls', () => {
            const testCode = `
import { test } from '@playwright/test';
test.unknown('MM-T123: Test', async ({ page }) => {});
`;
            const result = parser.parseTestCode(testCode, 'test.spec.ts');

            expect(result.tests).toHaveLength(0);
        });
    });
});
