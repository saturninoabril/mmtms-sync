#!/usr/bin/env node

/**
 * TM-Sync CLI Entry Point
 *
 * This is the main entry point for the tm-sync command-line interface.
 * It sets up the Commander.js program with all available commands.
 */

import { Command } from 'commander';
import { validateCommand } from './commands/validate.js';
import { scanCommand } from './commands/scan.js';

// Version will be injected by tsup or set manually
const VERSION = '0.1.0';

const program = new Command();

program.name('tm-sync').description('CLI tool for synchronizing Playwright tests with Zephyr Scale').version(VERSION);

// Add implemented commands
program.addCommand(validateCommand);
program.addCommand(scanCommand);

// Placeholder commands - will be implemented in Phase 5+
/* eslint-disable no-console */

program
    .command('create-cases [path]')
    .description('Create test cases in TMS for unsynced tests')
    .option('--dry-run', 'Preview changes without executing')
    .option('--batch-size <n>', 'Number of cases per batch', '10')
    .option('--delay <ms>', 'Delay between batches in milliseconds', '500')
    .action(() => {
        console.log('create-cases command - to be implemented in Phase 5');
    });

program
    .command('update-cases [path]')
    .description('Update existing test cases in TMS')
    .option('--conflict <strategy>', 'Conflict resolution: prompt, skip, overwrite, keep-tms')
    .option('--dry-run', 'Preview updates')
    .option('--batch-size <n>', 'Batch size', '10')
    .action(() => {
        console.log('update-cases command - to be implemented in Phase 6');
    });

program
    .command('assign-ids [path]')
    .description('Manually assign test case IDs to test files')
    .option('--file <path>', 'Specific test file')
    .option('--id <case-id>', 'Test case ID (format: PROJECT-T####)')
    .action(() => {
        console.log('assign-ids command - to be implemented in Phase 6');
    });

program
    .command('pull-from-tms [case-id]')
    .description('Fetch test case details from TMS')
    .option('--all', 'Fetch all cases for project')
    .option('--update-local', 'Update local mappings')
    .action(() => {
        console.log('pull-from-tms command - to be implemented in Phase 5');
    });

program
    .command('report [path]')
    .description('Generate sync status reports')
    .option('--format <type>', 'Report format: html, json, markdown, all')
    .option('--output <dir>', 'Output directory', '.tm-sync/reports')
    .action(() => {
        console.log('report command - to be implemented in Phase 10');
    });

program
    .command('interactive')
    .description('Interactive mode with guided workflows')
    .action(() => {
        console.log('interactive command - to be implemented in Phase 8');
    });
/* eslint-enable no-console */

program.parse();
