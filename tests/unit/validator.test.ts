/**
 * Unit Tests: Validator
 *
 * Tests validation rules for Playwright test documentation, ensuring proper
 * error detection and configurable rule enforcement.
 */

import { Validator } from '../../src/core/validator';
import type { ParsedTest } from '../../src/models/parsed-test';
import type { ValidationConfig } from '../../src/models/configuration';

describe('Validator', () => {
    let validator: Validator;
    const defaultConfig: ValidationConfig = {
        requiredTags: ['objective'],
        optionalTags: ['precondition', 'knownIssue'],
        enforceActionComments: true,
        enforceVerificationComments: true,
    };

    beforeEach(() => {
        validator = new Validator(defaultConfig);
    });

    // T052: Missing @objective (ERROR)
    describe('T052: Missing @objective validation', () => {
        it('should return ERROR when @objective is missing', () => {
            const test: ParsedTest = {
                title: 'MM-T123: Test without objective',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: {},
                actionSteps: [{ text: 'Do something', lineNumber: 10 }],
                verificationSteps: [{ text: 'Verify something', lineNumber: 11 }],
                lineNumber: 5,
            };

            const result = validator.validate(test);

            expect(result.isValid).toBe(false);
            const objectiveError = result.issues.find((i) => i.category === 'documentation');
            expect(objectiveError).toBeDefined();
            expect(objectiveError?.severity).toBe('error');
            expect(objectiveError?.message).toContain('objective');
        });

        it('should pass when @objective is present', () => {
            const test: ParsedTest = {
                title: 'MM-T123: Test with objective',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: { objective: 'Test user login functionality' },
                actionSteps: [{ text: 'Click login', lineNumber: 10 }],
                verificationSteps: [{ text: 'User logged in', lineNumber: 11 }],
                lineNumber: 5,
            };

            const result = validator.validate(test);
            const objectiveError = result.issues.find(
                (i) => i.category === 'documentation' && i.message.includes('objective')
            );
            expect(objectiveError).toBeUndefined();
        });
    });

    // T053: Missing action comments (ERROR)
    describe('T053: Missing action comments validation', () => {
        it('should return ERROR when action steps are missing', () => {
            const test: ParsedTest = {
                title: 'MM-T123: Test',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: { objective: 'Test something' },
                actionSteps: [],
                verificationSteps: [{ text: 'Verify something', lineNumber: 11 }],
                lineNumber: 5,
            };

            const result = validator.validate(test);

            expect(result.isValid).toBe(false);
            const actionError = result.issues.find((i) => i.category === 'action-steps');
            expect(actionError).toBeDefined();
            expect(actionError?.severity).toBe('error');
        });

        it('should pass when action steps are present', () => {
            const test: ParsedTest = {
                title: 'MM-T123: Test',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: { objective: 'Test something' },
                actionSteps: [{ text: 'Click button', lineNumber: 10 }],
                verificationSteps: [{ text: 'Verify result', lineNumber: 11 }],
                lineNumber: 5,
            };

            const result = validator.validate(test);
            const actionError = result.issues.find((i) => i.category === 'action-steps');
            expect(actionError).toBeUndefined();
        });
    });

    // T054: Missing verification comments (ERROR)
    describe('T054: Missing verification comments validation', () => {
        it('should return ERROR when verification steps are missing', () => {
            const test: ParsedTest = {
                title: 'MM-T123: Test',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: { objective: 'Test something' },
                actionSteps: [{ text: 'Click button', lineNumber: 10 }],
                verificationSteps: [],
                lineNumber: 5,
            };

            const result = validator.validate(test);

            expect(result.isValid).toBe(false);
            const verifyError = result.issues.find((i) => i.category === 'verification-steps');
            expect(verifyError).toBeDefined();
            expect(verifyError?.severity).toBe('error');
        });

        it('should pass when verification steps are present', () => {
            const test: ParsedTest = {
                title: 'MM-T123: Test',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: { objective: 'Test something' },
                actionSteps: [{ text: 'Click button', lineNumber: 10 }],
                verificationSteps: [{ text: 'Verify result', lineNumber: 11 }],
                lineNumber: 5,
            };

            const result = validator.validate(test);
            const verifyError = result.issues.find((i) => i.category === 'verification-steps');
            expect(verifyError).toBeUndefined();
        });
    });

    // T055: Invalid test case ID format (ERROR)
    describe('T055: Invalid test case ID format validation', () => {
        it('should return ERROR for invalid test case ID format', () => {
            const test: ParsedTest = {
                title: 'INVALID-123: Test',
                testCaseId: 'INVALID-123',
                type: 'test',
                jsdocTags: { objective: 'Test something' },
                actionSteps: [{ text: 'Click', lineNumber: 10 }],
                verificationSteps: [{ text: 'Verify', lineNumber: 11 }],
                lineNumber: 5,
            };

            const result = validator.validate(test);

            const idError = result.issues.find((i) => i.category === 'test-case-id');
            expect(idError).toBeDefined();
            expect(idError?.severity).toBe('error');
        });

        it('should pass for valid MM-T test case ID format', () => {
            const test: ParsedTest = {
                title: 'MM-T12345: Test',
                testCaseId: 'MM-T12345',
                type: 'test',
                jsdocTags: { objective: 'Test something' },
                actionSteps: [{ text: 'Click', lineNumber: 10 }],
                verificationSteps: [{ text: 'Verify', lineNumber: 11 }],
                lineNumber: 5,
            };

            const result = validator.validate(test);
            const idError = result.issues.find((i) => i.category === 'test-case-id');
            expect(idError).toBeUndefined();
        });

        it('should return ERROR for non-MM-T project prefixes', () => {
            const test: ParsedTest = {
                title: 'PROJ-T123: Test',
                testCaseId: 'PROJ-T123',
                type: 'test',
                jsdocTags: { objective: 'Test something' },
                actionSteps: [{ text: 'Click', lineNumber: 10 }],
                verificationSteps: [{ text: 'Verify', lineNumber: 11 }],
                lineNumber: 5,
            };

            const result = validator.validate(test);

            const idError = result.issues.find((i) => i.category === 'test-case-id');
            expect(idError).toBeDefined();
            expect(idError?.severity).toBe('error');
            expect(idError?.message).toContain('Invalid test case ID format');
            expect(idError?.suggestedFix).toContain('Use format MM-T####');
        });

        it('should return WARNING when test case ID is missing', () => {
            const test: ParsedTest = {
                title: 'Test without ID',
                testCaseId: undefined,
                type: 'test',
                jsdocTags: { objective: 'Test something' },
                actionSteps: [{ text: 'Click', lineNumber: 10 }],
                verificationSteps: [{ text: 'Verify', lineNumber: 11 }],
                lineNumber: 5,
            };

            const result = validator.validate(test);

            const idWarning = result.issues.find((i) => i.category === 'test-case-id');
            expect(idWarning).toBeDefined();
            expect(idWarning?.severity).toBe('warning');
            expect(idWarning?.message).toContain('will be assigned automatically');
        });
    });

    // T056: Invalid test title (WARNING)
    describe('T056: Invalid test title validation', () => {
        it('should return WARNING for very short test title', () => {
            const test: ParsedTest = {
                title: 'MM-T123: A',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: { objective: 'Test something' },
                actionSteps: [{ text: 'Click', lineNumber: 10 }],
                verificationSteps: [{ text: 'Verify', lineNumber: 11 }],
                lineNumber: 5,
            };

            const result = validator.validate(test);

            const titleWarning = result.issues.find((i) => i.category === 'test-title');
            expect(titleWarning).toBeDefined();
            expect(titleWarning?.severity).toBe('warning');
        });

        it('should pass for descriptive test title', () => {
            const test: ParsedTest = {
                title: 'MM-T123: User can successfully log in with valid credentials',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: { objective: 'Test login' },
                actionSteps: [{ text: 'Click', lineNumber: 10 }],
                verificationSteps: [{ text: 'Verify', lineNumber: 11 }],
                lineNumber: 5,
            };

            const result = validator.validate(test);
            const titleWarning = result.issues.find((i) => i.category === 'test-title');
            expect(titleWarning).toBeUndefined();
        });
    });

    // T057: Configurable rules - requireObjective=false
    describe('T057: Configurable validation rules', () => {
        it('should pass when requireObjective=false and @objective missing', () => {
            const config: ValidationConfig = {
                requiredTags: [], // No required tags
                optionalTags: ['objective', 'precondition'],
                enforceActionComments: true,
                enforceVerificationComments: true,
            };
            const customValidator = new Validator(config);

            const test: ParsedTest = {
                title: 'MM-T123: Test',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: {}, // No objective
                actionSteps: [{ text: 'Click', lineNumber: 10 }],
                verificationSteps: [{ text: 'Verify', lineNumber: 11 }],
                lineNumber: 5,
            };

            const result = customValidator.validate(test);
            const objectiveError = result.issues.find(
                (i) => i.category === 'documentation' && i.message.includes('objective')
            );
            expect(objectiveError).toBeUndefined();
        });

        it('should pass when enforceActionComments=false and no action steps', () => {
            const config: ValidationConfig = {
                requiredTags: ['objective'],
                optionalTags: [],
                enforceActionComments: false,
                enforceVerificationComments: true,
            };
            const customValidator = new Validator(config);

            const test: ParsedTest = {
                title: 'MM-T123: Test',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: { objective: 'Test something' },
                actionSteps: [], // No action steps
                verificationSteps: [{ text: 'Verify', lineNumber: 11 }],
                lineNumber: 5,
            };

            const result = customValidator.validate(test);
            const actionError = result.issues.find((i) => i.category === 'action-steps');
            expect(actionError).toBeUndefined();
        });

        it('should pass when enforceVerificationComments=false and no verification steps', () => {
            const config: ValidationConfig = {
                requiredTags: ['objective'],
                optionalTags: [],
                enforceActionComments: true,
                enforceVerificationComments: false,
            };
            const customValidator = new Validator(config);

            const test: ParsedTest = {
                title: 'MM-T123: Test',
                testCaseId: 'MM-T123',
                type: 'test',
                jsdocTags: { objective: 'Test something' },
                actionSteps: [{ text: 'Click', lineNumber: 10 }],
                verificationSteps: [], // No verification steps
                lineNumber: 5,
            };

            const result = customValidator.validate(test);
            const verifyError = result.issues.find((i) => i.category === 'verification-steps');
            expect(verifyError).toBeUndefined();
        });
    });
});
