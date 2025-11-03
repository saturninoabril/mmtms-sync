# Test Documentation Format

Guide to writing properly documented Playwright tests for TM-Sync.

## Overview

TM-Sync expects tests to follow a specific documentation format that includes:
- JSDoc comments with metadata
- Structured action and verification steps
- Test case ID in title
- Optional tags

## Complete Example

```typescript
/**
 * Login Test Suite
 *
 * @objective Verify that users can successfully log in with valid credentials
 * @precondition User account exists with username 'testuser@example.com'
 * @known_issue Login may timeout on slow connections (ISSUE-123)
 */

import { test, expect } from '@playwright/test';

test('MM-T12345: User can login with valid credentials',
  { tag: ['@smoke', '@login', '@authentication'] },
  async ({ page }) => {
    // # Navigate to login page
    await page.goto('/login');

    // # Enter valid username
    await page.fill('#username', 'testuser@example.com');

    // # Enter valid password
    await page.fill('#password', 'SecurePass123!');

    // # Click the login button
    await page.click('button[type="submit"]');

    // * Verify user is redirected to channels
    await expect(page).toHaveURL('/channels');

    // * Verify welcome message is displayed
    await expect(page.locator('.welcome-message')).toBeVisible();

    // * Verify user profile menu is accessible
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
});
```

## Required Elements

### 1. Test Case ID

Format: `MM-T#####` where `MM` is the project key and `#####` is the test case number.

**Correct:**
```typescript
test('MM-T12345: User can login', async ({ page }) => {
```

**Incorrect:**
```typescript
test('User can login', async ({ page }) => {        // Missing ID
test('T12345: User can login', async ({ page }) => { // Missing project key
test('MM-12345: User can login', async ({ page }) => { // Wrong format (no T)
```

### 2. @objective Tag

Required JSDoc tag describing what the test verifies.

**Correct:**
```typescript
/**
 * @objective Verify user can log in with valid credentials
 */
```

**Incorrect:**
```typescript
/**
 * @objective
 */  // Empty

// @objective This is not JSDoc  // Not in JSDoc comment
```

### 3. Action Steps

Comments starting with `// #` that describe user actions.

**Correct:**
```typescript
// # Click the login button
await page.click('#login-btn');

// # Enter username in the input field
await page.fill('#username', 'user');
```

**Incorrect:**
```typescript
// Click button  // Missing #
await page.click('#btn');

//# No space after #
await page.click('#btn');
```

### 4. Verification Steps

Comments starting with `// *` that describe expected results.

**Correct:**
```typescript
// * Verify user is logged in
await expect(page.locator('.user-menu')).toBeVisible();

// * Verify channels is displayed
await expect(page).toHaveURL('/channels');
```

**Incorrect:**
```typescript
// Verify user is logged in  // Missing *
await expect(page.locator('.user-menu')).toBeVisible();

//* No space after *
await expect(page).toHaveURL('/channels');
```

## Optional Elements

### @precondition Tag

Describes setup requirements or state before test runs.

**Single precondition:**
```typescript
/**
 * @objective Test login functionality
 * @precondition User account must exist in database
 */
```

**Multiple preconditions:**
```typescript
/**
 * @objective Test login functionality
 * @precondition User account must exist in database
 * @precondition Email must be verified
 * @precondition Account must not be locked
 */
```

### @known_issue Tag

Documents known issues or limitations.

```typescript
/**
 * @objective Test file upload
 * @known_issue Upload fails for files larger than 10MB (BUG-456)
 */
```

### Playwright Tags

Use Playwright's native tagging for categorization.

```typescript
test('MM-T12345: User can login',
  { tag: ['@smoke', '@critical', '@login'] },
  async ({ page }) => {
    // test code
});
```

**Note:** Don't use `@tags` in JSDoc - it's not supported. Use Playwright's `{tag: [...]}` syntax instead.

## Documentation Best Practices

