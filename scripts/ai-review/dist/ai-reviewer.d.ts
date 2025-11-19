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
    reviewCode(files: PullRequestFile[], diff: string, distilledContext: string): Promise<{
        comments: ReviewComment[];
        issues: Finding[];
        issuesWithoutInline: Finding[];
    }>;
    private buildPrompt;
    private buildTools;
    private callTool;
    private parseFindings;
    private convertToReviewComments;
    private calculateDiffPosition;
}
//# sourceMappingURL=ai-reviewer.d.ts.map