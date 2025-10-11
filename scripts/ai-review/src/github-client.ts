import { Octokit } from '@octokit/rest';
import { CONFIG } from './config.js';

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

export class GitHubClient {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: CONFIG.github.token,
    });
  }

  async getPullRequestFiles(prNumber: number): Promise<PullRequestFile[]> {
    console.log(`Fetching files for PR #${prNumber}...`);

    const { data } = await this.octokit.pulls.listFiles({
      owner: CONFIG.github.owner,
      repo: CONFIG.github.repo,
      pull_number: prNumber,
    });

    console.log(`  Found ${data.length} changed files\n`);

    return data;
  }

  async getPullRequestDiff(prNumber: number): Promise<string> {
    console.log(`Fetching diff for PR #${prNumber}...`);

    const { data } = await this.octokit.pulls.get({
      owner: CONFIG.github.owner,
      repo: CONFIG.github.repo,
      pull_number: prNumber,
      mediaType: {
        format: 'diff',
      },
    });

    return data as unknown as string;
  }

  async createReviewComment(
    prNumber: number,
    commitId: string,
    comment: ReviewComment
  ): Promise<void> {
    await this.octokit.pulls.createReviewComment({
      owner: CONFIG.github.owner,
      repo: CONFIG.github.repo,
      pull_number: prNumber,
      commit_id: commitId,
      path: comment.path,
      position: comment.position,
      body: `**[${comment.severity.toUpperCase()}]** ${comment.body}`,
    });
  }

  async createReview(
    prNumber: number,
    commitId: string,
    comments: ReviewComment[],
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
    body: string
  ): Promise<void> {
    console.log(`Creating review for PR #${prNumber}...`);

    const reviewComments = comments.map((comment) => ({
      path: comment.path,
      position: comment.position,
      body: `**[${comment.severity.toUpperCase()}]** ${comment.body}`,
    }));

    await this.octokit.pulls.createReview({
      owner: CONFIG.github.owner,
      repo: CONFIG.github.repo,
      pull_number: prNumber,
      commit_id: commitId,
      event,
      body,
      comments: reviewComments,
    });

    console.log(`  Review created with ${comments.length} comments\n`);
  }

  async getLatestCommit(prNumber: number): Promise<string> {
    const { data } = await this.octokit.pulls.listCommits({
      owner: CONFIG.github.owner,
      repo: CONFIG.github.repo,
      pull_number: prNumber,
    });

    return data[data.length - 1].sha;
  }

  async dismissPreviousReviews(prNumber: number): Promise<void> {
    console.log(`Checking for previous reviews to dismiss...`);

    try {
      const { data: reviews } = await this.octokit.pulls.listReviews({
        owner: CONFIG.github.owner,
        repo: CONFIG.github.repo,
        pull_number: prNumber,
      });

      // Find reviews from github-actions bot with REQUEST_CHANGES
      const botReviews = reviews.filter(
        (review) =>
          review.user?.login === 'github-actions[bot]' &&
          review.state === 'CHANGES_REQUESTED'
      );

      if (botReviews.length === 0) {
        console.log('  No previous REQUEST_CHANGES reviews to dismiss\n');
        return;
      }

      console.log(`  Found ${botReviews.length} previous review(s) to dismiss`);

      for (const review of botReviews) {
        await this.octokit.pulls.dismissReview({
          owner: CONFIG.github.owner,
          repo: CONFIG.github.repo,
          pull_number: prNumber,
          review_id: review.id,
          message: 'Issues have been addressed in latest commits',
        });
        console.log(`  ✅ Dismissed review #${review.id}`);
      }

      console.log('');
    } catch (error) {
      console.warn('  ⚠️  Failed to dismiss previous reviews:', error);
    }
  }
}
