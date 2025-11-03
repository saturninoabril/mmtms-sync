/**
 * Unit Tests: Error Handler
 *
 * Tests custom error classes and error utility functions.
 */

import {
    TMSyncError,
    ParserError,
    ValidationError,
    TMSError,
    ConfigError,
    FileSystemError,
    NetworkError,
    ConflictError,
    isTMSyncError,
    formatError,
    getErrorCode,
    isRetryableError,
} from '../../../src/utils/error-handler';

describe('Error Handler', () => {
    describe('TMSyncError', () => {
        it('should create error with code and context', () => {
            const error = new TMSyncError('Test error', 'TEST_ERROR', { foo: 'bar' });

            expect(error.message).toBe('Test error');
            expect(error.code).toBe('TEST_ERROR');
            expect(error.context).toEqual({ foo: 'bar' });
            expect(error.name).toBe('TMSyncError');
        });

        it('should create error without context', () => {
            const error = new TMSyncError('Test error', 'TEST_ERROR');

            expect(error.context).toEqual({});
        });

        it('should convert to JSON', () => {
            const error = new TMSyncError('Test error', 'TEST_ERROR', { foo: 'bar' });
            const json = error.toJSON();

            expect(json.name).toBe('TMSyncError');
            expect(json.message).toBe('Test error');
            expect(json.code).toBe('TEST_ERROR');
            expect(json.context).toEqual({ foo: 'bar' });
            expect(json.stack).toBeDefined();
        });
    });

    describe('ParserError', () => {
        it('should create parser error with file path', () => {
            const error = new ParserError('Failed to parse', '/path/to/file.spec.ts');

            expect(error.message).toBe('Failed to parse');
            expect(error.filePath).toBe('/path/to/file.spec.ts');
            expect(error.code).toBe('PARSER_ERROR');
            expect(error.context.filePath).toBe('/path/to/file.spec.ts');
        });

        it('should create parser error with line number', () => {
            const error = new ParserError('Failed to parse', '/path/to/file.spec.ts', 42);

            expect(error.lineNumber).toBe(42);
            expect(error.context.lineNumber).toBe(42);
        });

        it('should create parser error without line number', () => {
            const error = new ParserError('Failed to parse', '/path/to/file.spec.ts');

            expect(error.lineNumber).toBeUndefined();
        });
    });

    describe('ValidationError', () => {
        it('should create validation error with issues', () => {
            const issues = [
                { message: 'Missing @objective', lineNumber: 10 },
                { message: 'No action steps' },
            ];
            const error = new ValidationError('Validation failed', '/path/to/file.spec.ts', issues);

            expect(error.message).toBe('Validation failed');
            expect(error.filePath).toBe('/path/to/file.spec.ts');
            expect(error.issues).toEqual(issues);
            expect(error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('TMSError', () => {
        it('should create TMS error with status code', () => {
            const error = new TMSError('API request failed', 500, '/api/testcases');

            expect(error.message).toBe('API request failed');
            expect(error.statusCode).toBe(500);
            expect(error.endpoint).toBe('/api/testcases');
            expect(error.code).toBe('TMS_ERROR_500');
        });

        it('should create TMS error with response body', () => {
            const responseBody = { error: 'Internal server error' };
            const error = new TMSError('API request failed', 500, '/api/testcases', responseBody);

            expect(error.responseBody).toEqual(responseBody);
            expect(error.context.responseBody).toEqual(responseBody);
        });

        it('should detect rate limit error', () => {
            const error = new TMSError('Rate limited', 429, '/api/testcases');

            expect(error.isRateLimitError()).toBe(true);
            expect(error.isAuthError()).toBe(false);
            expect(error.isNotFoundError()).toBe(false);
        });

        it('should detect 401 authentication error', () => {
            const error = new TMSError('Unauthorized', 401, '/api/testcases');

            expect(error.isAuthError()).toBe(true);
            expect(error.isRateLimitError()).toBe(false);
            expect(error.isNotFoundError()).toBe(false);
        });

        it('should detect 403 authentication error', () => {
            const error = new TMSError('Forbidden', 403, '/api/testcases');

            expect(error.isAuthError()).toBe(true);
            expect(error.isRateLimitError()).toBe(false);
            expect(error.isNotFoundError()).toBe(false);
        });

        it('should detect not found error', () => {
            const error = new TMSError('Not found', 404, '/api/testcases/123');

            expect(error.isNotFoundError()).toBe(true);
            expect(error.isAuthError()).toBe(false);
            expect(error.isRateLimitError()).toBe(false);
        });
    });

    describe('ConfigError', () => {
        it('should create config error with path', () => {
            const error = new ConfigError('Invalid configuration', '/path/to/config.json');

            expect(error.message).toBe('Invalid configuration');
            expect(error.configPath).toBe('/path/to/config.json');
            expect(error.code).toBe('CONFIG_ERROR');
        });

        it('should create config error without path', () => {
            const error = new ConfigError('Invalid configuration');

            expect(error.configPath).toBeUndefined();
        });
    });

    describe('FileSystemError', () => {
        it('should create file system error for read operation', () => {
            const error = new FileSystemError('Failed to read file', 'read', '/path/to/file.txt');

            expect(error.message).toBe('Failed to read file');
            expect(error.operation).toBe('read');
            expect(error.filePath).toBe('/path/to/file.txt');
            expect(error.code).toBe('FILE_SYSTEM_ERROR');
        });

        it('should create file system error for write operation', () => {
            const error = new FileSystemError('Failed to write file', 'write', '/path/to/file.txt');

            expect(error.operation).toBe('write');
        });

        it('should create file system error for delete operation', () => {
            const error = new FileSystemError('Failed to delete file', 'delete', '/path/to/file.txt');

            expect(error.operation).toBe('delete');
        });

        it('should create file system error for create operation', () => {
            const error = new FileSystemError('Failed to create file', 'create', '/path/to/file.txt');

            expect(error.operation).toBe('create');
        });
    });

    describe('NetworkError', () => {
        it('should create network error with URL', () => {
            const error = new NetworkError('Connection failed', 'https://api.example.com');

            expect(error.message).toBe('Connection failed');
            expect(error.url).toBe('https://api.example.com');
            expect(error.code).toBe('NETWORK_ERROR');
            expect(error.context.url).toBe('https://api.example.com');
        });

        it('should create network error with cause', () => {
            const cause = new Error('ECONNREFUSED');
            const error = new NetworkError('Connection failed', 'https://api.example.com', cause);

            expect(error.cause).toBe(cause);
            expect(error.context.cause).toBe('ECONNREFUSED');
        });
    });

    describe('ConflictError', () => {
        it('should create conflict error', () => {
            const localChanges = ['Updated objective', 'Added action steps'];
            const tmsChanges = ['Updated description', 'Changed priority'];
            const error = new ConflictError('Sync conflict detected', 'MM-T12345', localChanges, tmsChanges);

            expect(error.message).toBe('Sync conflict detected');
            expect(error.testCaseId).toBe('MM-T12345');
            expect(error.localChanges).toEqual(localChanges);
            expect(error.tmsChanges).toEqual(tmsChanges);
            expect(error.code).toBe('CONFLICT_ERROR');
        });
    });

    describe('isTMSyncError', () => {
        it('should return true for TMSyncError instances', () => {
            const error = new TMSyncError('Test', 'TEST');

            expect(isTMSyncError(error)).toBe(true);
        });

        it('should return true for ParserError instances', () => {
            const error = new ParserError('Test', '/path/to/file');

            expect(isTMSyncError(error)).toBe(true);
        });

        it('should return false for regular Error', () => {
            const error = new Error('Test');

            expect(isTMSyncError(error)).toBe(false);
        });

        it('should return false for non-error values', () => {
            expect(isTMSyncError('string')).toBe(false);
            expect(isTMSyncError(null)).toBe(false);
            expect(isTMSyncError(undefined)).toBe(false);
            expect(isTMSyncError(123)).toBe(false);
        });
    });

    describe('formatError', () => {
        it('should format TMSyncError', () => {
            const error = new TMSyncError('Test error', 'TEST_ERROR');
            const formatted = formatError(error);

            expect(formatted).toBe('[TEST_ERROR] Test error');
        });

        it('should format ParserError with line number', () => {
            const error = new ParserError('Parse failed', '/path/to/file', 42);
            const formatted = formatError(error);

            expect(formatted).toBe('[PARSER_ERROR] Parse failed (line 42)');
        });

        it('should format ParserError without line number', () => {
            const error = new ParserError('Parse failed', '/path/to/file');
            const formatted = formatError(error);

            expect(formatted).toBe('[PARSER_ERROR] Parse failed');
        });

        it('should format TMSError with status code', () => {
            const error = new TMSError('API failed', 500, '/api/test');
            const formatted = formatError(error);

            expect(formatted).toBe('[TMS_ERROR_500] API failed (HTTP 500)');
        });

        it('should format regular Error', () => {
            const error = new Error('Regular error');
            const formatted = formatError(error);

            expect(formatted).toBe('Regular error');
        });

        it('should format non-error values', () => {
            expect(formatError('string error')).toBe('string error');
            expect(formatError(123)).toBe('123');
            expect(formatError(null)).toBe('null');
        });
    });

    describe('getErrorCode', () => {
        it('should return code for TMSyncError', () => {
            const error = new TMSyncError('Test', 'TEST_ERROR');

            expect(getErrorCode(error)).toBe('TEST_ERROR');
        });

        it('should return code for ParserError', () => {
            const error = new ParserError('Test', '/path');

            expect(getErrorCode(error)).toBe('PARSER_ERROR');
        });

        it('should return UNKNOWN_ERROR for regular Error', () => {
            const error = new Error('Test');

            expect(getErrorCode(error)).toBe('UNKNOWN_ERROR');
        });

        it('should return UNKNOWN_ERROR for non-error values', () => {
            expect(getErrorCode('string')).toBe('UNKNOWN_ERROR');
            expect(getErrorCode(null)).toBe('UNKNOWN_ERROR');
        });
    });

    describe('isRetryableError', () => {
        it('should return true for 5xx TMSError', () => {
            const error = new TMSError('Server error', 500, '/api/test');

            expect(isRetryableError(error)).toBe(true);
        });

        it('should return true for 503 TMSError', () => {
            const error = new TMSError('Service unavailable', 503, '/api/test');

            expect(isRetryableError(error)).toBe(true);
        });

        it('should return true for 429 rate limit', () => {
            const error = new TMSError('Rate limited', 429, '/api/test');

            expect(isRetryableError(error)).toBe(true);
        });

        it('should return false for 4xx client errors (except 429)', () => {
            const error = new TMSError('Bad request', 400, '/api/test');

            expect(isRetryableError(error)).toBe(false);
        });

        it('should return false for 404 not found', () => {
            const error = new TMSError('Not found', 404, '/api/test');

            expect(isRetryableError(error)).toBe(false);
        });

        it('should return true for NetworkError', () => {
            const error = new NetworkError('Connection failed', 'https://api.example.com');

            expect(isRetryableError(error)).toBe(true);
        });

        it('should return false for other errors', () => {
            const error = new ParserError('Parse failed', '/path');

            expect(isRetryableError(error)).toBe(false);
        });

        it('should return false for regular Error', () => {
            const error = new Error('Test');

            expect(isRetryableError(error)).toBe(false);
        });
    });
});
