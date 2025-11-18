export interface PullRequestFile {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
}
export interface ReviewComment {
    path: string;
    position: number;
    body: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}
export declare class GitHubClient {
    private octokit;
    constructor();
    getPullRequestFiles(prNumber: number): Promise<PullRequestFile[]>;
    getPullRequestDiff(prNumber: number): Promise<string>;
    createReviewComment(prNumber: number, commitId: string, comment: ReviewComment): Promise<void>;
    createReview(prNumber: number, commitId: string, comments: ReviewComment[], event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body: string): Promise<void>;
    getLatestCommit(prNumber: number): Promise<string>;
    dismissPreviousReviews(prNumber: number): Promise<void>;
}
//# sourceMappingURL=github-client.d.ts.map