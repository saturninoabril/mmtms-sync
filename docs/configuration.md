# Configuration Guide

TM-Sync works out of the box with zero configuration. This guide is for users who want to customize the default behavior.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Default Configuration](#default-configuration)
- [Configuration File Location](#configuration-file-location)
- [Configuration Options](#configuration-options)
  - [TMS Settings](#tms-settings)
  - [Test Files](#test-files)
  - [Validation Rules](#validation-rules)
  - [Sync Behavior](#sync-behavior)
  - [Reporting](#reporting)
  - [Logging](#logging)
  - [Cache](#cache)
  - [Mappings](#mappings)
- [Environment Variables](#environment-variables)
- [Examples](#examples)

## Quick Reference

Create a `tm-sync.config.json` file in your project root:

```json
{
  "tms": {
    "type": "zephyr-scale",
    "apiToken": "${ZEPHYR_API_TOKEN}",
    "projectKey": "YOUR_PROJECT"
  },
  "testFiles": {
    "patterns": ["your/test/path/**/*.spec.ts"]
  }
}
```

## Default Configuration

When no config file is present, TM-Sync uses these defaults:

```json
{
  "tms": {
    "type": "zephyr-scale",
    "baseUrl": "https://api.zephyrscale.smartbear.com/v2",
    "apiToken": "${ZEPHYR_API_TOKEN}",
    "projectKey": "MM",
    "timeout": 30000,
    "retryAttempts": 3,
    "retryDelay": 1000
  },
  "testFiles": {
    "patterns": ["**/*.spec.ts"],
    "exclude": [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/results/**",
      "**/logs/**",
      "**/storage_state/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/*.tsbuildinfo"
    ]
  },
  "mappings": {
    "directory": ".tm-sync/mappings",
    "fileName": "{testFilePath}.mapping.json"
  },
  "cache": {
    "enabled": true,
    "directory": ".tm-sync/cache",
    "ttl": 3600000
  },
  "validation": {
    "requiredTags": ["@objective"],
    "optionalTags": ["@precondition", "@known_issue"],
    "enforceActionComments": true,
    "enforceVerificationComments": true
  },
  "sync": {
    "batchSize": 10,
    "rateLimitDelay": 500,
    "createMissingCases": true,
    "updateExistingCases": true,
    "conflictResolution": "prompt"
  },
  "reporting": {
    "outputDir": ".tm-sync/reports",
    "formats": ["html", "json", "markdown"],
    "includeMetrics": true
  },
  "logging": {
    "level": "info",
    "file": ".tm-sync/logs/tm-sync.log",
    "console": true
  }
}
```

## Configuration File Location

TM-Sync looks for configuration files in this order:

1. `tm-sync.config.json` in current directory
2. `tm-sync.config.js` in current directory
3. `.tm-syncrc` in current directory
4. `.tm-syncrc.json` in current directory
5. `package.json` with `tmSync` property

## Configuration Options

### TMS Settings

Configure connection to your Test Management System.

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `type` | string | No | `"zephyr-scale"` | TMS platform type (currently only Zephyr Scale) |
| `baseUrl` | string | No | `"https://api.zephyrscale.smartbear.com/v2"` | TMS API base URL |
| `apiToken` | string | Yes* | `"${ZEPHYR_API_TOKEN}"` | API authentication token (use env var) |
| `projectKey` | string | No | `"MM"` | Project identifier (e.g., "MM" for Mattermost) |
| `timeout` | number | No | `30000` | API request timeout in milliseconds (1000-60000) |
| `retryAttempts` | number | No | `3` | Number of retry attempts for failed requests (0-10) |
| `retryDelay` | number | No | `1000` | Delay between retries in milliseconds |

**Required only for TMS sync operations (`--verify-tms` flag)*

**Example:**
```json
{
  "tms": {
    "type": "zephyr-scale",
    "baseUrl": "https://api.zephyrscale.smartbear.com/v2",
    "apiToken": "${ZEPHYR_API_TOKEN}",
    "projectKey": "PROJ",
    "timeout": 45000,
    "retryAttempts": 5
  }
}
```

### Test Files

Configure which test files to scan.

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `patterns` | string[] | No | `["**/*.spec.ts"]` | Glob patterns for test files to include |
| `exclude` | string[] | No | See defaults | Glob patterns for files to exclude |

**Example:**
```json
{
  "testFiles": {
    "patterns": [
      "e2e/**/*.spec.ts",
      "integration/**/*.test.ts"
    ],
    "exclude": [
      "**/node_modules/**",
      "**/*.skip.ts",
      "**/temp/**"
    ]
  }
}
```

### Validation Rules

Configure test documentation validation requirements.

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `requiredTags` | string[] | No | `["@objective"]` | JSDoc tags that must be present |
| `optionalTags` | string[] | No | `["@precondition", "@known_issue"]` | JSDoc tags that are optional |
| `enforceActionComments` | boolean | No | `true` | Require at least one `// #` action step |
| `enforceVerificationComments` | boolean | No | `true` | Require at least one `// *` verification step |

**Example:**
```json
{
  "validation": {
    "requiredTags": ["@objective", "@precondition"],
    "optionalTags": ["@known_issue", "@tags"],
    "enforceActionComments": true,
    "enforceVerificationComments": true
  }
}
```

### Sync Behavior

Configure how tests are synchronized with TMS.

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `batchSize` | number | No | `10` | Number of tests to process per batch (1-100) |
| `rateLimitDelay` | number | No | `500` | Delay between batches in milliseconds |
| `createMissingCases` | boolean | No | `true` | Automatically create test cases for unmapped tests |
| `updateExistingCases` | boolean | No | `true` | Automatically update existing test cases |
| `conflictResolution` | string | No | `"prompt"` | Strategy: `"prompt"`, `"prefer-local"`, `"prefer-remote"`, `"skip"` |

**Conflict Resolution Strategies:**

- `"prompt"`: Ask user what to do (default)
- `"prefer-local"`: Keep local changes, overwrite TMS
- `"prefer-remote"`: Keep TMS changes, discard local
- `"skip"`: Skip conflicted tests

**Example:**
```json
{
  "sync": {
    "batchSize": 20,
    "rateLimitDelay": 1000,
    "createMissingCases": false,
    "updateExistingCases": true,
    "conflictResolution": "prefer-local"
  }
}
```

### Reporting

Configure report generation settings.

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `outputDir` | string | No | `".tm-sync/reports"` | Directory for generated reports |
| `formats` | string[] | No | `["html", "json", "markdown"]` | Report formats to generate |
| `includeMetrics` | boolean | No | `true` | Include metrics in reports |

**Available Formats:**
- `"html"`: Interactive HTML report
- `"json"`: Machine-readable JSON
- `"markdown"`: Markdown document
- `"table"`: Console table (scan command only)

**Example:**
```json
{
  "reporting": {
    "outputDir": "reports/tm-sync",
    "formats": ["html", "json"],
    "includeMetrics": true
  }
}
```

### Logging

Configure logging behavior.

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `level` | string | No | `"info"` | Log level: `"debug"`, `"info"`, `"warn"`, `"error"` |
| `file` | string | No | `".tm-sync/logs/tm-sync.log"` | Log file path |
| `console` | boolean | No | `true` | Also log to console |

**Example:**
```json
{
  "logging": {
    "level": "debug",
    "file": "logs/tm-sync.log",
    "console": false
  }
}
```

### Cache

Configure API response caching.

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `enabled` | boolean | No | `true` | Enable response caching |
| `directory` | string | No | `".tm-sync/cache"` | Cache directory path |
| `ttl` | number | No | `3600000` | Cache time-to-live in milliseconds (1 hour) |

**Example:**
```json
{
  "cache": {
    "enabled": true,
    "directory": ".cache/tm-sync",
    "ttl": 7200000
  }
}
```

### Mappings

Configure test case mapping file storage.

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `directory` | string | No | `".tm-sync/mappings"` | Mappings directory path |
| `fileName` | string | No | `"{testFilePath}.mapping.json"` | Mapping file name template |

**Example:**
```json
{
  "mappings": {
    "directory": ".tm-sync/mappings",
    "fileName": "{testFilePath}.mapping.json"
  }
}
```

## Environment Variables

You can use environment variables in your configuration:

```json
{
  "tms": {
    "apiToken": "${ZEPHYR_API_TOKEN}",
    "projectKey": "${TM_SYNC_PROJECT}"
  }
}
```

Set them before running:

```bash
export ZEPHYR_API_TOKEN="your-token"
export TM_SYNC_PROJECT="MYPROJ"
tm-sync scan
```

## Examples

### Minimal Configuration

```json
{
  "tms": {
    "apiToken": "${ZEPHYR_API_TOKEN}",
    "projectKey": "PROJ"
  }
}
```

### Custom Test Paths

```json
{
  "testFiles": {
    "patterns": [
      "tests/e2e/**/*.spec.ts",
      "tests/integration/**/*.test.ts"
    ],
    "exclude": [
      "**/node_modules/**",
      "**/*.wip.ts"
    ]
  }
}
```

### Strict Validation

```json
{
  "validation": {
    "requiredTags": ["@objective", "@precondition"],
    "enforceActionComments": true,
    "enforceVerificationComments": true
  }
}
```

### CI/CD Optimized

```json
{
  "sync": {
    "batchSize": 50,
    "rateLimitDelay": 100,
    "conflictResolution": "skip"
  },
  "logging": {
    "level": "warn",
    "console": true,
    "file": null
  },
  "cache": {
    "enabled": false
  }
}
```

### Development Mode

```json
{
  "logging": {
    "level": "debug",
    "console": true
  },
  "sync": {
    "createMissingCases": false,
    "updateExistingCases": false,
    "conflictResolution": "prompt"
  }
}
```

## Configuration in package.json

You can also configure TM-Sync in your `package.json`:

```json
{
  "name": "my-project",
  "tmSync": {
    "tms": {
      "projectKey": "PROJ"
    },
    "testFiles": {
      "patterns": ["e2e/**/*.spec.ts"]
    }
  }
}
```

## See Also

- [Documentation Format](./documentation-format.md)
- [CLI Commands](./commands.md)
- [Troubleshooting](./troubleshooting.md)
