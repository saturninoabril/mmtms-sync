/**
 * Scan Command
 *
 * CLI command to scan Playwright test files and detect sync status with TMS.
 * Identifies tests that are synced, unmapped, out-of-sync, or have validation errors.
 */

import { Command } from 'commander';
import { Scanner } from '../../core/scanner.js';
import { DEFAULT_CONFIG } from '../../models/configuration.js';
import { formatScanResults } from '../utils/formatters.js';
import { statSync, writeFileSync } from 'fs';
import { isAbsolute, resolve } from 'path';
import ora from 'ora';

interface ScanOptions {
    format: 'table' | 'json';
    output?: string;
    verifyTms?: boolean;
}

export const scanCommand = new Command('scan')
    .description('Scan test files and detect sync status with TMS')
    .argument('[path]', 'Path to test file or directory', process.cwd())
    .option('-f, --format <type>', 'Output format: table, json', 'table')
    .option('-o, --output <file>', 'Write results to file')
    .option('--verify-tms', 'Verify sync status against TMS (requires TMS connection)', false)
    // eslint-disable-next-line complexity, max-lines-per-function
    .action(async (path: string, options: ScanOptions) => {
        const spinner = ora('Scanning for test files...').start();

        try {
            // Resolve path
            const resolvedPath = isAbsolute(path) ? path : resolve(process.cwd(), path);

            // Determine if path is a directory or file
            let directoryPath: string;
            let patterns: string[];

            try {
                const stats = statSync(resolvedPath);
                if (stats.isDirectory()) {
                    directoryPath = resolvedPath;
                    patterns = DEFAULT_CONFIG.testFiles.patterns;
                } else {
                    // If it's a file, scan just that file
                    directoryPath = resolvedPath;
                    patterns = ['*.spec.ts'];
                }
            } catch {
                // Path doesn't exist, treat as directory
                directoryPath = resolvedPath;
                patterns = DEFAULT_CONFIG.testFiles.patterns;
            }

            spinner.text = 'Scanning test files for sync status...';

            // Initialize scanner
            const scanner = new Scanner(DEFAULT_CONFIG.validation);

            // Scan directory
            const scanResult = await scanner.scanDirectory(directoryPath, patterns);

            if (scanResult.summary.totalTests === 0) {
                spinner.fail('No test files found');
                process.exit(1);
            }

            spinner.succeed(
                `Scanned ${scanResult.summary.totalTests} test(s) from ${scanResult.summary.totalFiles} file(s)`
            );

            // Handle --verify-tms option
            if (options.verifyTms) {
                // eslint-disable-next-line no-console
                console.log(
                    '\nNote: --verify-tms option requires TMS integration (User Story 3). Current scan is based on local mapping files only.'
                );
            }

            // Format and output results
            const output = formatScanResults(scanResult, options.format);

            if (options.output) {
                writeFileSync(options.output, output, 'utf-8');
                // eslint-disable-next-line no-console
                console.log(`\nResults written to: ${options.output}`);
            } else {
                // eslint-disable-next-line no-console
                console.log('\n' + output);
            }

            // Print summary if table format
            if (options.format === 'table') {
                /* eslint-disable no-console */
                console.log('\n=== Summary ===');
                console.log(`Total tests: ${scanResult.summary.totalTests}`);
                console.log(`Synced: ${scanResult.summary.syncedTests}`);
                console.log(`Unmapped: ${scanResult.summary.unmappedTests}`);
                console.log(`Out of sync: ${scanResult.summary.outOfSyncTests}`);
                console.log(`Validation errors: ${scanResult.summary.validationErrors}`);
                console.log(`\nSync Coverage: ${scanResult.metrics.syncCoverage}%`);
                console.log(`Documentation Compliance: ${scanResult.metrics.documentationCompliance}%`);
                /* eslint-enable no-console */
            }

            // Exit with error code if there are issues
            if (scanResult.summary.unmappedTests > 0 || scanResult.summary.outOfSyncTests > 0) {
                process.exit(1);
            }
        } catch (error) {
            spinner.fail(`Scan failed: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    });
