/**
 * Parsed Test Model
 *
 * Represents a test case parsed from a TypeScript test file using AST analysis.
 * Contains all metadata extracted from JSDoc comments and inline comments.
 */

/**
 * JSDoc tags extracted from test file
 */
export interface JSDocTags {
    /** Test objective from @objective tag (required for validation) */
    objective?: string;

    /** Precondition(s) from @precondition tag (can be single string or array) */
    precondition?: string | string[];

    /** Known issue ID from @known_issue tag (optional) */
    knownIssue?: string;

    /**
     * Playwright test tags from {tag: [...]} configuration parameter (NOT JSDoc)
     * Example: test('title', {tag: ['@smoke', '@regression']}, async () => {})
     * See: https://playwright.dev/docs/test-annotations#tag-tests
     *
     * NOTE: @tags JSDoc tag is NOT supported. Use Playwright's native tagging.
     */
    playwrightTags?: string[];
}

/**
 * Individual test step (action or verification)
 */
export interface TestStep {
    /** Step description from comment (without // # or // * prefix) */
    text: string;

    /** Line number in source file (1-indexed) */
    lineNumber: number;
}

/**
 * Parsed test case from a Playwright test file
 */
export interface ParsedTest {
    /** Test title/description (from test() first argument) */
    title: string;

    /** Test case ID from TMS (format: PROJECT-T####), if present */
    testCaseId?: string;

    /** Test function type (test, test.skip, test.fixme) */
    type: 'test' | 'test.skip' | 'test.fixme';

    /** JSDoc tags extracted from file */
    jsdocTags: JSDocTags;

    /** Action comments (// #) with line numbers */
    actionSteps: TestStep[];

    /** Verification comments (// *) with line numbers */
    verificationSteps: TestStep[];

    /** Line number where test starts in file (1-indexed) */
    lineNumber: number;
}

/**
 * Result of parsing a test file
 */
export interface ParseResult {
    /** Absolute path to the test file */
    filePath: string;

    /** All tests found in the file */
    tests: ParsedTest[];

    /** Total number of tests */
    totalTests: number;
}

/**
 * Validation rules for ParsedTest
 */
export const ParsedTestValidation = {
    /** Minimum number of action steps required */
    MIN_ACTION_STEPS: 1,

    /** Minimum number of verification steps required */
    MIN_VERIFICATION_STEPS: 1,

    /** Regex pattern for test case ID (e.g., MM-T12345) */
    TEST_CASE_ID_PATTERN: /^[A-Z]+-T\d+$/,

    /** Maximum length for objective text */
    MAX_OBJECTIVE_LENGTH: 500,

    /** Maximum length for precondition text */
    MAX_PRECONDITION_LENGTH: 500,
};

/**
 * Type guard to check if a string is a valid test case ID
 */
export function isValidTestCaseId(id: string | undefined): id is string {
    if (!id) {
        return false;
    }
    return ParsedTestValidation.TEST_CASE_ID_PATTERN.test(id);
}
