/**
 * Unit Test: Logger Service - Uninitialized State
 *
 * Tests getLogger() error path when called before initLogger().
 * This must be in a separate test file to avoid interference from other tests
 * that initialize the logger.
 */

describe('Logger Uninitialized State', () => {
    it('should throw error when getting uninitialized logger', () => {
        // Import getLogger in the test to ensure fresh module state
        // We need to test this before any initLogger() call
        const { getLogger } = require('../../../src/utils/logger');

        expect(() => {
            getLogger();
        }).toThrow('Logger not initialized. Call initLogger() first.');
    });
});
