/**
 * Validation Result Model
 *
 * Represents the result of validating test documentation quality.
 * Contains errors, warnings, and validation metrics.
 */

/**
 * Validation error severity
 */
export enum ValidationSeverity {
    /** Error - test fails validation */
    Error = 'error',

    /** Warning - test passes but has issues */
    Warning = 'warning',

    /** Info - suggestion for improvement */
    Info = 'info',
}

/**
 * Validation error category
 */
export enum ValidationCategory {
    /** Missing or invalid JSDoc tags */
    Documentation = 'documentation',

    /** Missing or insufficient action comments */
    ActionSteps = 'action-steps',

    /** Missing or insufficient verification comments */
    VerificationSteps = 'verification-steps',

    /** Invalid test case ID format */
    TestCaseId = 'test-case-id',

    /** Invalid test title */
    TestTitle = 'test-title',

    /** Parsing errors */
    Syntax = 'syntax',
}

/**
 * Individual validation issue
 */
export interface ValidationIssue {
    /** Issue severity */
    severity: ValidationSeverity;

    /** Issue category */
    category: ValidationCategory;

    /** Error message */
    message: string;

    /** Suggested fix */
    suggestedFix: string | null;

    /** File path where issue occurred */
    filePath: string;

    /** Line number (if applicable) */
    lineNumber: number | null;

    /** Error code (e.g., VAL_001) */
    errorCode: string;
}

/**
 * Validation result for a single test
 */
export interface TestValidationResult {
    /** Test file path */
    filePath: string;

    /** Test title */
    testTitle: string;

    /** Whether test passed validation */
    passed: boolean;

    /** Validation issues found */
    issues: ValidationIssue[];

    /** Number of errors */
    errorCount: number;

    /** Number of warnings */
    warningCount: number;

    /** Number of info messages */
    infoCount: number;
}

/**
 * Overall validation result for multiple tests
 */
export interface ValidationResult {
    /** Total number of tests validated */
    totalTests: number;

    /** Number of tests that passed */
    passedTests: number;

    /** Number of tests that failed */
    failedTests: number;

    /** Individual test results */
    testResults: TestValidationResult[];

    /** Summary statistics */
    summary: ValidationSummary;

    /** Validation timestamp */
    validatedAt: string;

    /** Validation duration in milliseconds */
    duration: number;
}

/**
 * Validation summary statistics
 */
export interface ValidationSummary {
    /** Total errors across all tests */
    totalErrors: number;

    /** Total warnings across all tests */
    totalWarnings: number;

    /** Total info messages across all tests */
    totalInfo: number;

    /** Pass rate percentage (0-100) */
    passRate: number;

    /** Most common issue category */
    commonIssueCategory: ValidationCategory | null;

    /** Files with most issues */
    problemFiles: string[];
}

/**
 * Create empty validation result
 */
export function createValidationResult(): ValidationResult {
    return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        testResults: [],
        summary: {
            totalErrors: 0,
            totalWarnings: 0,
            totalInfo: 0,
            passRate: 0,
            commonIssueCategory: null,
            problemFiles: [],
        },
        validatedAt: new Date().toISOString(),
        duration: 0,
    };
}

/**
 * Create validation issue
 */
export function createValidationIssue(
    severity: ValidationSeverity,
    category: ValidationCategory,
    message: string,
    filePath: string,
    errorCode: string,
    lineNumber?: number,
    suggestedFix?: string
): ValidationIssue {
    return {
        severity,
        category,
        message,
        suggestedFix: suggestedFix ?? null,
        filePath,
        lineNumber: lineNumber ?? null,
        errorCode,
    };
}

/**
 * Create test validation result
 */
export function createTestValidationResult(
    filePath: string,
    testTitle: string,
    issues: ValidationIssue[]
): TestValidationResult {
    const errorCount = issues.filter((i) => i.severity === ValidationSeverity.Error).length;
    const warningCount = issues.filter((i) => i.severity === ValidationSeverity.Warning).length;
    const infoCount = issues.filter((i) => i.severity === ValidationSeverity.Info).length;

    return {
        filePath,
        testTitle,
        passed: errorCount === 0,
        issues,
        errorCount,
        warningCount,
        infoCount,
    };
}

/**
 * Calculate summary from test results
 */
export function calculateSummary(testResults: TestValidationResult[]): ValidationSummary {
    const totalErrors = testResults.reduce((sum, test) => sum + test.errorCount, 0);
    const totalWarnings = testResults.reduce((sum, test) => sum + test.warningCount, 0);
    const totalInfo = testResults.reduce((sum, test) => sum + test.infoCount, 0);

    const passedCount = testResults.filter((test) => test.passed).length;
    const passRate = testResults.length > 0 ? Math.round((passedCount / testResults.length) * 100) : 0;

    // Find most common issue category
    const categoryCounts: Record<string, number> = {};
    for (const test of testResults) {
        for (const issue of test.issues) {
            categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
        }
    }

    const commonIssueCategory =
        (Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as ValidationCategory | undefined) ?? null;

    // Find files with most issues
    const problemFiles = testResults
        .filter((test) => test.errorCount > 0)
        .sort((a, b) => b.errorCount - a.errorCount)
        .slice(0, 5)
        .map((test) => test.filePath);

    return {
        totalErrors,
        totalWarnings,
        totalInfo,
        passRate,
        commonIssueCategory,
        problemFiles,
    };
}

/**
 * Merge multiple validation results
 */
export function mergeValidationResults(results: ValidationResult[]): ValidationResult {
    const merged = createValidationResult();

    for (const result of results) {
        merged.totalTests += result.totalTests;
        merged.passedTests += result.passedTests;
        merged.failedTests += result.failedTests;
        merged.testResults.push(...result.testResults);
    }

    merged.summary = calculateSummary(merged.testResults);

    return merged;
}
