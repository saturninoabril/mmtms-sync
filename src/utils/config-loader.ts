/**
 * Configuration Loader
 *
 * Loads and validates tm-sync configuration from various sources:
 * - tm-sync.config.json
 * - tm-sync.config.js
 * - package.json (tmSync field)
 * - Environment variables
 */

import { cosmiconfigSync } from 'cosmiconfig';
import {
    type Configuration,
    DEFAULT_CONFIG,
    mergeConfig,
    type PartialConfiguration,
    validateConfig,
} from '../models/configuration.js';
import { ConfigError } from './error-handler.js';

/**
 * Configuration loader options
 */
export interface ConfigLoaderOptions {
    /** Starting directory for config search */
    searchFrom?: string;

    /** Config file path (skip search if provided) */
    configPath?: string;

    /** Additional config overrides */
    overrides?: PartialConfiguration;
}

/**
 * Load configuration from file system
 */
export function loadConfig(options: ConfigLoaderOptions = {}): Configuration {
    const { searchFrom, configPath, overrides } = options;

    try {
        // Initialize cosmiconfig explorer
        const explorer = cosmiconfigSync('tm-sync', {
            searchPlaces: [
                'tm-sync.config.json',
                'tm-sync.config.js',
                'tm-sync.config.cjs',
                '.tm-sync.json',
                '.tm-syncrc',
                '.tm-syncrc.json',
                'package.json',
            ],
            packageProp: 'tmSync',
        });

        // Load config
        let result;
        if (configPath) {
            // Load from specific path
            result = explorer.load(configPath);
        } else {
            // Search for config file
            result = explorer.search(searchFrom);
        }

        // Start with default config
        let config: PartialConfiguration = {};

        // Merge with loaded config if found
        if (result && result.config) {
            config = result.config as PartialConfiguration;
        }

        // Merge with overrides
        if (overrides) {
            config = deepMerge(config, overrides);
        }

        // Merge with environment variables
        const envConfig = loadEnvironmentVariables();
        config = deepMerge(config, envConfig);

        // Merge with defaults
        const fullConfig = mergeConfig(config);

        // Validate configuration
        const errors = validateConfig(fullConfig);
        if (errors.length > 0) {
            throw new ConfigError(`Configuration validation failed:\n${errors.join('\n')}`);
        }

        return fullConfig;
    } catch (error) {
        if (error instanceof ConfigError) {
            throw error;
        }

        throw new ConfigError(`Failed to load configuration: ${(error as Error).message}`, configPath);
    }
}

/**
 * Load configuration from environment variables
 */
function loadEnvironmentVariables(): PartialConfiguration {
    const config: PartialConfiguration = {};

    // TMS configuration from environment
    if (process.env['ZEPHYR_API_TOKEN'] || process.env['ZEPHYR_PROJECT_KEY']) {
        config.tms = {
            apiToken: process.env['ZEPHYR_API_TOKEN'],
            projectKey: process.env['ZEPHYR_PROJECT_KEY'],
        };
    }

    if (process.env['ZEPHYR_BASE_URL']) {
        config.tms = {
            ...config.tms,
            baseUrl: process.env['ZEPHYR_BASE_URL'],
        };
    }

    // Logging level from environment
    if (process.env['TM_SYNC_LOG_LEVEL']) {
        const level = process.env['TM_SYNC_LOG_LEVEL'].toLowerCase();
        if (['debug', 'info', 'warn', 'error'].includes(level)) {
            config.logging = {
                level: level as 'debug' | 'info' | 'warn' | 'error',
            };
        }
    }

    // Cache enabled from environment
    if (process.env['TM_SYNC_CACHE_ENABLED'] !== undefined) {
        config.cache = {
            enabled: process.env['TM_SYNC_CACHE_ENABLED'] === 'true',
        };
    }

    return config;
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): Configuration {
    return DEFAULT_CONFIG;
}

/**
 * Validate configuration without loading from file
 */
export function validateConfiguration(config: Configuration): string[] {
    return validateConfig(config);
}

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const sourceValue = source[key];
            const targetValue = result[key];

            if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
                result[key] = deepMerge(
                    targetValue as Record<string, unknown>,
                    sourceValue as Record<string, unknown>
                ) as T[Extract<keyof T, string>];
            } else if (sourceValue !== undefined) {
                result[key] = sourceValue as T[Extract<keyof T, string>];
            }
        }
    }

    return result;
}

/**
 * Check if value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        Object.prototype.toString.call(value) === '[object Object]'
    );
}

/**
 * Create config file template
 */
export function createConfigTemplate(): string {
    return JSON.stringify(
        {
            $schema: './node_modules/tm-sync/config-schema.json',
            tms: {
                type: 'zephyr-scale',
                projectKey: 'MM',
            },
            testFiles: {
                patterns: ['e2e-tests/playwright/**/*.spec.ts'],
                exclude: ['**/node_modules/**', '**/*.skip.ts'],
            },
            validation: {
                requiredTags: ['@objective'],
                enforceActionComments: true,
                enforceVerificationComments: true,
            },
            sync: {
                batchSize: 10,
                createMissingCases: true,
                updateExistingCases: true,
                conflictResolution: 'prompt',
            },
            reporting: {
                outputDir: '.tm-sync/reports',
                formats: ['html', 'json'],
                includeMetrics: true,
            },
        },
        null,
        2
    );
}
