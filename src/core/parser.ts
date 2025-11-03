/**
 * Test Parser
 *
 * Parses Playwright test files using TypeScript Compiler API to extract:
 * - JSDoc tags (@objective, @precondition, @known_issue)
 * - Playwright native tags (from test configuration: {tag: [...]})
 * - Action step comments (// #)
 * - Verification step comments (// *)
 * - Test case IDs from test titles
 * - Test metadata (title, type, location)
 *
 * NOTE: @tags JSDoc tag is NOT supported. Use Playwright's native tagging instead.
 */

import { type CallExpression, Node, Project, SourceFile } from 'ts-morph';
import { readFileSync } from 'fs';
import type { JSDocTags, ParsedTest, ParseResult, TestStep } from '../models/parsed-test';
import { ParserError } from '../utils/error-handler';

/**
 * TestParser class for parsing Playwright test files
 */
export class TestParser {
    private project: Project;
    private projectKey: string;

    constructor(projectKey: string = 'MM') {
        this.projectKey = projectKey;
        this.project = new Project({
            useInMemoryFileSystem: true,
            compilerOptions: {
                target: 99, // ESNext
                module: 99, // ESNext
            },
        });
    }

    /**
     * Parse a test file from disk
     * T046: TestParser class, T047: parseTestFile() method
     */
    parseTestFile(filePath: string): ParseResult {
        try {
            const content = readFileSync(filePath, 'utf-8');
            return this.parseTestCode(content, filePath);
        } catch (error) {
            if (error instanceof Error) {
                throw new ParserError(`Failed to read file ${filePath}: ${error.message}`, filePath);
            }
            throw error;
        }
    }

    /**
     * Parse test code string (for testing)
     * T047: parseTestFile() method - create AST and extract test functions
     */
    parseTestCode(code: string, filePath: string): ParseResult {
        try {
            const sourceFile = this.project.createSourceFile(filePath, code, {
                overwrite: true,
            });
            const tests = this.extractTests(sourceFile);

            return {
                filePath,
                tests,
                totalTests: tests.length,
            };
        } catch (error) {
            if (error instanceof Error) {
                throw new ParserError(`Failed to parse file ${filePath}: ${error.message}`, filePath);
            }
            throw error;
        }
    }

    /**
     * Extract all test functions from source file
     */
    private extractTests(sourceFile: SourceFile): ParsedTest[] {
        const tests: ParsedTest[] = [];

        // Find all test() call expressions
        sourceFile.forEachDescendant((node) => {
            if (Node.isCallExpression(node)) {
                const test = this.parseTestCallExpression(node, sourceFile);
                if (test) {
                    tests.push(test);
                }
            }
        });

        return tests;
    }

