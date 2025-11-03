/**
 * Sample Test with Skip
 *
 * @objective Verify that skipped tests are still parsed correctly
 * @precondition Feature is temporarily disabled
 */

// NOTE: Use Playwright native tagging instead of @tags JSDoc tag

import { test, expect } from '@playwright/test';

test.skip('MM-T99999: Skipped test should be parsed', {tag: ['future_feature']}, async ({ page }) => {
    // # This test is temporarily disabled
    await page.goto('/feature-under-development');

    // * Verify something
    await expect(page.locator('.new-feature')).toBeVisible();
});

test.fixme('MM-T88888: Fixme test should also be parsed', async ({ page }) => {
    // # Navigate to broken feature
    await page.goto('/known-broken-feature');

    // * This needs fixing
    await expect(page.locator('.element')).toBeVisible();
});
