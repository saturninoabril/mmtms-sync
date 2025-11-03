/**
 * Logger Utility
 *
 * Provides structured logging with winston using file and console transports.
 * Supports multiple log levels and configurable output formats.
 */

import winston from 'winston';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { LoggingConfig } from '../models/configuration.js';

/**
 * Logger service class providing structured logging capabilities
 */
export class LoggerService {
    private logger: winston.Logger;

    constructor(config: LoggingConfig) {
        this.ensureLogDirectory(config);
        const transports = this.createTransports(config);

        // Create logger instance
        this.logger = winston.createLogger({
            level: config.level,
            transports,
            exitOnError: false,
        });
    }

    /**
     * Ensure log directory exists
     */
    private ensureLogDirectory(config: LoggingConfig): void {
        if (config.file) {
            const logDir = dirname(config.file);
            if (!existsSync(logDir)) {
                mkdirSync(logDir, { recursive: true });
            }
        }
    }

    /**
     * Create transports based on configuration
     */
    private createTransports(config: LoggingConfig): winston.transport[] {
        const transports: winston.transport[] = [];

        // File transport
        if (config.file) {
            transports.push(this.createFileTransport(config));
        }

        // Console transport
        if (config.console) {
            transports.push(this.createConsoleTransport(config));
        }

        return transports;
    }

    /**
     * Create file transport
     */
    private createFileTransport(config: LoggingConfig): winston.transport {
        return new winston.transports.File({
            filename: config.file,
            level: config.level,
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.splat(),
                winston.format.json()
            ),
        });
    }

    /**
     * Create console transport
     */
    private createConsoleTransport(config: LoggingConfig): winston.transport {
        return new winston.transports.Console({
            level: config.level,
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.splat(),
                winston.format.printf((info) => {
                    const metaStr = Object.keys(info).filter((k) => !['timestamp', 'level', 'message'].includes(k))
                        .length
                        ? JSON.stringify(
                              Object.fromEntries(
                                  Object.entries(info).filter(([k]) => !['timestamp', 'level', 'message'].includes(k))
                              ),
                              null,
                              2
                          )
                        : '';
                    return `${info['timestamp'] as string} [${String(info['level'])}]: ${String(info['message'])} ${metaStr}`;
                })
            ),
        });
    }

    /**
     * Log debug message
     */
    debug(message: string, meta?: Record<string, unknown>): void {
        this.logger.debug(message, meta);
    }

    /**
     * Log info message
     */
    info(message: string, meta?: Record<string, unknown>): void {
        this.logger.info(message, meta);
    }

    /**
     * Log warning message
     */
    warn(message: string, meta?: Record<string, unknown>): void {
        this.logger.warn(message, meta);
    }

    /**
     * Log error message
     */
    error(message: string, error?: Error, meta?: Record<string, unknown>): void {
        if (error) {
            this.logger.error(message, {
                error: error.message,
                stack: error.stack,
                ...meta,
            });
        } else {
            this.logger.error(message, meta);
        }
    }

    /**
     * Get underlying winston logger instance
     */
    getLogger(): winston.Logger {
        return this.logger;
    }

    /**
     * Close all transports and wait for pending writes
     */
    close(): Promise<void> {
        return new Promise((resolve) => {
            // Wait for all transports to finish writing
            this.logger.on('finish', () => {
                resolve();
            });
            this.logger.end();
        });
    }
}

/**
 * Global logger instance
 */
let globalLogger: LoggerService | null = null;

/**
 * Initialize global logger with configuration
 */
export function initLogger(config: LoggingConfig): LoggerService {
    globalLogger = new LoggerService(config);
    return globalLogger;
}

/**
 * Get global logger instance
 * @throws Error if logger not initialized
 */
export function getLogger(): LoggerService {
    if (!globalLogger) {
        throw new Error('Logger not initialized. Call initLogger() first.');
    }
    return globalLogger;
}

/**
 * Create a child logger with context metadata
 */
export function createChildLogger(config: LoggingConfig, context: Record<string, unknown>): LoggerService {
    const logger = new LoggerService(config);
    const originalLogger = logger.getLogger();

    // Add context to all log entries
    const childLogger = originalLogger.child(context);

    // Replace the logger instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (logger as any).logger = childLogger;

    return logger;
}

/**
 * Default logger configuration for quick setup
 */
export const DEFAULT_LOGGER_CONFIG: LoggingConfig = {
    level: 'info',
    file: '.tm-sync/logs/tm-sync.log',
    console: true,
};
