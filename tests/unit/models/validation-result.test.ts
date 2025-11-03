/**
 * Unit Tests: Validation Result Models
 *
 * Tests validation result creation and summary calculation functions.
 */

import {
    ValidationSeverity,
    ValidationCategory,
    createValidationResult,
    createValidationIssue,
    createTestValidationResult,
    calculateSummary,
    mergeValidationResults,
    type ValidationIssue,
    type TestValidationResult,
} from '../../../src/models/validation-result';

describe('Validation Result Models', () => {
    describe('createValidationResult', () => {
        it('should create empty validation result', () => {
            const result = createValidationResult();

            expect(result.totalTests).toBe(0);
            expect(result.passedTests).toBe(0);
            expect(result.failedTests).toBe(0);
            expect(result.testResults).toEqual([]);
            expect(result.summary.totalErrors).toBe(0);
            expect(result.summary.totalWarnings).toBe(0);
            expect(result.summary.totalInfo).toBe(0);
            expect(result.summary.passRate).toBe(0);
            expect(result.summary.commonIssueCategory).toBeNull();
            expect(result.summary.problemFiles).toEqual([]);
            expect(result.validatedAt).toBeDefined();
            expect(result.duration).toBe(0);
        });

        it('should set validatedAt timestamp', () => {
            const before = new Date();
            const result = createValidationResult();
            const after = new Date();

            const timestamp = new Date(result.validatedAt);
            expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
        });
    });

    describe('createValidationIssue', () => {
        it('should create validation issue with all fields', () => {
            const issue = createValidationIssue(
                ValidationSeverity.Error,
                ValidationCategory.Documentation,
                'Missing @objective',
                '/path/to/file.spec.ts',
                'DOC_001',
                42,
                'Add @objective JSDoc tag'
            );

            expect(issue.severity).toBe(ValidationSeverity.Error);
            expect(issue.category).toBe(ValidationCategory.Documentation);
            expect(issue.message).toBe('Missing @objective');
            expect(issue.filePath).toBe('/path/to/file.spec.ts');
            expect(issue.errorCode).toBe('DOC_001');
            expect(issue.lineNumber).toBe(42);
            expect(issue.suggestedFix).toBe('Add @objective JSDoc tag');
        });

        it('should create validation issue without line number', () => {
            const issue = createValidationIssue(
                ValidationSeverity.Warning,
                ValidationCategory.TestStructure,
                'Short title',
                '/path/to/file.spec.ts',
                'STRUCT_002'
            );

            expect(issue.lineNumber).toBeNull();
            expect(issue.suggestedFix).toBeNull();
        });

        it('should create validation issue with line number but no fix', () => {
            const issue = createValidationIssue(
                ValidationSeverity.Info,
                ValidationCategory.TestCoverage,
                'Test not mapped',
                '/path/to/file.spec.ts',
                'COV_001',
                10
            );

            expect(issue.lineNumber).toBe(10);
            expect(issue.suggestedFix).toBeNull();
        });
    });

    describe('createTestValidationResult', () => {
        it('should create result with no issues', () => {
            const result = createTestValidationResult('/path/to/file.spec.ts', 'MM-T123: Test title', []);

            expect(result.filePath).toBe('/path/to/file.spec.ts');
            expect(result.testTitle).toBe('MM-T123: Test title');
            expect(result.passed).toBe(true);
            expect(result.issues).toEqual([]);
            expect(result.errorCount).toBe(0);
            expect(result.warningCount).toBe(0);
            expect(result.infoCount).toBe(0);
        });

        it('should count errors correctly', () => {
            const issues: ValidationIssue[] = [
                createValidationIssue(
                    ValidationSeverity.Error,
                    ValidationCategory.Documentation,
                    'Error 1',
                    '/path',
                    'ERR_001'
                ),
                createValidationIssue(
                    ValidationSeverity.Error,
                    ValidationCategory.Documentation,
                    'Error 2',
                    '/path',
                    'ERR_002'
                ),
            ];

            const result = createTestValidationResult('/path/to/file.spec.ts', 'Test', issues);

            expect(result.errorCount).toBe(2);
            expect(result.warningCount).toBe(0);
            expect(result.infoCount).toBe(0);
            expect(result.passed).toBe(false);
        });

        it('should count warnings correctly', () => {
            const issues: ValidationIssue[] = [
                createValidationIssue(
                    ValidationSeverity.Warning,
                    ValidationCategory.TestStructure,
                    'Warning 1',
                    '/path',
                    'WARN_001'
                ),
                createValidationIssue(
                    ValidationSeverity.Warning,
                    ValidationCategory.TestStructure,
                    'Warning 2',
                    '/path',
                    'WARN_002'
                ),
                createValidationIssue(
                    ValidationSeverity.Warning,
                    ValidationCategory.TestStructure,
                    'Warning 3',
                    '/path',
                    'WARN_003'
                ),
            ];

            const result = createTestValidationResult('/path/to/file.spec.ts', 'Test', issues);

            expect(result.warningCount).toBe(3);
            expect(result.errorCount).toBe(0);
            expect(result.passed).toBe(true);
        });

        it('should count info messages correctly', () => {
            const issues: ValidationIssue[] = [
                createValidationIssue(ValidationSeverity.Info, ValidationCategory.TestCoverage, 'Info 1', '/path', 'INFO_001'),
            ];

            const result = createTestValidationResult('/path/to/file.spec.ts', 'Test', issues);

            expect(result.infoCount).toBe(1);
            expect(result.errorCount).toBe(0);
            expect(result.warningCount).toBe(0);
            expect(result.passed).toBe(true);
        });

        it('should count mixed severity issues', () => {
            const issues: ValidationIssue[] = [
                createValidationIssue(
                    ValidationSeverity.Error,
                    ValidationCategory.Documentation,
                    'Error',
                    '/path',
                    'ERR_001'
                ),
                createValidationIssue(
                    ValidationSeverity.Warning,
                    ValidationCategory.TestStructure,
                    'Warning',
                    '/path',
                    'WARN_001'
                ),
                createValidationIssue(ValidationSeverity.Info, ValidationCategory.TestCoverage, 'Info', '/path', 'INFO_001'),
            ];

            const result = createTestValidationResult('/path/to/file.spec.ts', 'Test', issues);

            expect(result.errorCount).toBe(1);
            expect(result.warningCount).toBe(1);
            expect(result.infoCount).toBe(1);
            expect(result.passed).toBe(false);
        });
    });

    describe('calculateSummary', () => {
        it('should calculate summary for empty results', () => {
            const summary = calculateSummary([]);

            expect(summary.totalErrors).toBe(0);
            expect(summary.totalWarnings).toBe(0);
            expect(summary.totalInfo).toBe(0);
            expect(summary.passRate).toBe(0);
            expect(summary.commonIssueCategory).toBeNull();
            expect(summary.problemFiles).toEqual([]);
        });

        it('should calculate summary for passing tests', () => {
            const results: TestValidationResult[] = [
                createTestValidationResult('/file1.spec.ts', 'Test 1', []),
                createTestValidationResult('/file2.spec.ts', 'Test 2', []),
                createTestValidationResult('/file3.spec.ts', 'Test 3', []),
            ];

            const summary = calculateSummary(results);

            expect(summary.totalErrors).toBe(0);
            expect(summary.totalWarnings).toBe(0);
            expect(summary.totalInfo).toBe(0);
            expect(summary.passRate).toBe(100);
            expect(summary.commonIssueCategory).toBeNull();
            expect(summary.problemFiles).toEqual([]);
        });

        it('should calculate pass rate correctly', () => {
            const results: TestValidationResult[] = [
                createTestValidationResult('/file1.spec.ts', 'Test 1', []),
                createTestValidationResult('/file2.spec.ts', 'Test 2', [
                    createValidationIssue(
                        ValidationSeverity.Error,
                        ValidationCategory.Documentation,
                        'Error',
                        '/file2.spec.ts',
                        'ERR'
                    ),
                ]),
                createTestValidationResult('/file3.spec.ts', 'Test 3', []),
                createTestValidationResult('/file4.spec.ts', 'Test 4', [
                    createValidationIssue(
                        ValidationSeverity.Error,
                        ValidationCategory.Documentation,
                        'Error',
                        '/file4.spec.ts',
                        'ERR'
                    ),
                ]),
            ];

            const summary = calculateSummary(results);

            expect(summary.passRate).toBe(50);
            expect(summary.totalErrors).toBe(2);
        });

        it('should find most common issue category', () => {
            const results: TestValidationResult[] = [
                createTestValidationResult('/file1.spec.ts', 'Test 1', [
                    createValidationIssue(
                        ValidationSeverity.Error,
                        ValidationCategory.Documentation,
                        'Error',
                        '/file1.spec.ts',
                        'ERR'
                    ),
                ]),
                createTestValidationResult('/file2.spec.ts', 'Test 2', [
                    createValidationIssue(
                        ValidationSeverity.Error,
                        ValidationCategory.Documentation,
                        'Error',
                        '/file2.spec.ts',
                        'ERR'
                    ),
                ]),
                createTestValidationResult('/file3.spec.ts', 'Test 3', [
                    createValidationIssue(
                        ValidationSeverity.Error,
                        ValidationCategory.TestStructure,
                        'Error',
                        '/file3.spec.ts',
                        'ERR'
                    ),
                ]),
            ];

            const summary = calculateSummary(results);

            expect(summary.commonIssueCategory).toBe(ValidationCategory.Documentation);
        });

        it('should find problem files (top 5)', () => {
            const results: TestValidationResult[] = [
                createTestValidationResult('/file1.spec.ts', 'Test 1', [
                    createValidationIssue(ValidationSeverity.Error, ValidationCategory.Documentation, 'E1', '/file1.spec.ts', 'E1'),
                    createValidationIssue(ValidationSeverity.Error, ValidationCategory.Documentation, 'E2', '/file1.spec.ts', 'E2'),
                    createValidationIssue(ValidationSeverity.Error, ValidationCategory.Documentation, 'E3', '/file1.spec.ts', 'E3'),
                ]),
                createTestValidationResult('/file2.spec.ts', 'Test 2', [
                    createValidationIssue(ValidationSeverity.Error, ValidationCategory.Documentation, 'E1', '/file2.spec.ts', 'E1'),
                    createValidationIssue(ValidationSeverity.Error, ValidationCategory.Documentation, 'E2', '/file2.spec.ts', 'E2'),
                ]),
                createTestValidationResult('/file3.spec.ts', 'Test 3', [
                    createValidationIssue(ValidationSeverity.Error, ValidationCategory.Documentation, 'E1', '/file3.spec.ts', 'E1'),
                ]),
                createTestValidationResult('/file4.spec.ts', 'Test 4', []),
            ];

            const summary = calculateSummary(results);

            expect(summary.problemFiles).toEqual(['/file1.spec.ts', '/file2.spec.ts', '/file3.spec.ts']);
            expect(summary.problemFiles.length).toBe(3);
        });

        it('should limit problem files to 5', () => {
            const results: TestValidationResult[] = [];
            for (let i = 1; i <= 10; i++) {
                results.push(
                    createTestValidationResult(`/file${i}.spec.ts`, `Test ${i}`, [
                        createValidationIssue(
                            ValidationSeverity.Error,
                            ValidationCategory.Documentation,
                            'Error',
                            `/file${i}.spec.ts`,
                            'ERR'
                        ),
                    ])
                );
            }

            const summary = calculateSummary(results);

            expect(summary.problemFiles.length).toBe(5);
        });
    });

    describe('mergeValidationResults', () => {
        it('should merge empty results', () => {
            const merged = mergeValidationResults([]);

            expect(merged.totalTests).toBe(0);
            expect(merged.passedTests).toBe(0);
            expect(merged.failedTests).toBe(0);
            expect(merged.testResults).toEqual([]);
        });

        it('should merge multiple validation results', () => {
            const result1 = createValidationResult();
            result1.totalTests = 5;
            result1.passedTests = 4;
            result1.failedTests = 1;
            result1.testResults = [
                createTestValidationResult('/file1.spec.ts', 'Test 1', []),
                createTestValidationResult('/file2.spec.ts', 'Test 2', [
                    createValidationIssue(
                        ValidationSeverity.Error,
                        ValidationCategory.Documentation,
                        'Error',
                        '/file2.spec.ts',
                        'ERR'
                    ),
                ]),
            ];

            const result2 = createValidationResult();
            result2.totalTests = 3;
            result2.passedTests = 3;
            result2.failedTests = 0;
            result2.testResults = [createTestValidationResult('/file3.spec.ts', 'Test 3', [])];

            const merged = mergeValidationResults([result1, result2]);

            expect(merged.totalTests).toBe(8);
            expect(merged.passedTests).toBe(7);
            expect(merged.failedTests).toBe(1);
            expect(merged.testResults.length).toBe(3);
        });

        it('should recalculate summary for merged results', () => {
            const result1 = createValidationResult();
            result1.totalTests = 2;
            result1.passedTests = 1;
            result1.failedTests = 1;
            result1.testResults = [
                createTestValidationResult('/file1.spec.ts', 'Test 1', []),
                createTestValidationResult('/file2.spec.ts', 'Test 2', [
                    createValidationIssue(
                        ValidationSeverity.Error,
                        ValidationCategory.Documentation,
                        'Error',
                        '/file2.spec.ts',
                        'ERR'
                    ),
                ]),
            ];

            const result2 = createValidationResult();
            result2.totalTests = 1;
            result2.passedTests = 1;
            result2.failedTests = 0;
            result2.testResults = [createTestValidationResult('/file3.spec.ts', 'Test 3', [])];

            const merged = mergeValidationResults([result1, result2]);

            expect(merged.summary.totalErrors).toBe(1);
            expect(merged.summary.passRate).toBe(67); // 2 out of 3 passed = 66.67% rounded to 67
        });
    });
});
