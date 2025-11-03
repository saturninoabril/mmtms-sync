/**
 * CLI Output Formatters
 *
 * Formats validation and scan results for CLI output.
 * Supports table, JSON, and quiet modes.
 */

import CliTable3 from 'cli-table3';
import chalk from 'chalk';
import type { ValidationIssue } from '../../core/validator.js';
import type { FileResult, ScanResult } from '../../models/scan-result.js';
import { SyncStatus } from '../../models/test-case-mapping.js';

interface ValidationResultItem {
    file: string;
    test: string;
    valid: boolean;
    issues: ValidationIssue[];
}

/**
 * Format validation results based on output format
 */
export function formatValidationResults(results: ValidationResultItem[], format: 'table' | 'json' | 'quiet'): string {
    switch (format) {
        case 'json':
            return JSON.stringify(results, null, 2);

        case 'quiet':
            return '';

        case 'table':
        default:
            return formatValidationTable(results);
    }
}

/**
 * Format validation results as a colored table
 */
function formatValidationTable(results: ValidationResultItem[]): string {
    const table = new CliTable3({
        head: [chalk.bold('File'), chalk.bold('Test'), chalk.bold('Status'), chalk.bold('Issues')],
        colWidths: [40, 50, 10, 80],
        wordWrap: true,
    });

    for (const result of results) {
        const status = result.valid ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');

        const issuesText =
            result.issues.length === 0
                ? chalk.gray('None')
                : result.issues
                      .map((issue) => {
                          const severityColor =
                              issue.severity === 'error'
                                  ? chalk.red
                                  : issue.severity === 'warning'
                                    ? chalk.yellow
                                    : chalk.blue;
                          return `${severityColor(issue.severity.toUpperCase())}: ${issue.message}`;
                      })
                      .join('\n');

        // Shorten file path to fit
        const shortFile = result.file.length > 38 ? '...' + result.file.slice(-35) : result.file;

        // Shorten test title to fit
        const shortTest = result.test.length > 48 ? result.test.slice(0, 45) + '...' : result.test;

        table.push([shortFile, shortTest, status, issuesText]);
    }

    return table.toString();
}

/**
 * Format a single validation issue with colors
 */
export function formatIssue(issue: ValidationIssue): string {
    const severityColor =
        issue.severity === 'error' ? chalk.red : issue.severity === 'warning' ? chalk.yellow : chalk.blue;

    let output = `${severityColor(issue.severity.toUpperCase())}: ${issue.message}`;

    if (issue.lineNumber) {
        output += chalk.gray(` (line ${issue.lineNumber})`);
    }

    if (issue.suggestedFix) {
        output += '\n  ' + chalk.cyan('→ ') + issue.suggestedFix;
    }

    return output;
}

/**
 * Format summary statistics
 */
export function formatSummary(stats: {
    totalTests: number;
    validTests: number;
    totalIssues: number;
    totalFiles: number;
}): string {
    const passRate = stats.totalTests > 0 ? ((stats.validTests / stats.totalTests) * 100).toFixed(1) : '0';

    return `
${chalk.bold('=== Summary ===')}
Files scanned:  ${stats.totalFiles}
Tests found:    ${stats.totalTests}
Tests passing:  ${chalk.green(stats.validTests)}
Tests failing:  ${chalk.red(stats.totalTests - stats.validTests)}
Total issues:   ${stats.totalIssues}
Pass rate:      ${passRate}%
`;
}

/**
 * Format scan results based on output format
 */
export function formatScanResults(scanResult: ScanResult, format: 'table' | 'json'): string {
    switch (format) {
        case 'json':
            return JSON.stringify(scanResult, null, 2);

        case 'table':
        default:
            return formatScanTable(scanResult);
    }
}

/**
 * Format scan results as a colored table
 */
function formatScanTable(scanResult: ScanResult): string {
    const table = createFileResultsTable(scanResult.fileResults);
    const hasIssues = scanResult.fileResults.some((f) => f.issues.length > 0);

    if (hasIssues) {
        const issuesTable = createIssuesTable(scanResult.fileResults);
        return `${table.toString()}\n\n${chalk.bold('=== Issues ===')}\n${issuesTable.toString()}`;
    }

    return table.toString();
}

function createFileResultsTable(fileResults: FileResult[]): CliTable3.Table {
    const table = new CliTable3({
        head: [
            chalk.bold('File'),
            chalk.bold('Tests'),
            chalk.bold('Synced'),
            chalk.bold('Unmapped'),
            chalk.bold('Out of Sync'),
            chalk.bold('Errors'),
        ],
        colWidths: [50, 8, 10, 12, 15, 10],
        wordWrap: true,
    });

    for (const fileResult of fileResults) {
        const shortFile =
            fileResult.filePath.length > 48 ? '...' + fileResult.filePath.slice(-45) : fileResult.filePath;
        const errorDisplay =
            fileResult.validationErrorCount > 0
                ? chalk.red(fileResult.validationErrorCount.toString())
                : chalk.gray('0');

        table.push([
            shortFile,
            fileResult.testCount.toString(),
            chalk.green(fileResult.syncedCount.toString()),
            chalk.yellow(fileResult.unmappedCount.toString()),
            chalk.red(fileResult.outOfSyncCount.toString()),
            errorDisplay,
        ]);
    }

    return table;
}

function createIssuesTable(fileResults: FileResult[]): CliTable3.Table {
    const issuesTable = new CliTable3({
        head: [chalk.bold('Test'), chalk.bold('Status'), chalk.bold('Issue')],
        colWidths: [50, 15, 70],
        wordWrap: true,
    });

    for (const fileResult of fileResults) {
        for (const issue of fileResult.issues) {
            const statusColor = getStatusColor(issue.syncStatus);
            const shortTitle = issue.testTitle.length > 48 ? issue.testTitle.slice(0, 45) + '...' : issue.testTitle;
            issuesTable.push([shortTitle, statusColor(issue.syncStatus), chalk.gray(issue.message)]);
        }
    }

    return issuesTable;
}

/**
 * Get appropriate color function for sync status
 */
function getStatusColor(status: SyncStatus): (text: string) => string {
    switch (status) {
        case SyncStatus.Synced:
            return chalk.green;
        case SyncStatus.Unsynced:
            return chalk.yellow;
        case SyncStatus.NeedsUpdate:
            return chalk.red;
        case SyncStatus.Conflict:
            return chalk.magenta;
        case SyncStatus.Orphaned:
            return chalk.gray;
        default:
            return chalk.white;
    }
}
