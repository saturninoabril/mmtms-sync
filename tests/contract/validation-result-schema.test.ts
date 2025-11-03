/**
 * Contract Test: Validation Result Schema
 *
 * Validates that the validation result JSON schema matches the ValidationResult interface
 * and enforces error format with severity, category, and error codes.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ValidationSeverity, ValidationCategory } from '../../src/models/validation-result';

describe('validation-result-schema.json Contract Tests', () => {
    let ajv: Ajv;
    let schema: any;

    beforeAll(() => {
        // Load JSON schema
        const schemaPath = join(
            __dirname,
            '../../src/contracts/validation-result-schema.json'
        );
        schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

        // Initialize AJV with format validators
        ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
    });

    describe('Schema Structure', () => {
        it('should have valid JSON Schema format', () => {
            expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
            expect(schema.title).toBe('Validation Result Schema');
            expect(schema.type).toBe('object');
        });

        it('should require essential fields', () => {
            expect(schema.required).toContain('totalTests');
            expect(schema.required).toContain('passedTests');
            expect(schema.required).toContain('failedTests');
            expect(schema.required).toContain('testResults');
            expect(schema.required).toContain('summary');
            expect(schema.required).toContain('validatedAt');
            expect(schema.required).toContain('duration');
        });
    });

    describe('Basic Validation', () => {
        it('should validate complete validation result', () => {
            const validate = ajv.compile(schema);
            const validResult = {
                totalTests: 10,
                passedTests: 8,
                failedTests: 2,
                testResults: [
                    {
                        filePath: '/path/to/test.spec.ts',
                        testTitle: 'Test 1',
                        passed: true,
                        issues: [],
                        errorCount: 0,
                        warningCount: 0,
                        infoCount: 0,
                    },
                ],
                summary: {
                    totalErrors: 2,
                    totalWarnings: 5,
                    totalInfo: 3,
                    passRate: 80,
                    commonIssueCategory: 'documentation',
                    problemFiles: ['/path/to/test.spec.ts'],
                },
                validatedAt: '2025-11-02T12:00:00Z',
                duration: 1500,
            };

            const valid = validate(validResult);
            if (!valid) {
                console.error('Validation errors:', validate.errors);
            }
            expect(valid).toBe(true);
        });

        it('should enforce non-negative test counts', () => {
            const validate = ajv.compile(schema);
            const invalidResult = {
                totalTests: -1, // Invalid
                passedTests: 0,
                failedTests: 0,
                testResults: [],
                summary: {
                    totalErrors: 0,
                    totalWarnings: 0,
                    totalInfo: 0,
                    passRate: 0,
                    problemFiles: [],
                },
                validatedAt: '2025-11-02T12:00:00Z',
                duration: 0,
            };

            const valid = validate(invalidResult);
            expect(valid).toBe(false);
        });
    });

    describe('Validation Issue Format', () => {
        it('should validate complete issue structure', () => {
            const validate = ajv.compile(schema);
            const validResult = {
                totalTests: 1,
                passedTests: 0,
                failedTests: 1,
                testResults: [
                    {
                        filePath: '/path/to/test.spec.ts',
                        testTitle: 'Test 1',
                        passed: false,
                        issues: [
                            {
                                severity: 'error',
                                category: 'documentation',
                                message: 'Missing @objective tag',
                                suggestedFix: 'Add @objective JSDoc tag',
                                filePath: '/path/to/test.spec.ts',
                                lineNumber: 10,
                                errorCode: 'VAL_001',
                            },
                        ],
                        errorCount: 1,
                        warningCount: 0,
                        infoCount: 0,
                    },
                ],
                summary: {
                    totalErrors: 1,
                    totalWarnings: 0,
                    totalInfo: 0,
                    passRate: 0,
                    commonIssueCategory: 'documentation',
                    problemFiles: ['/path/to/test.spec.ts'],
                },
                validatedAt: '2025-11-02T12:00:00Z',
                duration: 500,
            };

            const valid = validate(validResult);
            if (!valid) {
                console.error('Validation errors:', validate.errors);
            }
            expect(valid).toBe(true);
        });

        it('should require essential issue fields', () => {
            const validate = ajv.compile(schema);
            const invalidResult = {
                totalTests: 1,
                passedTests: 0,
                failedTests: 1,
                testResults: [
                    {
                        filePath: '/path/to/test.spec.ts',
                        testTitle: 'Test 1',
                        passed: false,
                        issues: [
                            {
                                severity: 'error',
                                // Missing required fields
                            },
                        ],
                        errorCount: 1,
                        warningCount: 0,
                        infoCount: 0,
                    },
                ],
                summary: {
                    totalErrors: 1,
                    totalWarnings: 0,
                    totalInfo: 0,
                    passRate: 0,
                    problemFiles: [],
                },
                validatedAt: '2025-11-02T12:00:00Z',
                duration: 500,
            };

            const valid = validate(invalidResult);
            expect(valid).toBe(false);
        });

        it('should validate severity enum values', () => {
            const validate = ajv.compile(schema);
            const severities: ValidationSeverity[] = [
                ValidationSeverity.Error,
                ValidationSeverity.Warning,
                ValidationSeverity.Info,
            ];

            for (const severity of severities) {
                const result = {
                    totalTests: 1,
                    passedTests: 1,
                    failedTests: 0,
                    testResults: [
                        {
                            filePath: '/path/to/test.spec.ts',
                            testTitle: 'Test 1',
                            passed: true,
                            issues: [
                                {
                                    severity,
                                    category: 'documentation',
                                    message: 'Test message',
                                    filePath: '/path/to/test.spec.ts',
                                    errorCode: 'VAL_001',
                                },
                            ],
                            errorCount: 0,
                            warningCount: 0,
                            infoCount: 1,
                        },
                    ],
                    summary: {
                        totalErrors: 0,
                        totalWarnings: 0,
                        totalInfo: 1,
                        passRate: 100,
                        problemFiles: [],
                    },
                    validatedAt: '2025-11-02T12:00:00Z',
                    duration: 500,
                };

                const valid = validate(result);
                expect(valid).toBe(true);
            }
        });

        it('should validate category enum values', () => {
            const validate = ajv.compile(schema);
            const categories: ValidationCategory[] = [
                ValidationCategory.Documentation,
                ValidationCategory.ActionSteps,
                ValidationCategory.VerificationSteps,
                ValidationCategory.TestCaseId,
                ValidationCategory.TestTitle,
                ValidationCategory.Syntax,
            ];

            for (const category of categories) {
                const result = {
                    totalTests: 1,
                    passedTests: 1,
                    failedTests: 0,
                    testResults: [
                        {
                            filePath: '/path/to/test.spec.ts',
                            testTitle: 'Test 1',
                            passed: true,
                            issues: [
                                {
                                    severity: 'info',
                                    category,
                                    message: 'Test message',
                                    filePath: '/path/to/test.spec.ts',
                                    errorCode: 'VAL_001',
                                },
                            ],
                            errorCount: 0,
                            warningCount: 0,
                            infoCount: 1,
                        },
                    ],
                    summary: {
                        totalErrors: 0,
                        totalWarnings: 0,
                        totalInfo: 1,
                        passRate: 100,
                        problemFiles: [],
                    },
                    validatedAt: '2025-11-02T12:00:00Z',
                    duration: 500,
                };

                const valid = validate(result);
                expect(valid).toBe(true);
            }
        });

        it('should validate error code format (XXX_###)', () => {
            const validate = ajv.compile(schema);
            const validCodes = ['VAL_001', 'ERR_123', 'WRN_999'];

            for (const errorCode of validCodes) {
                const result = {
                    totalTests: 1,
                    passedTests: 1,
                    failedTests: 0,
                    testResults: [
                        {
                            filePath: '/path/to/test.spec.ts',
                            testTitle: 'Test 1',
                            passed: true,
                            issues: [
                                {
                                    severity: 'info',
                                    category: 'documentation',
                                    message: 'Test message',
                                    filePath: '/path/to/test.spec.ts',
                                    errorCode,
                                },
                            ],
                            errorCount: 0,
                            warningCount: 0,
                            infoCount: 1,
                        },
                    ],
                    summary: {
                        totalErrors: 0,
                        totalWarnings: 0,
                        totalInfo: 1,
                        passRate: 100,
                        problemFiles: [],
                    },
                    validatedAt: '2025-11-02T12:00:00Z',
                    duration: 500,
                };

                const valid = validate(result);
                expect(valid).toBe(true);
            }
        });

        it('should reject invalid error code formats', () => {
            const validate = ajv.compile(schema);
            const invalidCodes = ['VAL001', 'VAL-001', 'val_001', 'VAL_01'];

            for (const errorCode of invalidCodes) {
                const result = {
                    totalTests: 1,
                    passedTests: 1,
                    failedTests: 0,
                    testResults: [
                        {
                            filePath: '/path/to/test.spec.ts',
                            testTitle: 'Test 1',
                            passed: true,
                            issues: [
                                {
                                    severity: 'info',
                                    category: 'documentation',
                                    message: 'Test message',
                                    filePath: '/path/to/test.spec.ts',
                                    errorCode,
                                },
                            ],
                            errorCount: 0,
                            warningCount: 0,
                            infoCount: 1,
                        },
                    ],
                    summary: {
                        totalErrors: 0,
                        totalWarnings: 0,
                        totalInfo: 1,
                        passRate: 100,
                        problemFiles: [],
                    },
                    validatedAt: '2025-11-02T12:00:00Z',
                    duration: 500,
                };

                const valid = validate(result);
                expect(valid).toBe(false);
            }
        });

        it('should validate line numbers are positive when present', () => {
            const validate = ajv.compile(schema);
            const invalidResult = {
                totalTests: 1,
                passedTests: 0,
                failedTests: 1,
                testResults: [
                    {
                        filePath: '/path/to/test.spec.ts',
                        testTitle: 'Test 1',
                        passed: false,
                        issues: [
                            {
                                severity: 'error',
                                category: 'documentation',
                                message: 'Error',
                                filePath: '/path/to/test.spec.ts',
                                lineNumber: 0, // Invalid (must be >= 1)
                                errorCode: 'VAL_001',
                            },
                        ],
                        errorCount: 1,
                        warningCount: 0,
                        infoCount: 0,
                    },
                ],
                summary: {
                    totalErrors: 1,
                    totalWarnings: 0,
                    totalInfo: 0,
                    passRate: 0,
                    problemFiles: [],
                },
                validatedAt: '2025-11-02T12:00:00Z',
                duration: 500,
            };

            const valid = validate(invalidResult);
            expect(valid).toBe(false);
        });
    });

    describe('Summary Validation', () => {
        it('should validate passRate range (0-100)', () => {
            const validate = ajv.compile(schema);
            const validRates = [0, 25, 50, 75, 100];

            for (const passRate of validRates) {
                const result = {
                    totalTests: 100,
                    passedTests: passRate,
                    failedTests: 100 - passRate,
                    testResults: [],
                    summary: {
                        totalErrors: 0,
                        totalWarnings: 0,
                        totalInfo: 0,
                        passRate,
                        problemFiles: [],
                    },
                    validatedAt: '2025-11-02T12:00:00Z',
                    duration: 1000,
                };

                const valid = validate(result);
                expect(valid).toBe(true);
            }
        });

        it('should reject passRate above 100', () => {
            const validate = ajv.compile(schema);
            const invalidResult = {
                totalTests: 100,
                passedTests: 100,
                failedTests: 0,
                testResults: [],
                summary: {
                    totalErrors: 0,
                    totalWarnings: 0,
                    totalInfo: 0,
                    passRate: 150, // Invalid
                    problemFiles: [],
                },
                validatedAt: '2025-11-02T12:00:00Z',
                duration: 1000,
            };

            const valid = validate(invalidResult);
            expect(valid).toBe(false);
        });

        it('should limit problemFiles to 5 items', () => {
            const validate = ajv.compile(schema);
            const invalidResult = {
                totalTests: 10,
                passedTests: 4,
                failedTests: 6,
                testResults: [],
                summary: {
                    totalErrors: 6,
                    totalWarnings: 0,
                    totalInfo: 0,
                    passRate: 40,
                    problemFiles: [
                        '/file1.ts',
                        '/file2.ts',
                        '/file3.ts',
                        '/file4.ts',
                        '/file5.ts',
                        '/file6.ts', // Exceeds max of 5
                    ],
                },
                validatedAt: '2025-11-02T12:00:00Z',
                duration: 1000,
            };

            const valid = validate(invalidResult);
            expect(valid).toBe(false);
        });
    });

    describe('Timestamp and Duration Validation', () => {
        it('should validate validatedAt as ISO 8601 date-time', () => {
            const validate = ajv.compile(schema);
            const validResult = {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                testResults: [],
                summary: {
                    totalErrors: 0,
                    totalWarnings: 0,
                    totalInfo: 0,
                    passRate: 0,
                    problemFiles: [],
                },
                validatedAt: '2025-11-02T14:30:45.123Z',
                duration: 500,
            };

            const valid = validate(validResult);
            expect(valid).toBe(true);
        });

        it('should enforce non-negative duration', () => {
            const validate = ajv.compile(schema);
            const invalidResult = {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                testResults: [],
                summary: {
                    totalErrors: 0,
                    totalWarnings: 0,
                    totalInfo: 0,
                    passRate: 0,
                    problemFiles: [],
                },
                validatedAt: '2025-11-02T12:00:00Z',
                duration: -100, // Invalid
            };

            const valid = validate(invalidResult);
            expect(valid).toBe(false);
        });
    });
});
