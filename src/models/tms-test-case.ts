/**
 * TMS Test Case Model
 *
 * Represents a test case in the Test Management System (Zephyr Scale).
 * Maps between our internal format and Zephyr's API format.
 */

/**
 * Test case priority in TMS
 */
export enum TMSPriority {
    Low = 'Low',
    Normal = 'Normal',
    High = 'High',
    Critical = 'Critical',
}

/**
 * Test case status in TMS
 */
export enum TMSStatus {
    Draft = 'Draft',
    Approved = 'Approved',
    Deprecated = 'Deprecated',
}

/**
 * Test case in TMS (Zephyr Scale format)
 */
export interface TMSTestCase {
    /** TMS internal key (numeric ID) */
    key: string;

    /** Test case ID (e.g., MM-T12345) */
    id: string;

    /** Project key (e.g., MM) */
    projectKey: string;

    /** Test case name/title */
    name: string;

    /** Test objective/description */
    objective: string;

    /** Preconditions for test execution */
    precondition: string | null;

    /** Test case priority */
    priority: TMSPriority;

    /** Test case status */
    status: TMSStatus;

    /** Labels/tags */
    labels: string[];

    /** Folder path in TMS */
    folder: string | null;

    /** Test script steps */
    testScript: TMSTestStep[];

    /** Custom fields */
    customFields: Record<string, unknown>;

    /** Created timestamp */
    createdOn: string;

    /** Updated timestamp */
    updatedOn: string;

    /** Version number */
    version: number;

    /** Owner/creator */
    owner: string;
}

/**
 * Test step in TMS test script
 */
export interface TMSTestStep {
    /** Step number (1-based index) */
    index: number;

    /** Step description */
    description: string;

    /** Expected result */
    expectedResult: string;

    /** Test data (optional) */
    testData: string | null;
}

/**
 * Request payload for creating test case in TMS
 */
export interface CreateTestCaseRequest {
    projectKey: string;
    name: string;
    objective: string;
    precondition?: string;
    priority?: TMSPriority;
    status?: TMSStatus;
    labels?: string[];
    folder?: string;
    testScript?: TMSTestStep[];
    customFields?: Record<string, unknown>;
}

/**
 * Request payload for updating test case in TMS
 */
export interface UpdateTestCaseRequest {
    name?: string;
    objective?: string;
    precondition?: string;
    priority?: TMSPriority;
    status?: TMSStatus;
    labels?: string[];
    folder?: string;
    testScript?: TMSTestStep[];
    customFields?: Record<string, unknown>;
}

/**
 * Response from TMS API
 */
export interface TMSApiResponse<T> {
    data: T;
    status: number;
    headers: Record<string, string>;
}

/**
 * TMS API error response
 */
export interface TMSApiError {
    errorCode: string;
    message: string;
    details?: Record<string, unknown>;
}

/**
 * Convert parsed test to TMS create request
 */
export function createTestCaseFromParsed(
    parsedTest: {
        testTitle: string;
        objective: string;
        preconditions: string[];
        tags: string[];
        actionSteps: Array<{ description: string }>;
        verificationSteps: Array<{ description: string }>;
    },
    projectKey: string
): CreateTestCaseRequest {
    // Combine action and verification steps into test script
    const testScript: TMSTestStep[] = [];
    let index = 1;

    // Add action steps
    for (const action of parsedTest.actionSteps) {
        testScript.push({
            index: index++,
            description: action.description,
            expectedResult: '', // Will be filled by next verification step
            testData: null,
        });
    }

    // Add verification steps as expected results
    for (let i = 0; i < parsedTest.verificationSteps.length; i++) {
        const verification = parsedTest.verificationSteps[i];
        if (verification) {
            if (testScript[i]) {
                testScript[i]!.expectedResult = verification.description;
            } else {
                // Standalone verification
                testScript.push({
                    index: index++,
                    description: '',
                    expectedResult: verification.description,
                    testData: null,
                });
            }
        }
    }

    return {
        projectKey,
        name: parsedTest.testTitle,
        objective: parsedTest.objective,
        precondition: parsedTest.preconditions.length > 0 ? parsedTest.preconditions.join('\n') : undefined,
        priority: TMSPriority.Normal,
        status: TMSStatus.Draft,
        labels: parsedTest.tags.length > 0 ? parsedTest.tags : undefined,
        testScript: testScript.length > 0 ? testScript : undefined,
    };
}

/**
 * Extract test case ID from TMS response
 */
export function extractTestCaseId(testCase: TMSTestCase): string {
    return testCase.id;
}

/**
 * Check if TMS test case has been modified
 */
export function hasBeenModified(testCase: TMSTestCase, since: string): boolean {
    const updatedDate = new Date(testCase.updatedOn);
    const sinceDate = new Date(since);
    return updatedDate > sinceDate;
}
