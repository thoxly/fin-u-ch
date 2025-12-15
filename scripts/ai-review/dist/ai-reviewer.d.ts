import { ReviewComment, PullRequestFile } from './github-client.js';
export interface Finding {
    file: string;
    line: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'security' | 'performance' | 'bug' | 'style' | 'best-practice' | 'architecture';
    message: string;
    suggestion?: string;
}
export declare class AiReviewer {
    private openai;
    constructor();
    /**
     * Retry wrapper for API calls with exponential backoff
     */
    private retryApiCall;
    reviewCode(files: PullRequestFile[], diff: string, distilledContext: string): Promise<{
        comments: ReviewComment[];
        issues: Finding[];
        issuesWithoutInline: Finding[];
    }>;
    /**
     * Second-pass verifier.
     *
     * Takes the raw issues produced by the first model pass and asks the model
     * (with full tool access) to strictly verify each one against the real code.
     *
     * Rules for the verifier:
     * - MUST NOT invent new issues.
     * - MAY drop any issue that cannot be clearly confirmed from the code.
     * - SHOULD prefer dropping/downgrading over keeping uncertain issues.
     */
    private verifyFindings;
    private buildPrompt;
    private buildTools;
    private callTool;
    private parseFindings;
    private convertToReviewComments;
    private calculateDiffPosition;
}
//# sourceMappingURL=ai-reviewer.d.ts.map