### 1. Write Clear Objectives

**Good:**
```typescript
/**
 * @objective Verify that users can successfully reset their password using email link
 */
```

**Bad:**
```typescript
/**
 * @objective Test password reset
 */  // Too vague
```

### 2. Be Specific in Steps

**Good:**
```typescript
// # Click the "Submit" button in the login form
await page.click('form#login button[type="submit"]');
```

**Bad:**
```typescript
// # Click button
await page.click('button');  // Which button?
```

### 3. Describe Expected Results

**Good:**
```typescript
// * Verify error message "Invalid credentials" is displayed
await expect(page.locator('.error')).toContainText('Invalid credentials');
```

**Bad:**
```typescript
// * Check error
await expect(page.locator('.error')).toBeVisible();  // What error?
```

### 4. Organize Complex Tests

For tests with many steps, group related actions:

```typescript
test('MM-T12345: Complete checkout process', async ({ page }) => {
    // Setup - Navigate to product page
    // # Open homepage
    await page.goto('/');

    // # Select a product
    await page.click('[data-testid="product-1"]');

    // Add to cart
    // # Click add to cart button
    await page.click('#add-to-cart');

    // * Verify item added to cart
    await expect(page.locator('.cart-count')).toContainText('1');

    // Proceed to checkout
    // # Click checkout button
    await page.click('#checkout');

    // # Fill shipping information
    await page.fill('#address', '123 Main St');

    // * Verify order confirmation displayed
    await expect(page.locator('.confirmation')).toBeVisible();
});
```

## Common Patterns

### Login Test

```typescript
/**
 * @objective Verify successful login with valid credentials
 * @precondition Test user account exists
 */
test('MM-T100: User can login successfully', async ({ page }) => {
    // # Navigate to login page
    await page.goto('/login');

    // # Enter username
    await page.fill('#username', 'testuser');

    // # Enter password
    await page.fill('#password', 'password123');

    // # Click login button
    await page.click('#login-btn');

    // * Verify redirect to channels
    await expect(page).toHaveURL('/channels');

    // * Verify user menu is visible
    await expect(page.locator('.user-menu')).toBeVisible();
});
```

### Form Validation Test

```typescript
/**
 * @objective Verify form validation shows appropriate error messages
 */
test('MM-T200: Form shows validation errors for invalid input', async ({ page }) => {
    // # Navigate to signup page
    await page.goto('/signup');

    // # Click submit without filling form
    await page.click('#submit');

    // * Verify email validation error is shown
    await expect(page.locator('#email-error')).toContainText('Email is required');

    // * Verify password validation error is shown
    await expect(page.locator('#password-error')).toContainText('Password is required');
});
```

### Skip/Fixme Tests

```typescript
/**
 * @objective Test new feature (work in progress)
 * @known_issue Feature not yet implemented
 */
test.skip('MM-T300: Future feature test', async ({ page }) => {
    // Test code for future feature
});

/**
 * @objective Test broken functionality
 * @known_issue Bug in production (BUG-789)
 */
test.fixme('MM-T400: Test with known bug', async ({ page }) => {
    // Test that currently fails due to bug
});
```

## Validation Rules

TM-Sync validates tests against these rules:

| Rule | Severity | Description |
|------|----------|-------------|
| `missing_objective` | Error | Test missing @objective tag |
| `missing_action_comments` | Error | Test has no action steps (`// #`) |
| `missing_verification_comments` | Error | Test has no verification steps (`// *`) |
| `invalid_test_case_id` | Error | Test case ID format invalid |
| `invalid_test_title` | Warning | Test title too short (<10 chars) |
| `empty_objective` | Error | @objective tag is empty |
| `malformed_jsdoc` | Warning | JSDoc comment malformed |

## See Also

- [CLI Commands](./commands.md)
- [Configuration Guide](./configuration.md)
- [Troubleshooting](./troubleshooting.md)
