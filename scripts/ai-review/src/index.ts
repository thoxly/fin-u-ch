#!/usr/bin/env node

import { validateConfig, CONFIG } from './config.js';
import { GitHubClient, ReviewComment } from './github-client.js';
import { AiReviewer, Finding } from './ai-reviewer.js';
import { getDistilledContext } from './distilled-context.js';

function buildBatchDiff(files: { filename: string; patch?: string }[]): string {
  const parts: string[] = [];

  for (const file of files) {
    if (!file.patch) continue;

    parts.push(
      [`diff --git a/${file.filename} b/${file.filename}`, file.patch].join(
        '\n'
      )
    );
  }

  return parts.join('\n\n');
}

async function main() {
  console.log('🤖 AI Code Review Agent\n');
  console.log('='.repeat(50));
  console.log('\n');

  // Validate configuration
  validateConfig();

  // Get PR number from environment or arguments
  const prNumber = parseInt(
    process.env.GITHUB_PR_NUMBER || process.argv[2] || '0',
    10
  );

  if (!prNumber) {
    console.error('Error: PR number is required');
    console.error('Usage: npm start <pr-number>');
    console.error('   or: GITHUB_PR_NUMBER=123 npm start');
    process.exit(1);
  }

  console.log(`Reviewing PR #${prNumber}\n`);

  try {
    // Initialize clients
    const githubClient = new GitHubClient();
    const aiReviewer = new AiReviewer();

    // Load distilled project context (with Redis caching)
    const distilledContext = await getDistilledContext();

    // Get PR files
    const files = await githubClient.getPullRequestFiles(prNumber);

    // Filter files (skip package-lock, generated files, etc.)
    const relevantFiles = files.filter((file) => {
      const skipPatterns = [
        /package-lock\.json$/,
        /pnpm-lock\.yaml$/,
        /\.d\.ts$/,
        /\.map$/,
        /dist\//,
        /node_modules\//,
        /coverage\//,
        /\.min\./,
      ];

      return !skipPatterns.some((pattern) => pattern.test(file.filename));
    });

    console.log(
      `Analyzing ${relevantFiles.length} files (${files.length - relevantFiles.length} skipped)\n`
    );

    if (relevantFiles.length === 0) {
      console.log('No relevant files to review. Exiting.');
      return;
    }

    // Get AI review in batches to avoid context limits on large PRs
    const maxPerBatch = CONFIG.review.maxFilesPerBatch || 10;
    const allComments: ReviewComment[] = [];
    const allIssues: Finding[] = [];
    const allIssuesWithoutInline: Finding[] = [];

    const totalBatches = Math.ceil(relevantFiles.length / maxPerBatch);

    for (let i = 0; i < relevantFiles.length; i += maxPerBatch) {
      const batchIndex = i / maxPerBatch + 1;
      const batchFiles = relevantFiles.slice(i, i + maxPerBatch);

      console.log(
        `\n--- Running AI review for batch ${batchIndex}/${totalBatches} (${batchFiles.length} files) ---`
      );

      const batchDiff = buildBatchDiff(batchFiles);

      const {
        comments: batchComments,
        issues: batchIssues,
        issuesWithoutInline: batchIssuesWithoutInline,
      } = await aiReviewer.reviewCode(batchFiles, batchDiff, distilledContext);

      console.log(
        `Batch ${batchIndex}/${totalBatches}: model reported ${batchIssues.length} issues, ${batchComments.length} have valid inline positions, ${batchIssuesWithoutInline.length} without inline positions\n`
      );

      allComments.push(...batchComments);
      allIssues.push(...batchIssues);
      allIssuesWithoutInline.push(...batchIssuesWithoutInline);
    }

    const comments = allComments;
    const issues = allIssues;

    console.log(
      `Found ${issues.length} total issues (${comments.length} with inline positions)\n`
    );

    if (issues.length === 0) {
      console.log('✅ No issues found!');

      // Dismiss previous REQUEST_CHANGES reviews from this bot
      await githubClient.dismissPreviousReviews(prNumber);

      const commitId = await githubClient.getLatestCommit(prNumber);

      // GitHub Actions cannot APPROVE PRs, use COMMENT instead
      const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
      const event = isGitHubActions ? 'COMMENT' : 'APPROVE';

      console.log(isGitHubActions ? 'Leaving comment...' : 'Approving PR...');

      await githubClient.createReview(
        prNumber,
        commitId,
        [],
        event,
        '✅ AI Code Review: No issues found. Code looks good!'
      );

      return;
    }

    // Analyze severity
    const criticalIssues = issues.filter((c) => c.severity === 'critical');
    const highIssues = issues.filter((c) => c.severity === 'high');
    const mediumIssues = issues.filter((c) => c.severity === 'medium');
    const lowIssues = issues.filter((c) => c.severity === 'low');

    // Build human-readable summary for issues that could not be mapped to inline diff positions.
    const maxNonInlineInSummary = 30;
    const uniqueNonInline: Finding[] = [];
    const seenKeys = new Set<string>();

    for (const issue of allIssuesWithoutInline) {
      const key = `${issue.file}:${issue.line}:${issue.message}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      uniqueNonInline.push(issue);
      if (uniqueNonInline.length >= maxNonInlineInSummary) break;
    }

    let nonInlineSection = '';
    if (uniqueNonInline.length > 0) {
      const lines = uniqueNonInline.map((i) => {
        const prefix = `[${i.severity.toUpperCase()}][${i.category}]`;
        const suggestionPart = i.suggestion
          ? ` — Suggestion: ${i.suggestion}`
          : '';
        return `- ${prefix} ${i.file}:${i.line} — ${i.message}${suggestionPart}`;
      });

      const extraCount = allIssuesWithoutInline.length - uniqueNonInline.length;
      const truncatedNote =
        extraCount > 0
          ? `\n\n_(+${extraCount} more issues without inline positions not listed here)_`
          : '';

      nonInlineSection = `\n\n**Issues without inline comments (no diff mapping, e.g. unchanged lines or other batches):**\n\n${lines.join(
        '\n'
      )}${truncatedNote}`;
    }

    console.log('Issue breakdown:');
    console.log(`  🔴 Critical: ${criticalIssues.length}`);
    console.log(`  🟠 High: ${highIssues.length}`);
    console.log(`  🟡 Medium: ${mediumIssues.length}`);
    console.log(`  🟢 Low: ${lowIssues.length}`);
    console.log('\n');

    // Determine review action
    // Note: Cannot REQUEST_CHANGES on your own PR, so always use COMMENT
    const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
    let reviewEvent: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
    let reviewBody: string;

    if (criticalIssues.length > 0) {
      reviewEvent = isGitHubActions ? 'REQUEST_CHANGES' : 'COMMENT';
      reviewBody = `🔴 **AI Code Review: Critical issues found**

Found ${criticalIssues.length} critical issue(s) that must be fixed before merging.

**Summary:**
- 🔴 Critical: ${criticalIssues.length}
- 🟠 High: ${highIssues.length}
- 🟡 Medium: ${mediumIssues.length}
- 🟢 Low: ${lowIssues.length}

Please address the critical issues and request a new review.${nonInlineSection}`;
    } else if (highIssues.length > 0) {
      reviewEvent = isGitHubActions ? 'REQUEST_CHANGES' : 'COMMENT';
      reviewBody = `🟠 **AI Code Review: Important issues found**

Found ${highIssues.length} high-severity issue(s) that should be fixed.

**Summary:**
- 🟠 High: ${highIssues.length}
- 🟡 Medium: ${mediumIssues.length}
- 🟢 Low: ${lowIssues.length}

Please address the issues and request a new review.${nonInlineSection}`;
    } else if (mediumIssues.length > 3) {
      reviewEvent = 'COMMENT';
      reviewBody = `🟡 **AI Code Review: Several improvements suggested**

Found ${mediumIssues.length} medium-severity suggestions.

**Summary:**
- 🟡 Medium: ${mediumIssues.length}
- 🟢 Low: ${lowIssues.length}

Consider addressing these before merging.${nonInlineSection}`;
    } else {
      reviewEvent = 'COMMENT';
      reviewBody = `ℹ️ **AI Code Review: Minor suggestions**

Found ${comments.length} minor suggestion(s) for improvement.

**Summary:**
- 🟡 Medium: ${mediumIssues.length}
- 🟢 Low: ${lowIssues.length}

These are optional improvements.${nonInlineSection}`;
    }

    // Dismiss previous REQUEST_CHANGES reviews from this bot
    await githubClient.dismissPreviousReviews(prNumber);

    // Create review (with safe fallback to summary-only comment on failure)
    const commitId = await githubClient.getLatestCommit(prNumber);
    try {
      await githubClient.createReview(
        prNumber,
        commitId,
        comments,
        reviewEvent,
        reviewBody
      );
    } catch (err) {
      console.warn(
        '  ⚠ Failed to create review with inline comments. Falling back to summary-only comment.',
        err
      );
      try {
        await githubClient.createReview(
          prNumber,
          commitId,
          [],
          'COMMENT',
          `${reviewBody}\n\n_(Inline comments unavailable due to diff mapping.)_`
        );
      } catch (fallbackErr) {
        console.warn(
          '  ⚠ Failed to create summary-only review comment as well.',
          fallbackErr
        );
        // If only medium/low suggestions, do not fail the job because of a commenting error
        if (criticalIssues.length === 0 && highIssues.length === 0) {
          console.log(
            'Continuing without publishing review since only minor suggestions were found.'
          );
          return;
        }
        // For critical/high issues, rethrow to fail the job
        throw fallbackErr;
      }
    }

    console.log(`✅ Review completed!\n`);
    console.log(`Event: ${reviewEvent}`);
    console.log(`Total comments: ${comments.length}`);

    // Exit with error code if critical or high issues found
    if (criticalIssues.length > 0 || highIssues.length > 0) {
      console.log('\n❌ Critical/High issues found - failing check');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error during review:', error);
    process.exit(1);
  }
}

main();
