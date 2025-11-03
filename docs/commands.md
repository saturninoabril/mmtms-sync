# CLI Commands

Complete reference for TM-Sync command-line interface.

## Global Options

These options work with all commands:

| Option | Description |
|--------|-------------|
| `--version` | Show version number |
| `--help` | Show help information |
| `--config <path>` | Path to config file (default: `tm-sync.config.json`) |

## scan

Scan test files and detect synchronization status.

### Usage

```bash
tm-sync scan <directory> [options]
```

### Arguments

- `<directory>` - Directory to scan for test files

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--format <type>` | Output format: `table` or `json` | `table` |
| `--verify-tms` | Verify test case IDs against TMS | `false` |
| `--run-validation` | Run validation checks during scan | `false` |
| `--include <pattern>` | Include file pattern (glob) | `**/*.spec.ts` |
| `--exclude <pattern>` | Exclude file pattern (glob) | `**/node_modules/**` |

### Examples

**Basic scan:**
```bash
tm-sync scan e2e-tests/playwright
```

**Scan with TMS verification:**
```bash
export ZEPHYR_API_TOKEN="your-token"
tm-sync scan e2e-tests --verify-tms
```

**JSON output:**
```bash
tm-sync scan e2e-tests --format json > scan-result.json
```

**Custom patterns:**
```bash
tm-sync scan . --include "tests/**/*.spec.ts" --exclude "**/temp/**"
```

### Output

**Table format:**
```
┌──────────────────────┬───────┬────────┬──────────┬─────────────┬────────┐
│ File                 │ Tests │ Synced │ Unmapped │ Out of Sync │ Errors │
├──────────────────────┼───────┼────────┼──────────┼─────────────┼────────┤
│ login.spec.ts        │ 5     │ 3      │ 1        │ 1           │ 0      │
│ channels.spec.ts    │ 3     │ 2      │ 1        │ 0           │ 0      │
└──────────────────────┴───────┴────────┴──────────┴─────────────┴────────┘
```

**JSON format:**
```json
{
  "summary": {
    "totalFiles": 2,
    "totalTests": 8,
    "syncedTests": 5,
    "unmappedTests": 2,
    "outOfSyncTests": 1
  },
  "metrics": {
    "syncCoverage": 75,
    "documentationCompliance": 100
  },
  "fileResults": [...]
}
```

## validate

Validate test documentation against requirements.

### Usage

```bash
tm-sync validate <path> [options]
```

### Arguments

- `<path>` - File or directory path to validate (supports glob patterns)

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--format <type>` | Output format: `table`, `json`, or `quiet` | `table` |
| `--fix` | Auto-fix issues where possible | `false` |
| `--strict` | Treat warnings as errors | `false` |

### Examples

**Validate single file:**
```bash
tm-sync validate tests/login.spec.ts
```

**Validate directory:**
```bash
tm-sync validate e2e-tests/playwright
```

**Validate with glob pattern:**
```bash
tm-sync validate "tests/**/*.spec.ts"
```

**JSON output:**
```bash
tm-sync validate tests --format json
```

**Quiet mode (exit code only):**
```bash
tm-sync validate tests --format quiet
# Exit code 0 = all pass, 1 = failures
```

**Auto-fix:**
```bash
tm-sync validate tests --fix
```

### Validation Rules

TM-Sync checks for:

✅ **Required Elements:**
- `@objective` JSDoc tag present
- At least one action step (`// #`)
- At least one verification step (`// *`)

✅ **Format Rules:**
- Test case ID follows `MM-T#####` format
- Test title is descriptive (>10 characters)
- JSDoc is properly formatted

✅ **Best Practices:**
- Action and verification steps have descriptions
- Test case ID matches pattern
- No duplicate test case IDs

### Output

**Table format:**
```
┌───────────────────────┬─────────┬────────┐
│ Test                  │ Status  │ Issues │
├───────────────────────┼─────────┼────────┤
│ User can login        │ ✓ PASS  │ None   │
│ User can logout       │ ✗ FAIL  │ 2      │
└───────────────────────┴─────────┴────────┘

Summary:
Files scanned:  2
Tests found:    10
Tests passing:  8
Tests failing:  2
Pass rate:      80%
```

**JSON format:**
```json
{
  "results": [
    {
      "file": "login.spec.ts",
      "test": "User can login",
      "valid": true,
      "issues": []
    },
    {
      "file": "logout.spec.ts",
      "test": "User can logout",
      "valid": false,
      "issues": [
        {
          "severity": "error",
          "message": "Missing @objective tag",
          "suggestedFix": "Add @objective JSDoc tag"
        }
      ]
    }
  ]
}
```

## Exit Codes

All commands use standard exit codes:

- `0` - Success (all tests passed validation, or scan completed)
- `1` - Failure (validation errors found, or scan failed)
- `2` - Invalid usage (missing arguments, invalid options)

## Environment Variables

Commands respect these environment variables:

| Variable | Description |
|----------|-------------|
| `ZEPHYR_API_TOKEN` | Zephyr Scale API token |
| `TM_SYNC_CONFIG` | Path to config file |
| `TM_SYNC_LOG_LEVEL` | Log level: `debug`, `info`, `warn`, `error` |

## Examples

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit
tm-sync validate $(git diff --cached --name-only | grep '\.spec\.ts$')
```

### CI/CD Pipeline

```yaml
- name: Validate tests
  run: |
    npm install -g @mattermost/tm-sync
    tm-sync validate e2e-tests --format json

- name: Scan sync status
  run: tm-sync scan e2e-tests --verify-tms --format json
  env:
    ZEPHYR_API_TOKEN: ${{ secrets.ZEPHYR_API_TOKEN }}
```

### npm Scripts

```json
{
  "scripts": {
    "test:validate": "tm-sync validate e2e-tests",
    "test:scan": "tm-sync scan e2e-tests --verify-tms"
  }
}
```

## See Also

- [Configuration Guide](./configuration.md)
- [Documentation Format](./documentation-format.md)
- [Troubleshooting](./troubleshooting.md)
