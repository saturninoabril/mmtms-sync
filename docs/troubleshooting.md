# Troubleshooting Guide

Common issues and solutions for TM-Sync.

## Configuration Issues

### "Configuration file not found"

**Problem:** TM-Sync can't find your config file.

**Solutions:**
1. Verify file exists: `ls tm-sync.config.json`
2. Check file name spelling (case-sensitive)
3. Ensure file is in project root or specify path:
   ```bash
   tm-sync scan --config path/to/config.json
   ```
4. Remember: Configuration is optional! TM-Sync works without it.

### "Invalid configuration format"

**Problem:** Config file has syntax errors.

**Solutions:**
1. Validate JSON syntax:
   ```bash
   cat tm-sync.config.json | jq .
   ```
2. Check for:
   - Missing commas
   - Trailing commas (not allowed in JSON)
   - Unquoted property names
   - Unclosed brackets/braces
3. Use a JSON validator or IDE with JSON schema support

## API/TMS Issues

### "TMS API token is required"

**Problem:** Missing or invalid API token.

**Solutions:**
1. Set environment variable:
   ```bash
   export ZEPHYR_API_TOKEN="your-token-here"
   ```
2. Or add to config file:
   ```json
   {
     "tms": {
       "apiToken": "${ZEPHYR_API_TOKEN}"
     }
   }
   ```
3. Verify token is valid in Zephyr Scale settings
4. Note: Token only needed for `--verify-tms` flag

### "API rate limit exceeded"

**Problem:** Too many requests to TMS API.

**Solutions:**
1. Increase delay between requests in config:
   ```json
   {
     "sync": {
       "rateLimitDelay": 1000,
       "batchSize": 5
     }
   }
   ```
2. Reduce batch size
3. Wait a few minutes and retry
4. Contact TMS admin about rate limits

### "Failed to connect to TMS"

**Problem:** Network or authentication error.

**Solutions:**
1. Check internet connection
2. Verify TMS base URL:
   ```json
   {
     "tms": {
       "baseUrl": "https://api.zephyrscale.smartbear.com/v2"
     }
   }
   ```
3. Test API token manually:
   ```bash
   curl -H "Authorization: Bearer $ZEPHYR_API_TOKEN" \
     https://api.zephyrscale.smartbear.com/v2/healthcheck
   ```
4. Check corporate firewall/proxy settings

## Validation Errors

### "Missing @objective tag"

**Problem:** Test lacks required `@objective` JSDoc tag.

**Solutions:**
1. Add JSDoc comment before test:
   ```typescript
   /**
    * @objective Verify user can perform action
    */
   test('MM-T123: Test title', async ({ page }) => {
   ```
2. Or disable requirement in config:
   ```json
   {
     "validation": {
       "requiredTags": []
     }
   }
   ```

### "Missing action steps"

**Problem:** Test has no `// #` action comments.

**Solutions:**
1. Add action step comments:
   ```typescript
   // # Click the login button
   await page.click('#login');
   ```
2. Or disable in config:
   ```json
   {
     "validation": {
       "enforceActionComments": false
     }
   }
   ```

### "Missing verification steps"

**Problem:** Test has no `// *` verification comments.

**Solutions:**
1. Add verification comments:
   ```typescript
   // * Verify user is logged in
   await expect(page).toHaveURL('/channels');
   ```
2. Or disable in config:
   ```json
   {
     "validation": {
       "enforceVerificationComments": false
     }
   }
   ```

### "Invalid test case ID format"

**Problem:** Test case ID doesn't match `MM-T#####` pattern.

**Solutions:**
1. Fix test title:
   ```typescript
   // Wrong
   test('T12345: Test', ...)
   test('MM-12345: Test', ...)
   test('Test MM-T12345', ...)

   // Correct
   test('MM-T12345: Test', ...)
   ```
2. Update project key in config if not "MM":
   ```json
   {
     "tms": {
       "projectKey": "YOURPROJECT"
     }
   }
   ```

## File/Path Issues

### "No test files found"

**Problem:** TM-Sync can't find your test files.

**Solutions:**
1. Check file patterns in config:
   ```json
   {
     "testFiles": {
       "patterns": ["e2e/**/*.spec.ts"],
       "exclude": ["**/node_modules/**"]
     }
   }
   ```
2. Verify directory path is correct
3. Use absolute path if needed
4. Check file extensions match pattern

### "Invalid JSON in mapping file"

**Problem:** Corrupted mapping file.

