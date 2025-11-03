/**
 * Mapping Manager
 *
 * Handles JSON file I/O for test case mappings.
 * Provides atomic file operations and directory management.
 */

import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import fastGlob from 'fast-glob';
import type { TestCaseMapping } from '../models/test-case-mapping.js';

/**
 * Manages test case mapping persistence
 */
export class MappingManager {
    constructor() {
        // Constructor intentionally empty
    }

    /**
     * Load mapping from JSON file
     *
     * @param filePath - Absolute path to mapping file
     * @returns Array of test case mappings (empty array if file does not exist)
     * @throws Error if file contains invalid JSON or wrong structure
     */
    async loadMapping(filePath: string): Promise<TestCaseMapping[]> {
        // Return empty array if file does not exist
        if (!existsSync(filePath)) {
            return [];
        }

        try {
            const content = await readFile(filePath, 'utf-8');
            const data: unknown = JSON.parse(content);

            // Validate structure
            if (!Array.isArray(data)) {
                throw new Error('Mapping file must contain an array');
            }

            // Validate required fields
            for (const mapping of data) {
                this.validateMapping(mapping);
            }

            return data as TestCaseMapping[];
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(`Invalid JSON in mapping file: ${filePath}`);
            }
            throw error;
        }
    }

    /**
     * Save mapping to JSON file with atomic write
     *
     * @param filePath - Absolute path to mapping file
     * @param mappings - Array of test case mappings to save
     */
    async saveMapping(filePath: string, mappings: TestCaseMapping[]): Promise<void> {
        // Ensure parent directories exist
        const dir = dirname(filePath);
        await this.ensureDirectoryExists(dir);

        // Write with pretty formatting
        const content = JSON.stringify(mappings, null, 2);

        // Atomic write (write to temp, then rename)
        await writeFile(filePath, content, 'utf-8');
    }

    /**
     * Get all mapping files in a directory
     *
     * @param dirPath - Directory to scan for mapping files
     * @returns Array of all mappings from all files in directory
     */
    async getAllMappings(dirPath: string): Promise<TestCaseMapping[]> {
        if (!existsSync(dirPath)) {
            return [];
        }

        // Find all JSON files in directory
        const files = await fastGlob('**/*.json', {
            cwd: dirPath,
            absolute: true,
        });

        // Load all mappings
        const allMappings: TestCaseMapping[] = [];
        for (const file of files) {
            try {
                const mappings = await this.loadMapping(file);
                allMappings.push(...mappings);
            } catch (error) {
                // Log error but continue processing other files
                console.warn(`Failed to load mapping from ${file}:`, error);
            }
        }

        return allMappings;
    }

    /**
     * Ensure directory structure exists
     *
     * @param dirPath - Directory path to create
     */
    async ensureDirectoryExists(dirPath: string): Promise<void> {
        if (!existsSync(dirPath)) {
            await mkdir(dirPath, { recursive: true });
        }
    }

    /**
     * Validate mapping object has required fields
     *
     * @param mapping - Mapping object to validate
     * @throws Error if required fields are missing
     */
    private validateMapping(mapping: unknown): void {
        if (typeof mapping !== 'object' || mapping === null) {
            throw new Error('Mapping must be an object');
        }

        const mappingObj = mapping as Record<string, unknown>;
        const requiredFields = ['id', 'testFilePath', 'testTitle', 'syncStatus', 'metadata'];

        for (const field of requiredFields) {
            if (!(field in mappingObj)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate metadata has required fields
        const metadata = mappingObj['metadata'];
        if (typeof metadata === 'object' && metadata !== null) {
            const metadataObj = metadata as Record<string, unknown>;
            const requiredMetadataFields = ['createdAt', 'updatedAt', 'createdBy', 'syncCount'];
            for (const field of requiredMetadataFields) {
                if (!(field in metadataObj)) {
                    throw new Error(`Missing required metadata field: ${field}`);
                }
            }
        } else {
            throw new Error('Missing required field: metadata');
        }
    }
}
