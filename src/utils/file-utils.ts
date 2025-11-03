/**
 * File System Utilities
 *
 * Provides safe file system operations with proper error handling.
 * Wraps Node.js fs/promises with our custom error types.
 */

import { constants } from 'fs';
import { access, readFile as fsReadFile, writeFile as fsWriteFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { glob as tinyGlob } from 'tinyglobby';
import { FileSystemError } from './error-handler.js';

/**
 * Read file contents as string
 */
export async function readFile(filePath: string): Promise<string> {
    try {
        const absolutePath = resolve(filePath);
        const content = await fsReadFile(absolutePath, 'utf-8');
        return content;
    } catch (error) {
        throw new FileSystemError(`Failed to read file: ${(error as Error).message}`, 'read', filePath);
    }
}

/**
 * Write content to file (creates parent directories if needed)
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
    try {
        const absolutePath = resolve(filePath);

        // Ensure parent directory exists
        await ensureDir(dirname(absolutePath));

        // Write file
        await fsWriteFile(absolutePath, content, 'utf-8');
    } catch (error) {
        throw new FileSystemError(`Failed to write file: ${(error as Error).message}`, 'write', filePath);
    }
}

/**
 * Write JSON content to file
 */
export async function writeJson(filePath: string, data: unknown): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await writeFile(filePath, content);
}

/**
 * Read and parse JSON file
 */
export async function readJson<T = unknown>(filePath: string): Promise<T> {
    const content = await readFile(filePath);
    try {
        return JSON.parse(content) as T;
    } catch (error) {
        throw new FileSystemError(`Failed to parse JSON: ${(error as Error).message}`, 'read', filePath);
    }
}

/**
 * Ensure directory exists (creates if needed)
 */
export async function ensureDir(dirPath: string): Promise<void> {
    try {
        const absolutePath = resolve(dirPath);
        await mkdir(absolutePath, { recursive: true });
    } catch (error) {
        throw new FileSystemError(`Failed to create directory: ${(error as Error).message}`, 'create', dirPath);
    }
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
    try {
        const absolutePath = resolve(filePath);
        await access(absolutePath, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if file is readable
 */
export async function isReadable(filePath: string): Promise<boolean> {
    try {
        const absolutePath = resolve(filePath);
        await access(absolutePath, constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if file is writable
 */
export async function isWritable(filePath: string): Promise<boolean> {
    try {
        const absolutePath = resolve(filePath);
        await access(absolutePath, constants.W_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * Find files matching glob patterns
 */
export async function glob(
    patterns: string[],
    options: {
        cwd?: string;
        ignore?: string[];
        absolute?: boolean;
    } = {}
): Promise<string[]> {
    try {
        const files = await tinyGlob(patterns, {
            cwd: options.cwd || process.cwd(),
            ignore: options.ignore || [],
            absolute: options.absolute !== false,
            onlyFiles: true,
            dot: false,
        });

        return files;
    } catch (error) {
        throw new FileSystemError(`Failed to glob files: ${(error as Error).message}`, 'read', patterns.join(', '));
    }
}

/**
 * Delete file
 */
export async function deleteFile(filePath: string): Promise<void> {
    try {
        const { unlink } = await import('fs/promises');
        const absolutePath = resolve(filePath);
        await unlink(absolutePath);
    } catch (error) {
        throw new FileSystemError(`Failed to delete file: ${(error as Error).message}`, 'delete', filePath);
    }
}
