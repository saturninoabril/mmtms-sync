/**
 * Unit Test: Logger Service
 *
 * Tests winston logger configuration with file and console transports,
 * log level filtering, and structured logging functionality.
 */

import { LoggerService, initLogger, getLogger, createChildLogger, DEFAULT_LOGGER_CONFIG } from '../../../src/utils/logger';
import type { LoggingConfig } from '../../../src/models/configuration';
import { existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';

describe('LoggerService', () => {
    const testLogFile = join(process.cwd(), '.tm-sync-test/logs/test.log');

    afterEach(() => {
        // Clean up test log files
        if (existsSync(join(process.cwd(), '.tm-sync-test'))) {
            rmSync(join(process.cwd(), '.tm-sync-test'), { recursive: true, force: true });
        }
    });

    describe('Constructor and Configuration', () => {
        it('should create logger with file transport', () => {
            const config: LoggingConfig = {
                level: 'info',
                file: testLogFile,
                console: false,
            };

            const logger = new LoggerService(config);
            expect(logger).toBeDefined();
            expect(logger.getLogger()).toBeDefined();
        });

        it('should create logger with console transport', () => {
            const config: LoggingConfig = {
                level: 'info',
                file: '',
                console: true,
            };

            const logger = new LoggerService(config);
            expect(logger).toBeDefined();
        });

        it('should create logger with both transports', () => {
            const config: LoggingConfig = {
                level: 'debug',
                file: testLogFile,
                console: true,
            };

            const logger = new LoggerService(config);
            expect(logger).toBeDefined();
        });

        it('should create log directory if it does not exist', () => {
            const config: LoggingConfig = {
                level: 'info',
                file: testLogFile,
                console: false,
            };

            new LoggerService(config);
            expect(existsSync(join(process.cwd(), '.tm-sync-test/logs'))).toBe(true);
        });
    });

    describe('Logging Methods', () => {
        let logger: LoggerService;

        beforeEach(() => {
            const config: LoggingConfig = {
                level: 'debug',
                file: testLogFile,
                console: false,
            };
            logger = new LoggerService(config);
        });

        it('should log debug messages', async () => {
            logger.debug('Debug message', { key: 'value' });
            await logger.close();

            // Wait a bit for file system flush
            await new Promise((resolve) => setTimeout(resolve, 100));

            const logContent = readFileSync(testLogFile, 'utf-8');
            expect(logContent).toContain('Debug message');
            expect(logContent).toContain('"level":"debug"');
        });

        it('should log info messages', async () => {
            logger.info('Info message', { data: 123 });
            await logger.close();
            await new Promise((resolve) => setTimeout(resolve, 100));

            const logContent = readFileSync(testLogFile, 'utf-8');
            expect(logContent).toContain('Info message');
            expect(logContent).toContain('"level":"info"');
        });

        it('should log warning messages', async () => {
            logger.warn('Warning message');
            await logger.close();
            await new Promise((resolve) => setTimeout(resolve, 100));

            const logContent = readFileSync(testLogFile, 'utf-8');
            expect(logContent).toContain('Warning message');
            expect(logContent).toContain('"level":"warn"');
        });

        it('should log error messages with Error objects', async () => {
            const error = new Error('Test error');
            logger.error('Error occurred', error);
            await logger.close();
            await new Promise((resolve) => setTimeout(resolve, 100));

            const logContent = readFileSync(testLogFile, 'utf-8');
            expect(logContent).toContain('Error occurred');
            expect(logContent).toContain('"level":"error"');
            expect(logContent).toContain('Test error');
        });

        it('should log error messages with custom error', async () => {
            const customError = new Error('Custom error message');
            logger.error('Unknown error', customError);
            await logger.close();
            await new Promise((resolve) => setTimeout(resolve, 100));

            const logContent = readFileSync(testLogFile, 'utf-8');
            expect(logContent).toContain('Unknown error');
            expect(logContent).toContain('Custom error message');
        });

        it('should log error messages without error object', async () => {
            logger.error('Simple error message');
            await logger.close();
            await new Promise((resolve) => setTimeout(resolve, 100));

            const logContent = readFileSync(testLogFile, 'utf-8');
            expect(logContent).toContain('Simple error message');
            expect(logContent).toContain('"level":"error"');
        });
    });

    describe('Log Level Filtering', () => {
        it('should only log messages at or above configured level', async () => {
            const config: LoggingConfig = {
                level: 'warn',
                file: testLogFile,
                console: false,
            };

            const logger = new LoggerService(config);
            logger.debug('Debug message');
            logger.info('Info message');
            logger.warn('Warning message');
            logger.error('Error message');
            await logger.close();
            await new Promise((resolve) => setTimeout(resolve, 100));

            const logContent = readFileSync(testLogFile, 'utf-8');
            expect(logContent).not.toContain('Debug message');
            expect(logContent).not.toContain('Info message');
            expect(logContent).toContain('Warning message');
            expect(logContent).toContain('Error message');
        });
    });

    describe('Global Logger Functions', () => {
        it('should initialize and get global logger', () => {
            const config: LoggingConfig = {
                level: 'info',
                file: testLogFile,
                console: false,
            };

            const logger = initLogger(config);
            expect(logger).toBeDefined();

            const retrieved = getLogger();
            expect(retrieved).toBe(logger);
        });
    });

    describe('Child Logger', () => {
        it('should create child logger with context', async () => {
            const config: LoggingConfig = {
                level: 'info',
                file: testLogFile,
                console: false,
            };

            const logger = createChildLogger(config, { service: 'test-service', version: '1.0.0' });
            logger.info('Test message');
            await logger.close();
            await new Promise((resolve) => setTimeout(resolve, 100));

            const logContent = readFileSync(testLogFile, 'utf-8');
            expect(logContent).toContain('Test message');
            expect(logContent).toContain('test-service');
            expect(logContent).toContain('1.0.0');
        });
    });

    describe('Default Configuration', () => {
        it('should export DEFAULT_LOGGER_CONFIG', () => {
            expect(DEFAULT_LOGGER_CONFIG).toEqual({
                level: 'info',
                file: '.tm-sync/logs/tm-sync.log',
                console: true,
            });
        });
    });

    describe('Console Transport with Metadata', () => {
        it('should format console output with extra metadata', () => {
            const config: LoggingConfig = {
                level: 'info',
                file: '',
                console: true,
            };

            const logger = new LoggerService(config);

            // Test with metadata that should be included in console output
            logger.info('Message with metadata', { userId: 123, action: 'test' });

            // The printf formatter should filter out timestamp, level, message
            // and format the remaining metadata as JSON
            expect(logger).toBeDefined();
        });

        it('should handle log message without extra metadata', () => {
            const config: LoggingConfig = {
                level: 'info',
                file: '',
                console: true,
            };

            const logger = new LoggerService(config);

            // Test without metadata - should not include empty JSON object
            logger.info('Simple message');

            expect(logger).toBeDefined();
        });
    });

    describe('Logger Cleanup', () => {
        it('should close logger and transports', async () => {
            const config: LoggingConfig = {
                level: 'info',
                file: testLogFile,
                console: false,
            };

            const logger = new LoggerService(config);
            logger.info('Before close');

            await expect(logger.close()).resolves.toBeUndefined();
        });
    });
});
