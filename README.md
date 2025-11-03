# TM-Sync

> Zero-config CLI tool for synchronizing Playwright test documentation with Zephyr Scale test management system

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org/)
[![npm Version](https://img.shields.io/badge/npm-%3E%3D10.0.0-blue)](https://www.npmjs.com/)

TM-Sync is a **zero-configuration** command-line tool designed to keep your Playwright test files and Zephyr Scale test cases in sync. It works out of the box with sensible defaults and automatically detects test documentation changes, validates test structure, and helps maintain consistency between your codebase and test management system.

**No config file required** - just run `tm-sync scan` or `tm-sync validate` and you're ready to go! For advanced use cases, create an optional `tm-sync.config.json` to customize behavior.

## Features

- **Zero Configuration**: Works immediately with smart defaults - no setup required
- **Optional Configuration**: Fine-tune behavior with `tm-sync.config.json` when needed
- **Automated Scanning**: Detect test case IDs and documentation in Playwright test files
- **Change Detection**: Track modifications to test objectives, steps, and verification points
- **Validation**: Ensure tests follow proper documentation standards
- **Sync Status**: Monitor which tests are synced, unmapped, or need updates
- **Batch Operations**: Efficiently process multiple test files with rate limiting
- **Multiple Output Formats**: Table, JSON, and Markdown reports
- **Conflict Resolution**: Handle divergent changes between code and TMS

## Installation

```bash
npm install @mattermost/tm-sync
```

Or use globally:

```bash
npm install -g @mattermost/tm-sync
```

## Requirements

- Node.js >= 22.0.0
- npm >= 10.0.0
- Zephyr Scale API access

## Quick Start

### Zero-Config Usage (Recommended)

Just install and run - no configuration needed!

```bash
# Install
npm install -g @mattermost/tm-sync

# Validate your tests (works immediately)
tm-sync validate e2e-tests/playwright

# Scan for sync status
tm-sync scan e2e-tests/playwright
```

## Configuration (Optional)

For customization, see the [Configuration Guide](./docs/configuration.md).

## Documentation Format

TM-Sync expects Playwright tests to follow this documentation format:

```typescript
/**
 * @objective Brief description of what this test verifies
 * @precondition (Optional) Setup requirements
 * @known_issue (Optional) Known issues or limitations
 */
import { test, expect } from '@playwright/test';

test('MM-T12345: Test title', async ({ page }) => {
    // # Action step 1
    await page.goto('/login');

    // # Action step 2
    await page.fill('#username', 'user@example.com');

    // * Verification step 1
    await expect(page).toHaveURL('/channels');

    // * Verification step 2
    await expect(page.locator('.welcome')).toBeVisible();
});
```

### Documentation Elements

- **Test Case ID**: `MM-T#####` format in test title
- **@objective**: Required JSDoc tag describing test purpose
- **@precondition**: Optional setup requirements
- **@known_issue**: Optional known issues
- **Action Steps**: Comments starting with `// #`
- **Verification Steps**: Comments starting with `// *`
- **Tags**: Use Playwright's native `{tag: [...]}` syntax

### CI/CD Integration
```yaml
- run: npm install -g @mattermost/tm-sync
- run: tm-sync validate e2e-tests --format json
```

## Documentation

- **[Configuration Guide](./docs/configuration.md)** - Customize TM-Sync behavior
- **[CLI Commands](./docs/commands.md)** - Complete command reference
- **[Documentation Format](./docs/documentation-format.md)** - Test documentation standards
- **[Troubleshooting](./docs/troubleshooting.md)** - Common issues and solutions

## Roadmap

TM-Sync is under active development. Current capabilities and planned features:

### Currently Available ✅

- Zero-configuration validation and scanning
- Test documentation format detection and validation
- Change detection via content hashing
- Multiple output formats (table, JSON, Markdown)
- File-based mapping storage

### In Development 🚧

- **TMS Integration**: Direct sync with Zephyr Scale API
  - Create test cases from unmapped tests
  - Update test cases when code changes
  - Pull changes from TMS to detect conflicts

- **Intelligent Workflows**:
  - Interactive mode for guided issue resolution
  - Batch operations with progress tracking
  - Conflict resolution with diff preview

- **Automation & CI/CD**:
  - Pre-commit git hooks
  - Enhanced CI validation reporting
  - Watch mode for continuous validation

### Planned 📋

- HTML dashboard with metrics and trends
- Test case dependencies tracking

See [Feature Specification](./specs/001-tm-sync-npm-package/spec.md) for detailed roadmap.

## Support

- 📖 [Documentation](./docs/)
- 🐛 [Report Issues](https://github.com/mattermost/tm-sync/issues)
- 💬 [Community](https://community.mattermost.com)

## [License](./LICENSE)

GNU GENERAL PUBLIC LICENSE, Version 3 
