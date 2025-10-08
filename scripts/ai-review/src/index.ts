#!/usr/bin/env node

import { CONFIG, validateConfig } from './config.js';
import { loadProjectContext } from './context-loader.js';
import { GitHubClient } from './github-client.js';
import { ClaudeReviewer } from './claude-reviewer.js';

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
    const claudeReviewer = new ClaudeReviewer();

    // Load project context
    const projectContext = await loadProjectContext();

    // Get PR files and diff
    const files = await githubClient.getPullRequestFiles(prNumber);
    const diff = await githubClient.getPullRequestDiff(prNumber);

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

    // Get AI review
    const comments = await claudeReviewer.reviewCode(
      relevantFiles,
      diff,
      projectContext
    );

    console.log(`Found ${comments.length} issues\n`);

    if (comments.length === 0) {
      console.log('✅ No issues found!');

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
    const criticalIssues = comments.filter((c) => c.severity === 'critical');
    const highIssues = comments.filter((c) => c.severity === 'high');
    const mediumIssues = comments.filter((c) => c.severity === 'medium');
    const lowIssues = comments.filter((c) => c.severity === 'low');

    console.log('Issue breakdown:');
    console.log(`  🔴 Critical: ${criticalIssues.length}`);
    console.log(`  🟠 High: ${highIssues.length}`);
    console.log(`  🟡 Medium: ${mediumIssues.length}`);
    console.log(`  🟢 Low: ${lowIssues.length}`);
    console.log('\n');

    // Determine review action
    let reviewEvent: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
    let reviewBody: string;

    if (criticalIssues.length > 0) {
      reviewEvent = 'REQUEST_CHANGES';
      reviewBody = `🔴 **AI Code Review: Critical issues found**

Found ${criticalIssues.length} critical issue(s) that must be fixed before merging.

**Summary:**
- 🔴 Critical: ${criticalIssues.length}
- 🟠 High: ${highIssues.length}
- 🟡 Medium: ${mediumIssues.length}
- 🟢 Low: ${lowIssues.length}

Please address the critical issues and request a new review.`;
    } else if (highIssues.length > 0) {
      reviewEvent = 'REQUEST_CHANGES';
      reviewBody = `🟠 **AI Code Review: Important issues found**

Found ${highIssues.length} high-severity issue(s) that should be fixed.

**Summary:**
- 🟠 High: ${highIssues.length}
- 🟡 Medium: ${mediumIssues.length}
- 🟢 Low: ${lowIssues.length}

Please address the issues and request a new review.`;
    } else if (mediumIssues.length > 3) {
      reviewEvent = 'COMMENT';
      reviewBody = `🟡 **AI Code Review: Several improvements suggested**

Found ${mediumIssues.length} medium-severity suggestions.

**Summary:**
- 🟡 Medium: ${mediumIssues.length}
- 🟢 Low: ${lowIssues.length}

Consider addressing these before merging.`;
    } else {
      reviewEvent = 'COMMENT';
      reviewBody = `ℹ️ **AI Code Review: Minor suggestions**

Found ${comments.length} minor suggestion(s) for improvement.

**Summary:**
- 🟡 Medium: ${mediumIssues.length}
- 🟢 Low: ${lowIssues.length}

These are optional improvements.`;
    }

    // Create review
    const commitId = await githubClient.getLatestCommit(prNumber);
    await githubClient.createReview(
      prNumber,
      commitId,
      comments,
      reviewEvent,
      reviewBody
    );

    console.log(`✅ Review completed!\n`);
    console.log(`Event: ${reviewEvent}`);
    console.log(`Total comments: ${comments.length}`);

    // Exit with error code if critical issues found
    if (criticalIssues.length > 0) {
      console.log('\n❌ Critical issues found - failing check');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error during review:', error);
    process.exit(1);
  }
}

main();
