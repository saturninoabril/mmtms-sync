/**
 * Configuration Model
 *
 * Represents the tm-sync configuration loaded from tm-sync.config.json.
 * Provides type-safe access to all configuration options with defaults.
 */

import type { ConflictResolution } from './test-case-mapping.js';

/**
 * TMS (Test Management System) configuration
 */
export interface TMSConfig {
    /** TMS type (currently only 'zephyr-scale' supported) */
    type: 'zephyr-scale';

    /** TMS API base URL */
    baseUrl: string;

    /** API authentication token (from environment variable) */
    apiToken: string;

    /** Project key (e.g., 'MM' for Mattermost) */
    projectKey: string;

    /** API request timeout in milliseconds */
    timeout: number;

    /** Number of retry attempts for failed requests */
    retryAttempts: number;

    /** Delay between retries in milliseconds */
    retryDelay: number;
}

/**
 * Test file patterns configuration
 */
export interface TestFilesConfig {
    /** Glob patterns for test files */
    patterns: string[];

    /** Glob patterns to exclude */
    exclude: string[];
}

/**
 * Mapping file storage configuration
 */
export interface MappingsConfig {
    /** Directory to store mapping files */
    directory: string;

    /** Mapping file name template */
    fileName: string;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
    /** Whether caching is enabled */
    enabled: boolean;

    /** Cache directory */
    directory: string;

    /** Cache TTL in milliseconds */
    ttl: number;
}

/**
 * Validation rules configuration
 */
export interface ValidationConfig {
    /** Required JSDoc tags */
    requiredTags: string[];

    /** Optional JSDoc tags */
    optionalTags: string[];

    /** Enforce action comments (// #) */
    enforceActionComments: boolean;

    /** Enforce verification comments (// *) */
    enforceVerificationComments: boolean;

    /** Project key for test case ID validation (e.g., 'MM' for MM-T##### format) */
    projectKey?: string;
}

/**
 * Sync behavior configuration
 */
export interface SyncConfig {
    /** Batch size for bulk operations */
    batchSize: number;

    /** Delay between batches in milliseconds (rate limiting) */
    rateLimitDelay: number;

    /** Auto-create missing test cases */
    createMissingCases: boolean;

    /** Auto-update existing test cases */
    updateExistingCases: boolean;

    /** Conflict resolution strategy */
    conflictResolution: ConflictResolution;
}

/**
 * Reporting configuration
 */
export interface ReportingConfig {
    /** Output directory for reports */
    outputDir: string;

    /** Report formats to generate */
    formats: Array<'html' | 'json' | 'markdown'>;

    /** Include metrics in reports */
    includeMetrics: boolean;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
    /** Log level */
    level: 'debug' | 'info' | 'warn' | 'error';

    /** Log file path */
    file: string;

    /** Also log to console */
    console: boolean;
}

/**
 * Complete tm-sync configuration
 */
export interface Configuration {
    tms: TMSConfig;
    testFiles: TestFilesConfig;
    mappings: MappingsConfig;
    cache: CacheConfig;
    validation: ValidationConfig;
    sync: SyncConfig;
    reporting: ReportingConfig;
    logging: LoggingConfig;
}

/**
 * Partial configuration for overrides
 */
export type PartialConfiguration = Partial<{
    tms: Partial<TMSConfig>;
    testFiles: Partial<TestFilesConfig>;
    mappings: Partial<MappingsConfig>;
    cache: Partial<CacheConfig>;
    validation: Partial<ValidationConfig>;
    sync: Partial<SyncConfig>;
    reporting: Partial<ReportingConfig>;
    logging: Partial<LoggingConfig>;
}>;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Configuration = {
    tms: {
        type: 'zephyr-scale',
        baseUrl: 'https://api.zephyrscale.smartbear.com/v2',
        apiToken: process.env['ZEPHYR_API_TOKEN'] || '',
        projectKey: process.env['ZEPHYR_PROJECT_KEY'] || 'MM',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
    },
    testFiles: {
        patterns: ['**/*.spec.ts'],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/results/**',
            '**/logs/**',
            '**/storage_state/**',
            '**/playwright-report/**',
            '**/test-results/**',
            '**/*.tsbuildinfo',
        ],
    },
    mappings: {
        directory: '.tm-sync/mappings',
        fileName: '{testFilePath}.mapping.json',
    },
    cache: {
        enabled: true,
        directory: '.tm-sync/cache',
        ttl: 3600000, // 1 hour
    },
    validation: {
        requiredTags: ['@objective'],
        optionalTags: ['@precondition', '@known_issue'],
        enforceActionComments: true,
        enforceVerificationComments: true,
        projectKey: 'MM', // Default to Mattermost project key
    },
    sync: {
        batchSize: 10,
        rateLimitDelay: 500,
        createMissingCases: true,
        updateExistingCases: true,
        conflictResolution: 'prompt' as ConflictResolution,
    },
    reporting: {
        outputDir: '.tm-sync/reports',
        formats: ['html', 'json', 'markdown'],
        includeMetrics: true,
    },
    logging: {
        level: 'info',
        file: '.tm-sync/logs/tm-sync.log',
        console: true,
    },
};

/**
 * Merge partial configuration with defaults
 */
export function mergeConfig(partial: PartialConfiguration): Configuration {
    return {
        tms: { ...DEFAULT_CONFIG.tms, ...partial.tms },
        testFiles: { ...DEFAULT_CONFIG.testFiles, ...partial.testFiles },
        mappings: { ...DEFAULT_CONFIG.mappings, ...partial.mappings },
        cache: { ...DEFAULT_CONFIG.cache, ...partial.cache },
        validation: { ...DEFAULT_CONFIG.validation, ...partial.validation },
        sync: { ...DEFAULT_CONFIG.sync, ...partial.sync },
        reporting: { ...DEFAULT_CONFIG.reporting, ...partial.reporting },
        logging: { ...DEFAULT_CONFIG.logging, ...partial.logging },
    };
}

/**
 * Validate configuration
 */
export function validateConfig(config: Configuration): string[] {
    const errors: string[] = [];

    // TMS validation
    if (!config.tms.apiToken) {
        errors.push('TMS API token is required (set ZEPHYR_API_TOKEN environment variable)');
    }
    if (!config.tms.projectKey) {
        errors.push('TMS project key is required');
    }

    // Test files validation
    if (config.testFiles.patterns.length === 0) {
        errors.push('At least one test file pattern is required');
    }

    // Batch size validation
    if (config.sync.batchSize < 1 || config.sync.batchSize > 100) {
        errors.push('Batch size must be between 1 and 100');
    }

    return errors;
}
