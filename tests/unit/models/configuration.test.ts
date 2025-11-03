/**
 * Unit Tests: Configuration
 *
 * Tests configuration merging and validation functions.
 */

import { DEFAULT_CONFIG, mergeConfig, validateConfig, type PartialConfiguration } from '../../../src/models/configuration';

describe('Configuration', () => {
    describe('DEFAULT_CONFIG', () => {
        it('should have valid default configuration', () => {
            expect(DEFAULT_CONFIG).toBeDefined();
            expect(DEFAULT_CONFIG.tms).toBeDefined();
            expect(DEFAULT_CONFIG.testFiles).toBeDefined();
            expect(DEFAULT_CONFIG.validation).toBeDefined();
            expect(DEFAULT_CONFIG.sync).toBeDefined();
            expect(DEFAULT_CONFIG.reporting).toBeDefined();
            expect(DEFAULT_CONFIG.logging).toBeDefined();
            expect(DEFAULT_CONFIG.cache).toBeDefined();
            expect(DEFAULT_CONFIG.mappings).toBeDefined();
        });

        it('should have TMS configuration', () => {
            expect(DEFAULT_CONFIG.tms.type).toBe('zephyr-scale');
            expect(DEFAULT_CONFIG.tms.baseUrl).toBe('https://api.zephyrscale.smartbear.com/v2');
            expect(DEFAULT_CONFIG.tms.timeout).toBe(30000);
            expect(DEFAULT_CONFIG.tms.retryAttempts).toBe(3);
        });

        it('should have test files configuration', () => {
            expect(DEFAULT_CONFIG.testFiles.patterns).toContain('**/*.spec.ts');
            expect(DEFAULT_CONFIG.testFiles.exclude).toContain('**/node_modules/**');
        });

        it('should have validation configuration', () => {
            expect(DEFAULT_CONFIG.validation.requiredTags).toContain('@objective');
            expect(DEFAULT_CONFIG.validation.enforceActionComments).toBe(true);
            expect(DEFAULT_CONFIG.validation.enforceVerificationComments).toBe(true);
        });

        it('should have sync configuration', () => {
            expect(DEFAULT_CONFIG.sync.batchSize).toBe(10);
            expect(DEFAULT_CONFIG.sync.createMissingCases).toBe(true);
            expect(DEFAULT_CONFIG.sync.updateExistingCases).toBe(true);
            expect(DEFAULT_CONFIG.sync.conflictResolution).toBe('prompt');
        });

        it('should have reporting configuration', () => {
            expect(DEFAULT_CONFIG.reporting.outputDir).toBe('.tm-sync/reports');
            expect(DEFAULT_CONFIG.reporting.formats).toContain('html');
            expect(DEFAULT_CONFIG.reporting.formats).toContain('json');
            expect(DEFAULT_CONFIG.reporting.includeMetrics).toBe(true);
        });

        it('should have logging configuration', () => {
            expect(DEFAULT_CONFIG.logging.level).toBe('info');
            expect(DEFAULT_CONFIG.logging.file).toBe('.tm-sync/logs/tm-sync.log');
            expect(DEFAULT_CONFIG.logging.console).toBe(true);
        });

        it('should have cache configuration', () => {
            expect(DEFAULT_CONFIG.cache.enabled).toBe(true);
            expect(DEFAULT_CONFIG.cache.ttl).toBe(3600000);
            expect(DEFAULT_CONFIG.cache.directory).toBe('.tm-sync/cache');
        });

        it('should have mappings configuration', () => {
            expect(DEFAULT_CONFIG.mappings.directory).toBe('.tm-sync/mappings');
            expect(DEFAULT_CONFIG.mappings.fileName).toBeDefined();
        });
    });

    describe('mergeConfig', () => {
        it('should return default config when no partial config provided', () => {
            const config = mergeConfig({});

            expect(config).toEqual(DEFAULT_CONFIG);
        });

        it('should merge TMS configuration', () => {
            const partial: PartialConfiguration = {
                tms: {
                    apiToken: 'test-token',
                    projectKey: 'TEST',
                },
            };

            const config = mergeConfig(partial);

            expect(config.tms.apiToken).toBe('test-token');
            expect(config.tms.projectKey).toBe('TEST');
            expect(config.tms.type).toBe(DEFAULT_CONFIG.tms.type);
            expect(config.tms.baseUrl).toBe(DEFAULT_CONFIG.tms.baseUrl);
        });

        it('should merge test files configuration', () => {
            const partial: PartialConfiguration = {
                testFiles: {
                    patterns: ['custom/**/*.test.ts'],
                },
            };

            const config = mergeConfig(partial);

            expect(config.testFiles.patterns).toEqual(['custom/**/*.test.ts']);
            expect(config.testFiles.exclude).toEqual(DEFAULT_CONFIG.testFiles.exclude);
        });

        it('should merge validation configuration', () => {
            const partial: PartialConfiguration = {
                validation: {
                    requireObjective: false,
                },
            };

            const config = mergeConfig(partial);

            expect(config.validation.requireObjective).toBe(false);
            expect(config.validation.enforceActionComments).toBe(DEFAULT_CONFIG.validation.enforceActionComments);
            expect(config.validation.enforceVerificationComments).toBe(
                DEFAULT_CONFIG.validation.enforceVerificationComments
            );
        });

        it('should merge sync configuration', () => {
            const partial: PartialConfiguration = {
                sync: {
                    batchSize: 20,
                    conflictResolution: 'local',
                },
            };

            const config = mergeConfig(partial);

            expect(config.sync.batchSize).toBe(20);
            expect(config.sync.conflictResolution).toBe('local');
            expect(config.sync.createMissingCases).toBe(DEFAULT_CONFIG.sync.createMissingCases);
        });

        it('should merge reporting configuration', () => {
            const partial: PartialConfiguration = {
                reporting: {
                    formats: ['json'],
                    includeMetrics: false,
                },
            };

            const config = mergeConfig(partial);

            expect(config.reporting.formats).toEqual(['json']);
            expect(config.reporting.includeMetrics).toBe(false);
            expect(config.reporting.outputDir).toBe(DEFAULT_CONFIG.reporting.outputDir);
        });

        it('should merge logging configuration', () => {
            const partial: PartialConfiguration = {
                logging: {
                    level: 'debug',
                    console: false,
                },
            };

            const config = mergeConfig(partial);

            expect(config.logging.level).toBe('debug');
            expect(config.logging.console).toBe(false);
            expect(config.logging.file).toBe(DEFAULT_CONFIG.logging.file);
        });

        it('should merge cache configuration', () => {
            const partial: PartialConfiguration = {
                cache: {
                    enabled: false,
                    ttl: 7200,
                },
            };

            const config = mergeConfig(partial);

            expect(config.cache.enabled).toBe(false);
            expect(config.cache.ttl).toBe(7200);
            expect(config.cache.directory).toBe(DEFAULT_CONFIG.cache.directory);
        });

        it('should merge mappings configuration', () => {
            const partial: PartialConfiguration = {
                mappings: {
                    directory: 'custom-mappings',
                },
            };

            const config = mergeConfig(partial);

            expect(config.mappings.directory).toBe('custom-mappings');
            expect(config.mappings.fileName).toBe(DEFAULT_CONFIG.mappings.fileName);
        });

        it('should merge multiple configuration sections', () => {
            const partial: PartialConfiguration = {
                tms: {
                    apiToken: 'token123',
                    projectKey: 'PROJ',
                },
                logging: {
                    level: 'error',
                },
                sync: {
                    batchSize: 50,
                },
            };

            const config = mergeConfig(partial);

            expect(config.tms.apiToken).toBe('token123');
            expect(config.tms.projectKey).toBe('PROJ');
            expect(config.logging.level).toBe('error');
            expect(config.sync.batchSize).toBe(50);
            expect(config.validation).toEqual(DEFAULT_CONFIG.validation);
        });
    });

    describe('validateConfig', () => {
        it('should return no errors for valid configuration with all required fields', () => {
            const config = mergeConfig({
                tms: {
                    apiToken: 'valid-token',
                    projectKey: 'VALID',
                },
            });

            const errors = validateConfig(config);

            expect(errors).toEqual([]);
        });

        it('should return error when TMS API token is missing', () => {
            const config = mergeConfig({
                tms: {
                    projectKey: 'VALID',
                },
            });

            const errors = validateConfig(config);

            expect(errors).toContain('TMS API token is required (set ZEPHYR_API_TOKEN environment variable)');
        });

        it('should return error when TMS project key is explicitly empty', () => {
            const config = mergeConfig({
                tms: {
                    apiToken: 'valid-token',
                    projectKey: '',
                },
            });

            const errors = validateConfig(config);

            expect(errors).toContain('TMS project key is required');
        });

        it('should return error when TMS API token is missing', () => {
            const config = mergeConfig({
                tms: {
                    apiToken: '',
                    projectKey: 'KEY',
                },
            });

            const errors = validateConfig(config);

            expect(errors).toContain('TMS API token is required (set ZEPHYR_API_TOKEN environment variable)');
        });

        it('should return error when test file patterns are empty', () => {
            const config = mergeConfig({
                tms: {
                    apiToken: 'token',
                    projectKey: 'KEY',
                },
                testFiles: {
                    patterns: [],
                },
            });

            const errors = validateConfig(config);

            expect(errors).toContain('At least one test file pattern is required');
        });

        it('should return error when batch size is too small', () => {
            const config = mergeConfig({
                tms: {
                    apiToken: 'token',
                    projectKey: 'KEY',
                },
                sync: {
                    batchSize: 0,
                },
            });

            const errors = validateConfig(config);

            expect(errors).toContain('Batch size must be between 1 and 100');
        });

        it('should return error when batch size is too large', () => {
            const config = mergeConfig({
                tms: {
                    apiToken: 'token',
                    projectKey: 'KEY',
                },
                sync: {
                    batchSize: 101,
                },
            });

            const errors = validateConfig(config);

            expect(errors).toContain('Batch size must be between 1 and 100');
        });

        it('should accept batch size at minimum boundary (1)', () => {
            const config = mergeConfig({
                tms: {
                    apiToken: 'token',
                    projectKey: 'KEY',
                },
                sync: {
                    batchSize: 1,
                },
            });

            const errors = validateConfig(config);

            expect(errors).not.toContain('Batch size must be between 1 and 100');
        });

        it('should accept batch size at maximum boundary (100)', () => {
            const config = mergeConfig({
                tms: {
                    apiToken: 'token',
                    projectKey: 'KEY',
                },
                sync: {
                    batchSize: 100,
                },
            });

            const errors = validateConfig(config);

            expect(errors).not.toContain('Batch size must be between 1 and 100');
        });

        it('should return all validation errors when multiple issues exist', () => {
            const config = mergeConfig({
                tms: {
                    apiToken: '',
                    projectKey: '',
                },
                testFiles: {
                    patterns: [],
                },
                sync: {
                    batchSize: 0,
                },
            });

            const errors = validateConfig(config);

            expect(errors.length).toBeGreaterThanOrEqual(4);
            expect(errors).toContain('TMS API token is required (set ZEPHYR_API_TOKEN environment variable)');
            expect(errors).toContain('TMS project key is required');
            expect(errors).toContain('At least one test file pattern is required');
            expect(errors).toContain('Batch size must be between 1 and 100');
        });

        it('should validate with partial configuration merged with defaults', () => {
            const config = mergeConfig({
                tms: {
                    apiToken: 'token',
                    projectKey: 'KEY',
                },
            });

            const errors = validateConfig(config);

            // Should not have errors for testFiles.patterns since it comes from defaults
            expect(errors).not.toContain('At least one test file pattern is required');
            // Should not have errors for batch size since it comes from defaults
            expect(errors).not.toContain('Batch size must be between 1 and 100');
        });
    });
});
