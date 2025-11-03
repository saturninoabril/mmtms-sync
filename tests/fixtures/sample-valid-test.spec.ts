/**
 * Sample Valid Test
 *
 * This fixture represents a properly documented Playwright test with all required
 * documentation elements for validation testing.
 *
 * @objective Verify that user can successfully log in with valid credentials
 * @precondition User account exists in the system
 */

// NOTE: For tags, use Playwright's native tagging: {tag: ['@smoke', '@regression']}
// Do NOT use @tags JSDoc tag - it is not supported.

import { test, expect } from '@playwright/test';

test('MM-T12345: User can log in with valid credentials', {tag: ['login', 'authentication']}, async ({ page }) => {
    // # Navigate to login page
    await page.goto('/login');

    // # Enter username
    await page.fill('#username', 'testuser@example.com');

    // # Enter password
    await page.fill('#password', 'SecurePass123!');

    // # Click login button
    await page.click('button[type="submit"]');

    // * Verify user is redirected to channels
    await expect(page).toHaveURL('/channels');

    // * Verify welcome message is displayed
    await expect(page.locator('.welcome-message')).toBeVisible();

    // * Verify user profile menu is accessible
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
});
