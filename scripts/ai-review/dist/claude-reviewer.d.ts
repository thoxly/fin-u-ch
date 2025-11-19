import { ReviewComment, PullRequestFile } from './github-client.js';
export declare class ClaudeReviewer {
    private openai;
    constructor();
    reviewCode(files: PullRequestFile[], diff: string, projectContext: string): Promise<ReviewComment[]>;
    private buildPrompt;
    private parseClaudeResponse;
    private convertToReviewComments;
    private calculateDiffPosition;
}
//# sourceMappingURL=claude-reviewer.d.ts.map