    /**
     * Parse a single test call expression
     */
    // eslint-disable-next-line complexity, max-lines-per-function
    private parseTestCallExpression(node: CallExpression, sourceFile: SourceFile): ParsedTest | null {
        const expression = node.getExpression();
        let testType: 'test' | 'test.skip' | 'test.fixme' = 'test';

        // T044: Handle test(), test.skip(), test.fixme()
        if (Node.isIdentifier(expression) && expression.getText() === 'test') {
            testType = 'test';
        } else if (Node.isPropertyAccessExpression(expression)) {
            const object = expression.getExpression();
            const property = expression.getName();

            if (Node.isIdentifier(object) && object.getText() === 'test') {
                if (property === 'skip') {
                    testType = 'test.skip';
                } else if (property === 'fixme') {
                    testType = 'test.fixme';
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } else {
            return null;
        }

        const args = node.getArguments();
        if (args.length < 2) {
            return null;
        }

        // Extract title
        const titleArg = args[0];
        if (!Node.isStringLiteral(titleArg)) {
            return null;
        }
        const title = titleArg.getLiteralValue();

        // T043: Extract test case ID from title
        const testCaseId = this.extractTestCaseId(title);

        // Extract JSDoc tags from leading comments or file-level JSDoc
        const jsdocTags = this.extractJSDocTags(sourceFile);

        // Extract function body - can be 2nd or 3rd argument (if tags/options are provided)
        // test('title', async () => {}) or test('title', {options}, async () => {})
        let functionArg = args[1];
        let playwrightTags: string[] = [];

        // Check if there's an options object with tags
        if (args.length >= 3) {
            const optionsArg = args[1];
            if (Node.isObjectLiteralExpression(optionsArg)) {
                // Extract tags from {tag: ['@tag1', '@tag2']}
                const tagProperty = optionsArg.getProperty('tag');
                if (tagProperty && Node.isPropertyAssignment(tagProperty)) {
                    const initializer = tagProperty.getInitializer();
                    if (initializer && Node.isArrayLiteralExpression(initializer)) {
                        playwrightTags = initializer
                            .getElements()
                            .filter(Node.isStringLiteral)
                            .map((el) => el.getLiteralValue());
                    }
                }
            }
            functionArg = args[2];
        }

        if (!Node.isArrowFunction(functionArg) && !Node.isFunctionExpression(functionArg)) {
            return null;
        }

        // Add Playwright tags to JSDoc tags
        if (playwrightTags.length > 0) {
            jsdocTags.playwrightTags = playwrightTags;
        }

        const body = functionArg.getBody();
        if (!Node.isBlock(body)) {
            return null;
        }

        // T049: Extract action steps (// #)
        const actionSteps = this.extractActionSteps(body);

        // T050: Extract verification steps (// *)
        const verificationSteps = this.extractVerificationSteps(body);

        // Get line number
        const lineNumber = node.getStartLineNumber();

        return {
            title,
            testCaseId,
            type: testType,
            jsdocTags,
            actionSteps,
            verificationSteps,
            lineNumber,
        };
    }

    /**
     * T048: Extract JSDoc tags (@objective, @precondition, @known_issue)
     * NOTE: @tags is NOT supported - use Playwright's native tagging instead
     */
    private extractJSDocTags(sourceFile: SourceFile): JSDocTags {
        const tags: JSDocTags = {};
        const fullText = sourceFile.getFullText();
        const jsdocMatches = fullText.match(/\/\*\*[\s\S]*?\*\//g);

        if (!jsdocMatches || jsdocMatches.length === 0) {
            return tags;
        }

        const jsdocText = jsdocMatches[0];

        // Extract @objective
        const objective = this.extractJSDocTag(jsdocText, 'objective');
        if (objective) tags.objective = objective;

        // Extract @precondition (can be multiple)
        const preconditions = this.extractJSDocTagMultiple(jsdocText, 'precondition');
        if (preconditions.length === 1) {
            tags.precondition = preconditions[0];
        } else if (preconditions.length > 1) {
            tags.precondition = preconditions;
        }

        // Extract @known_issue
        const knownIssue = this.extractJSDocTag(jsdocText, 'known_issue');
        if (knownIssue) tags.knownIssue = knownIssue;

        return tags;
    }

    private extractJSDocTag(jsdocText: string, tagName: string): string | null {
        const match = jsdocText.match(new RegExp(`@${tagName}\\s+(.+?)(?:\\n\\s*\\*\\s*@|\\n\\s*\\*\\/|$)`, 's'));
        if (!match || !match[1]) return null;

        return match[1]
            .split('\n')
            .map((line) => line.trim().replace(/^\*\s*/, ''))
            .filter((line) => line.length > 0)
            .join(' ');
    }

    private extractJSDocTagMultiple(jsdocText: string, tagName: string): string[] {
        const regex = new RegExp(`@${tagName}\\s+(.+?)(?:\\n\\s*\\*\\s*@|\\n\\s*\\*\\/|$)`, 'gs');
        const matches = jsdocText.matchAll(regex);
        const results: string[] = [];

        for (const match of matches) {
            if (match[1]) {
                const cleaned = match[1]
                    .split('\n')
                    .map((line) => line.trim().replace(/^\*\s*/, ''))
                    .filter((line) => line.length > 0)
                    .join(' ');
                results.push(cleaned);
            }
        }

        return results;
    }

    /**
     * T049: Extract action step comments (// #)
     */
    private extractActionSteps(body: Node): TestStep[] {
        const steps: TestStep[] = [];
        const sourceFile = body.getSourceFile();
        const seenPositions = new Set<number>();

        body.forEachDescendant((node) => {
            const leadingComments = node.getLeadingCommentRanges();

            for (const comment of leadingComments) {
                const pos = comment.getPos();
                // Skip if we've already processed this comment
                if (seenPositions.has(pos)) {
                    continue;
                }
                seenPositions.add(pos);

                const text = comment.getText();

                // Check for action comment (// #)
                if (text.trim().startsWith('// #')) {
                    const stepText = text.trim().substring(4).trim();
                    const lineNumber = sourceFile.getLineAndColumnAtPos(pos).line;

                    steps.push({
                        text: stepText,
                        lineNumber,
                    });
                }
            }
        });

        return steps;
    }

    /**
     * T050: Extract verification step comments (// *)
     */
    private extractVerificationSteps(body: Node): TestStep[] {
        const steps: TestStep[] = [];
        const sourceFile = body.getSourceFile();
        const seenPositions = new Set<number>();

        body.forEachDescendant((node) => {
            const leadingComments = node.getLeadingCommentRanges();

            for (const comment of leadingComments) {
                const pos = comment.getPos();
                // Skip if we've already processed this comment
                if (seenPositions.has(pos)) {
                    continue;
                }
                seenPositions.add(pos);

                const text = comment.getText();

                // Check for verification comment (// *)
                if (text.trim().startsWith('// *')) {
                    const stepText = text.trim().substring(4).trim();
                    const lineNumber = sourceFile.getLineAndColumnAtPos(pos).line;

                    steps.push({
                        text: stepText,
                        lineNumber,
                    });
                }
            }
        });

        return steps;
    }

    /**
     * T051: Extract test case ID from title (e.g., MM-T12345)
     */
    private extractTestCaseId(title: string): string | undefined {
        // Extract test case ID using configured project key
        const pattern = new RegExp(`^(${this.projectKey}-T\\d+):`);
        const match = title.match(pattern);
        return match ? match[1] : undefined;
    }
}
