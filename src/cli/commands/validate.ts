/**
 * Validate Command
 *
 * CLI command to validate Playwright test documentation.
 * Parses test files and validates against configurable rules.
 */

import { Command } from 'commander';
import { TestParser } from '../../core/parser.js';
import { Validator } from '../../core/validator.js';
import { DEFAULT_CONFIG } from '../../models/configuration.js';
import { formatValidationResults } from '../utils/formatters.js';
import fastGlob from 'fast-glob';
import { statSync, writeFileSync } from 'fs';
import { isAbsolute, join, resolve } from 'path';
import ora from 'ora';

interface ValidateOptions {
    format: 'table' | 'json' | 'quiet';
    output?: string;
}

export const validateCommand = new Command('validate')
    .description('Validate test file documentation quality')
    .argument('[path]', 'Path to test file or directory', '**/*.spec.ts')
    .option('-f, --format <type>', 'Output format: table, json, quiet', 'table')
    .option('-o, --output <file>', 'Write results to file')
    // eslint-disable-next-line complexity, max-lines-per-function
    .action(async (path: string, options: ValidateOptions) => {
        const spinner = ora('Scanning for test files...').start();

        try {
            // Resolve path
            const resolvedPath = isAbsolute(path) ? path : resolve(process.cwd(), path);

            // Determine search patterns based on whether path is a directory or file pattern
            let searchPatterns: string[];

            try {
                const stats = statSync(resolvedPath);
                if (stats.isDirectory()) {
                    // If it's a directory, apply testFiles.patterns within that directory
                    searchPatterns = DEFAULT_CONFIG.testFiles.patterns.map((pattern) => join(resolvedPath, pattern));
                } else {
                    // If it's a file, use it directly
                    searchPatterns = [resolvedPath];
                }
            } catch {
                // Path doesn't exist or is a glob pattern, use it as-is
                searchPatterns = [resolvedPath];
            }

            // Find test files
            const files = await fastGlob(searchPatterns, {
                absolute: true,
                ignore: DEFAULT_CONFIG.testFiles.exclude,
            });

            if (files.length === 0) {
                spinner.fail('No test files found');
                process.exit(1);
            }

            spinner.text = `Found ${files.length} test file(s). Validating...`;

            // Initialize parser and validator
            const parser = new TestParser(DEFAULT_CONFIG.validation.projectKey);
            const validator = new Validator(DEFAULT_CONFIG.validation);

            // Parse and validate each file
            const results = [];
            let totalTests = 0;
            let validTests = 0;
            let totalIssues = 0;

            for (const file of files) {
                try {
                    const parseResult = parser.parseTestFile(file);

                    for (const test of parseResult.tests) {
                        totalTests++;
                        const validationResult = validator.validate(test);

                        if (validationResult.isValid) {
                            validTests++;
                        }

                        totalIssues += validationResult.issues.length;

                        results.push({
                            file: parseResult.filePath,
                            test: test.title,
                            valid: validationResult.isValid,
                            issues: validationResult.issues,
                        });
                    }
                } catch (error) {
                    spinner.warn(`Failed to parse ${file}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            spinner.succeed(`Validated ${totalTests} test(s) from ${files.length} file(s)`);

            // Format and output results
            const output = formatValidationResults(results, options.format);

            if (options.output) {
                writeFileSync(options.output, output, 'utf-8');
                // eslint-disable-next-line no-console
                console.log(`\nResults written to: ${options.output}`);
            } else if (options.format !== 'quiet') {
                // eslint-disable-next-line no-console
                console.log('\n' + output);
            }

            // Print summary
            if (options.format !== 'quiet') {
                /* eslint-disable no-console */
                console.log('\n=== Summary ===');
                console.log(`Total tests: ${totalTests}`);
                console.log(`Valid tests: ${validTests}`);
                console.log(`Failed tests: ${totalTests - validTests}`);
                console.log(`Total issues: ${totalIssues}`);
                /* eslint-enable no-console */
            }

            // Exit with error code if validation failed
            if (validTests < totalTests) {
                process.exit(1);
            }
        } catch (error) {
            spinner.fail(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    });
