/**
 * Error Handler Utilities
 *
 * Custom error classes for different error scenarios in tm-sync.
 * Provides structured error information with error codes and context.
 */

/**
 * Base error class for all tm-sync errors
 */
export class TMSyncError extends Error {
    public readonly code: string;
    public readonly context: Record<string, unknown>;

    constructor(message: string, code: string, context: Record<string, unknown> = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.context = context;
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Convert error to JSON representation
     */
    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            context: this.context,
            stack: this.stack,
        };
    }
}

/**
 * Parser errors - thrown when parsing test files fails
 */
export class ParserError extends TMSyncError {
    constructor(
        message: string,
        public readonly filePath: string,
        public readonly lineNumber?: number
    ) {
        super(message, 'PARSER_ERROR', { filePath, lineNumber });
    }
}

/**
 * Validation errors - thrown when test documentation validation fails
 */
export class ValidationError extends TMSyncError {
    constructor(
        message: string,
        public readonly filePath: string,
        public readonly issues: Array<{ message: string; lineNumber?: number }>
    ) {
        super(message, 'VALIDATION_ERROR', { filePath, issues });
    }
}

/**
 * TMS API errors - thrown when TMS API requests fail
 */
export class TMSError extends TMSyncError {
    constructor(
        message: string,
        public readonly statusCode: number,
        public readonly endpoint: string,
        public readonly responseBody?: unknown
    ) {
        super(message, `TMS_ERROR_${statusCode}`, { endpoint, responseBody });
    }

    /**
     * Check if error is a rate limit error
     */
    isRateLimitError(): boolean {
        return this.statusCode === 429;
    }

    /**
     * Check if error is an authentication error
     */
    isAuthError(): boolean {
        return this.statusCode === 401 || this.statusCode === 403;
    }

    /**
     * Check if error is a not found error
     */
    isNotFoundError(): boolean {
        return this.statusCode === 404;
    }
}

/**
 * Configuration errors - thrown when configuration is invalid
 */
export class ConfigError extends TMSyncError {
    constructor(
        message: string,
        public readonly configPath?: string
    ) {
        super(message, 'CONFIG_ERROR', { configPath });
    }
}

/**
 * File system errors - thrown when file operations fail
 */
export class FileSystemError extends TMSyncError {
    constructor(
        message: string,
        public readonly operation: 'read' | 'write' | 'delete' | 'create',
        public readonly filePath: string
    ) {
        super(message, 'FILE_SYSTEM_ERROR', { operation, filePath });
    }
}

/**
 * Network errors - thrown when network requests fail
 */
export class NetworkError extends TMSyncError {
    public override readonly context: Record<string, unknown>;
    public readonly url: string;
    public override readonly cause?: Error;

    constructor(message: string, url: string, cause?: Error) {
        super(message, 'NETWORK_ERROR', { url, cause: cause?.message });
        this.url = url;
        this.cause = cause;
        this.context = { url, cause: cause?.message };
    }
}

/**
 * Conflict errors - thrown when sync conflicts are detected
 */
export class ConflictError extends TMSyncError {
    constructor(
        message: string,
        public readonly testCaseId: string,
        public readonly localChanges: string[],
        public readonly tmsChanges: string[]
    ) {
        super(message, 'CONFLICT_ERROR', { testCaseId, localChanges, tmsChanges });
    }
}

/**
 * Type guard to check if error is a TMSyncError
 */
export function isTMSyncError(error: unknown): error is TMSyncError {
    return error instanceof TMSyncError;
}

/**
 * Format error for display
 */
export function formatError(error: unknown): string {
    if (isTMSyncError(error)) {
        let message = `[${error.code}] ${error.message}`;

        if (error instanceof ParserError && error.lineNumber) {
            message += ` (line ${error.lineNumber})`;
        }

        if (error instanceof TMSError) {
            message += ` (HTTP ${error.statusCode})`;
        }

        return message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

/**
 * Extract error code from error
 */
export function getErrorCode(error: unknown): string {
    if (isTMSyncError(error)) {
        return error.code;
    }
    return 'UNKNOWN_ERROR';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
    if (error instanceof TMSError) {
        // Retry on 5xx errors and 429 (rate limit)
        return error.statusCode >= 500 || error.statusCode === 429;
    }

    if (error instanceof NetworkError) {
        return true;
    }

    return false;
}
