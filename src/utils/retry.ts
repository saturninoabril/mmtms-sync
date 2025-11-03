/**
 * Retry Utilities
 *
 * Provides retry logic with exponential backoff for operations that may fail transiently.
 * Useful for API requests, file operations, and network calls.
 */

import { isRetryableError } from './error-handler.js';

/**
 * Retry options
 */
export interface RetryOptions {
    /** Maximum number of retry attempts */
    maxAttempts: number;

    /** Initial delay in milliseconds */
    initialDelay: number;

    /** Maximum delay in milliseconds */
    maxDelay: number;

    /** Backoff multiplier */
    backoffMultiplier: number;

    /** Timeout in milliseconds */
    timeout: number;

    /** Custom function to determine if error is retryable */
    isRetryable?: (error: unknown) => boolean;

    /** Callback invoked before each retry */
    onRetry?: (attempt: number, error: unknown, delay: number) => void;
}

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    timeout: 30000,
    isRetryable: isRetryableError,
};

/**
 * Retry result
 */
export interface RetryResult<T> {
    /** Operation result */
    value: T;

    /** Number of attempts made */
    attempts: number;

    /** Total time taken in milliseconds */
    duration: number;

    /** Errors encountered during retries */
    errors: unknown[];
}

/**
 * Execute operation with retry logic
 */
export async function retry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    const errors: unknown[] = [];
    const startTime = Date.now();

    let attempt = 0;
    let delay = opts.initialDelay;

    while (attempt < opts.maxAttempts) {
        attempt++;

        try {
            // Execute operation with timeout
            const value = await withTimeout(operation(), opts.timeout);

            return {
                value,
                attempts: attempt,
                duration: Date.now() - startTime,
                errors,
            };
        } catch (error) {
            errors.push(error);

            // Check if error is retryable
            const shouldRetry = opts.isRetryable ? opts.isRetryable(error) : true;

            // Don't retry if this was the last attempt or error is not retryable
            if (attempt >= opts.maxAttempts || !shouldRetry) {
                throw error;
            }

            // Call retry callback if provided
            if (opts.onRetry) {
                opts.onRetry(attempt, error, delay);
            }

            // Wait before retry
            await sleep(delay);

            // Calculate next delay with exponential backoff
            delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
        }
    }

    // This should never be reached, but TypeScript needs it
    throw errors[errors.length - 1];
}

/**
 * Execute operation with timeout
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            globalThis.setTimeout(() => {
                reject(new Error(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        }),
    ]);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        globalThis.setTimeout(resolve, ms);
    });
}

/**
 * Execute operation with retry and return value directly (throws on failure)
 */
export async function retryOperation<T>(operation: () => Promise<T>, options: Partial<RetryOptions> = {}): Promise<T> {
    const result = await retry(operation, options);
    return result.value;
}

/**
 * Retry with exponential backoff (simplified interface)
 */
export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    initialDelay: number = 1000
): Promise<T> {
    return retryOperation(operation, {
        maxAttempts,
        initialDelay,
        backoffMultiplier: 2,
        maxDelay: 10000,
    });
}

/**
 * Batch operations with retry
 */
export async function retryBatch<T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    options: Partial<RetryOptions> = {}
): Promise<Array<{ item: T; result: R | null; error: Error | null }>> {
    const results = await Promise.allSettled(
        items.map((item) =>
            retryOperation(() => operation(item), options).then((result) => ({
                item,
                result,
            }))
        )
    );

    return results.map((result, index) => {
        const item = items[index];
        if (!item) {
            throw new Error(`Item at index ${index} is undefined`);
        }

        if (result.status === 'fulfilled') {
            return {
                item,
                result: result.value.result,
                error: null,
            };
        } else {
            return {
                item,
                result: null,
                error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
            };
        }
    });
}