**Solutions:**
1. Delete corrupted file:
   ```bash
   rm .tm-sync/mappings/path/to/test.spec.ts.mapping.json
   ```
2. Rescan to regenerate:
   ```bash
   tm-sync scan e2e-tests
   ```
3. Add `.tm-sync/` to `.gitignore` to avoid committing corrupted files

### "Permission denied"

**Problem:** TM-Sync can't read/write files.

**Solutions:**
1. Check file permissions:
   ```bash
   ls -la tm-sync.config.json
   ```
2. Ensure TM-Sync has write access to:
   - `.tm-sync/mappings/`
   - `.tm-sync/cache/`
   - `.tm-sync/logs/`
3. Run with appropriate permissions or change directory ownership

## Performance Issues

### "Scan is very slow"

**Problem:** Scanning takes too long.

**Solutions:**
1. Exclude unnecessary directories:
   ```json
   {
     "testFiles": {
       "exclude": [
         "**/node_modules/**",
         "**/dist/**",
         "**/build/**",
         "**/*.temp.ts"
       ]
     }
   }
   ```
2. Disable caching temporarily:
   ```json
   {
     "cache": {
       "enabled": false
     }
   }
   ```
3. Use more specific file patterns
4. Scan smaller directories at a time

### "High memory usage"

**Problem:** TM-Sync uses too much memory.

**Solutions:**
1. Reduce batch size:
   ```json
   {
     "sync": {
       "batchSize": 5
     }
   }
   ```
2. Process files in smaller groups
3. Clear cache directory:
   ```bash
   rm -rf .tm-sync/cache
   ```

## CI/CD Issues

### "Tests pass locally but fail in CI"

**Problem:** Different behavior in CI environment.

**Solutions:**
1. Ensure Node.js version matches:
   ```yaml
   - uses: actions/setup-node@v4
     with:
       node-version: '22'
   ```
2. Install TM-Sync globally in CI:
   ```yaml
   - run: npm install -g @mattermost/tm-sync
   ```
3. Set environment variables in CI:
   ```yaml
   env:
     ZEPHYR_API_TOKEN: ${{ secrets.ZEPHYR_API_TOKEN }}
   ```
4. Use absolute paths in CI

### "Config file not found in CI"

**Problem:** CI can't find config file.

**Solutions:**
1. Commit config file to repository
2. Or use zero-config mode (no config file needed!)
3. Generate config in CI:
   ```yaml
   - run: |
       echo '{"tms":{"projectKey":"PROJ"}}' > tm-sync.config.json
   ```
4. Use environment variables instead

## Debugging

### Enable debug logging

```bash
# Set log level to debug
TM_SYNC_LOG_LEVEL=debug tm-sync scan e2e-tests
```

Or in config:
```json
{
  "logging": {
    "level": "debug",
    "console": true
  }
}
```

### Check log files

```bash
# View recent logs
tail -f .tm-sync/logs/tm-sync.log

# Search for errors
grep ERROR .tm-sync/logs/tm-sync.log
```

### Test configuration

```bash
# Verify config is valid
cat tm-sync.config.json | jq .

# Test with minimal config
echo '{"tms":{"projectKey":"MM"}}' > test.config.json
tm-sync scan --config test.config.json e2e-tests
```

### Isolate the issue

```bash
# Test single file
tm-sync validate tests/single-test.spec.ts

# Test without TMS verification
tm-sync scan tests  # No --verify-tms flag

# Test with fresh cache
rm -rf .tm-sync/cache
tm-sync scan tests
```

## Getting Help

If you're still stuck:

1. **Check the logs:**
   ```bash
   cat .tm-sync/logs/tm-sync.log
   ```

2. **Enable debug mode:**
   ```bash
   TM_SYNC_LOG_LEVEL=debug tm-sync scan e2e-tests 2>&1 | tee debug.log
   ```

3. **Search existing issues:**
   - [GitHub Issues](https://github.com/mattermost/tm-sync/issues)

4. **Create a new issue:**
   Include:
   - TM-Sync version (`tm-sync --version`)
   - Node.js version (`node --version`)
   - Operating system
   - Configuration file (sanitized)
   - Full error message
   - Steps to reproduce

5. **Ask the community:**
   - [Mattermost Community](https://community.mattermost.com)

## See Also

- [Configuration Guide](./configuration.md)
- [CLI Commands](./commands.md)
- [Documentation Format](./documentation-format.md)
