/**
 * Contract Test: Configuration Schema
 *
 * Validates that the tm-sync.config.json schema matches the Configuration interface
 * and enforces all required fields and validation rules.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Configuration, DEFAULT_CONFIG } from '../../src/models/configuration';

describe('config-schema.json Contract Tests', () => {
    let ajv: Ajv;
    let schema: any;

    beforeAll(() => {
        // Load JSON schema
        const schemaPath = join(__dirname, '../../src/contracts/config-schema.json');
        schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

        // Initialize AJV with format validators
        ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
    });

    describe('Schema Structure', () => {
        it('should have valid JSON Schema format', () => {
            expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
            expect(schema.title).toBe('TM-Sync Configuration Schema');
            expect(schema.type).toBe('object');
        });

        it('should require tms configuration', () => {
            expect(schema.required).toContain('tms');
        });
    });

    describe('TMS Configuration Validation', () => {
        it('should validate complete TMS configuration', () => {
            const validate = ajv.compile(schema);
            const validConfig = {
                tms: {
                    type: 'zephyr-scale',
                    baseUrl: 'https://api.zephyrscale.smartbear.com/v2',
                    apiToken: 'test-token',
                    projectKey: 'MM',
                },
            };

            const valid = validate(validConfig);
            expect(valid).toBe(true);
            expect(validate.errors).toBeNull();
        });

        it('should require type, baseUrl, and projectKey', () => {
            const validate = ajv.compile(schema);
            const invalidConfig = {
                tms: {
                    apiToken: 'test-token',
                },
            };

            const valid = validate(invalidConfig);
            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();
        });

        it('should only allow "zephyr-scale" as TMS type', () => {
            const validate = ajv.compile(schema);
            const invalidConfig = {
                tms: {
                    type: 'invalid-tms',
                    baseUrl: 'https://example.com',
                    projectKey: 'MM',
                },
            };

            const valid = validate(invalidConfig);
            expect(valid).toBe(false);
        });

        it('should validate baseUrl format as URI', () => {
            const validate = ajv.compile(schema);
            const invalidConfig = {
                tms: {
                    type: 'zephyr-scale',
                    baseUrl: 'not-a-valid-url',
                    projectKey: 'MM',
                },
            };

            const valid = validate(invalidConfig);
            expect(valid).toBe(false);
        });

        it('should validate projectKey pattern (uppercase letters only)', () => {
            const validate = ajv.compile(schema);
            const invalidConfig = {
                tms: {
                    type: 'zephyr-scale',
                    baseUrl: 'https://example.com',
                    projectKey: 'mm123', // lowercase and numbers
                },
            };

            const valid = validate(invalidConfig);
            expect(valid).toBe(false);
        });

        it('should validate timeout range (1000-300000ms)', () => {
            const validate = ajv.compile(schema);
            const invalidConfig = {
                tms: {
                    type: 'zephyr-scale',
                    baseUrl: 'https://example.com',
                    projectKey: 'MM',
                    timeout: 500, // Below minimum
                },
            };

            const valid = validate(invalidConfig);
            expect(valid).toBe(false);
        });

        it('should validate retryAttempts range (0-10)', () => {
            const validate = ajv.compile(schema);
            const invalidConfig = {
                tms: {
                    type: 'zephyr-scale',
                    baseUrl: 'https://example.com',
                    projectKey: 'MM',
                    retryAttempts: 15, // Above maximum
                },
            };

            const valid = validate(invalidConfig);
            expect(valid).toBe(false);
        });
    });

    describe('Test Files Configuration Validation', () => {
        it('should validate testFiles configuration', () => {
            const validate = ajv.compile(schema);
            const validConfig = {
                tms: {
                    type: 'zephyr-scale',
                    baseUrl: 'https://example.com',
                    projectKey: 'MM',
                },
                testFiles: {
                    patterns: ['**/*.spec.ts'],
                    exclude: ['**/node_modules/**'],
                },
            };

            const valid = validate(validConfig);
            expect(valid).toBe(true);
        });

        it('should require at least one pattern', () => {
            const validate = ajv.compile(schema);
            const invalidConfig = {
                tms: {
                    type: 'zephyr-scale',
                    baseUrl: 'https://example.com',
                    projectKey: 'MM',
                },
                testFiles: {
                    patterns: [], // Empty array
                },
            };

            const valid = validate(invalidConfig);
            expect(valid).toBe(false);
        });
    });

    describe('Sync Configuration Validation', () => {
        it('should validate sync configuration', () => {
            const validate = ajv.compile(schema);
            const validConfig = {
                tms: {
                    type: 'zephyr-scale',
                    baseUrl: 'https://example.com',
                    projectKey: 'MM',
                },
                sync: {
                    batchSize: 10,
                    rateLimitDelay: 500,
                    conflictResolution: 'prompt',
                },
            };

            const valid = validate(validConfig);
            expect(valid).toBe(true);
        });

        it('should validate batchSize range (1-100)', () => {
            const validate = ajv.compile(schema);
            const invalidConfig = {
                tms: {
                    type: 'zephyr-scale',
                    baseUrl: 'https://example.com',
                    projectKey: 'MM',
                },
                sync: {
                    batchSize: 150, // Above maximum
                },
            };

            const valid = validate(invalidConfig);
            expect(valid).toBe(false);
        });

        it('should validate conflictResolution enum values', () => {
            const validate = ajv.compile(schema);
            const invalidConfig = {
                tms: {
                    type: 'zephyr-scale',
                    baseUrl: 'https://example.com',
                    projectKey: 'MM',
                },
                sync: {
                    conflictResolution: 'invalid-strategy',
                },
            };

            const valid = validate(invalidConfig);
            expect(valid).toBe(false);
        });
    });

    describe('Default Configuration Compliance', () => {
        it('should validate DEFAULT_CONFIG against schema', () => {
            const validate = ajv.compile(schema);
            const valid = validate(DEFAULT_CONFIG);

            if (!valid) {
                console.error('Validation errors:', validate.errors);
            }

            expect(valid).toBe(true);
        });

        it('should have all required properties in DEFAULT_CONFIG', () => {
            expect(DEFAULT_CONFIG.tms).toBeDefined();
            expect(DEFAULT_CONFIG.tms.type).toBe('zephyr-scale');
            expect(DEFAULT_CONFIG.tms.baseUrl).toBeDefined();
            expect(DEFAULT_CONFIG.tms.projectKey).toBeDefined();
        });
    });

    describe('Logging Configuration Validation', () => {
        it('should validate logging level enum', () => {
            const validate = ajv.compile(schema);
            const validConfig = {
                tms: {
                    type: 'zephyr-scale',
                    baseUrl: 'https://example.com',
                    projectKey: 'MM',
                },
                logging: {
                    level: 'debug',
                },
            };

            const valid = validate(validConfig);
            expect(valid).toBe(true);
        });

        it('should reject invalid logging levels', () => {
            const validate = ajv.compile(schema);
            const invalidConfig = {
                tms: {
                    type: 'zephyr-scale',
                    baseUrl: 'https://example.com',
                    projectKey: 'MM',
                },
                logging: {
                    level: 'trace', // Not a valid level
                },
            };

            const valid = validate(invalidConfig);
            expect(valid).toBe(false);
        });
    });

    describe('Reporting Configuration Validation', () => {
        it('should validate report formats enum', () => {
            const validate = ajv.compile(schema);
            const validConfig = {
                tms: {
                    type: 'zephyr-scale',
                    baseUrl: 'https://example.com',
                    projectKey: 'MM',
                },
                reporting: {
                    formats: ['html', 'json', 'markdown'],
                },
            };

            const valid = validate(validConfig);
            expect(valid).toBe(true);
        });

        it('should reject invalid report formats', () => {
            const validate = ajv.compile(schema);
            const invalidConfig = {
                tms: {
                    type: 'zephyr-scale',
                    baseUrl: 'https://example.com',
                    projectKey: 'MM',
                },
                reporting: {
                    formats: ['pdf'], // Not a valid format
                },
            };

            const valid = validate(invalidConfig);
            expect(valid).toBe(false);
        });
    });
});
