#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { validateConfig, CONFIG } from './config.js';
import { GitHubClient } from './github-client.js';
import { AiReviewer } from './ai-reviewer.js';
import { getDistilledContext } from './distilled-context.js';
function buildBatchDiff(files) {
    const parts = [];
    for (const file of files) {
        if (!file.patch)
            continue;
        parts.push([`diff --git a/${file.filename} b/${file.filename}`, file.patch].join('\n'));
    }
    return parts.join('\n\n');
}
async function saveFullReport(prNumber, allIssues, allComments, allIssuesWithoutInline) {
    const reportDir = path.join(CONFIG.review.projectRoot, '.ai-review-reports');
    await fs.mkdir(reportDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = path.join(reportDir, `pr-${prNumber}-${timestamp}.json`);
    const markdownPath = path.join(reportDir, `pr-${prNumber}-${timestamp}.md`);
    // Group issues by severity
    const criticalIssues = allIssues.filter((i) => i.severity === 'critical');
    const highIssues = allIssues.filter((i) => i.severity === 'high');
    const mediumIssues = allIssues.filter((i) => i.severity === 'medium');
    const lowIssues = allIssues.filter((i) => i.severity === 'low');
    // Save JSON report
    const jsonReport = {
        prNumber,
        timestamp: new Date().toISOString(),
        summary: {
            total: allIssues.length,
            critical: criticalIssues.length,
            high: highIssues.length,
            medium: mediumIssues.length,
            low: lowIssues.length,
            withInlinePositions: allComments.length,
            withoutInlinePositions: allIssuesWithoutInline.length,
        },
        issues: allIssues,
        comments: allComments,
        issuesWithoutInline: allIssuesWithoutInline,
    };
    await fs.writeFile(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf-8');
    // Generate Markdown report
    const markdownLines = [
        `# AI Code Review Report - PR #${prNumber}`,
        '',
        `**Generated:** ${new Date().toISOString()}`,
        '',
        '## Summary',
        '',
        `- 🔴 **Critical:** ${criticalIssues.length}`,
        `- 🟠 **High:** ${highIssues.length}`,
        `- 🟡 **Medium:** ${mediumIssues.length}`,
        `- 🟢 **Low:** ${lowIssues.length}`,
        '',
        `**Total Issues:** ${allIssues.length}`,
        `- With inline positions: ${allComments.length}`,
        `- Without inline positions: ${allIssuesWithoutInline.length}`,
        '',
        '---',
        '',
    ];
    // Add issues grouped by severity
    const severityGroups = [
        { name: 'Critical Issues', issues: criticalIssues, emoji: '🔴' },
        { name: 'High Issues', issues: highIssues, emoji: '🟠' },
        { name: 'Medium Issues', issues: mediumIssues, emoji: '🟡' },
        { name: 'Low Issues', issues: lowIssues, emoji: '🟢' },
    ];
    for (const group of severityGroups) {
        if (group.issues.length === 0)
            continue;
        markdownLines.push(`## ${group.emoji} ${group.name} (${group.issues.length})`, '');
        // Group by file
        const issuesByFile = new Map();
        for (const issue of group.issues) {
            if (!issuesByFile.has(issue.file)) {
                issuesByFile.set(issue.file, []);
            }
            issuesByFile.get(issue.file).push(issue);
        }
        for (const [file, fileIssues] of issuesByFile.entries()) {
            markdownLines.push(`### \`${file}\``, '');
            for (const issue of fileIssues) {
                const category = issue.category.toUpperCase();
                const suggestion = issue.suggestion
                    ? `\n  💡 **Suggestion:** ${issue.suggestion}`
                    : '';
                markdownLines.push(`- **Line ${issue.line}** [${category}]: ${issue.message}${suggestion}`);
            }
            markdownLines.push('');
        }
    }
    // Add issues without inline positions
    if (allIssuesWithoutInline.length > 0) {
        markdownLines.push('---', '');
        markdownLines.push(`## Issues Without Inline Positions (${allIssuesWithoutInline.length})`, '');
        markdownLines.push('_These issues could not be mapped to specific diff positions._', '');
        const nonInlineByFile = new Map();
        for (const issue of allIssuesWithoutInline) {
            if (!nonInlineByFile.has(issue.file)) {
                nonInlineByFile.set(issue.file, []);
            }
            nonInlineByFile.get(issue.file).push(issue);
        }
        for (const [file, fileIssues] of nonInlineByFile.entries()) {
            markdownLines.push(`### \`${file}\``, '');
            for (const issue of fileIssues) {
                const category = issue.category.toUpperCase();
                const severity = issue.severity.toUpperCase();
                const suggestion = issue.suggestion
                    ? `\n  💡 **Suggestion:** ${issue.suggestion}`
                    : '';
                markdownLines.push(`- **Line ${issue.line}** [${severity}][${category}]: ${issue.message}${suggestion}`);
            }
            markdownLines.push('');
        }
    }
    await fs.writeFile(markdownPath, markdownLines.join('\n'), 'utf-8');
    console.log(`\n📄 Full report saved:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   Markdown: ${markdownPath}\n`);
    return { jsonPath, markdownPath };
}
async function main() {
    console.log('🤖 AI Code Review Agent\n');
    console.log('='.repeat(50));
    console.log('\n');
    // Validate configuration
    validateConfig();
    // Get PR number from environment or arguments
    const prNumber = parseInt(process.env.GITHUB_PR_NUMBER || process.argv[2] || '0', 10);
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
        // Filter files (skip package-lock, generated files, docs, etc.)
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
                /\.md$/i, // Skip markdown files (can still read them for context via tools)
            ];
            return !skipPatterns.some((pattern) => pattern.test(file.filename));
        });
        console.log(`Analyzing ${relevantFiles.length} files (${files.length - relevantFiles.length} skipped)\n`);
        if (relevantFiles.length === 0) {
            console.log('No relevant files to review. Exiting.');
            // Явно завершаем процесс, чтобы GitHub Actions/job не "залипали"
            process.exit(0);
        }
        // Get AI review in batches to avoid context limits on large PRs
        const maxPerBatch = CONFIG.review.maxFilesPerBatch || 10;
        const allComments = [];
        const allIssues = [];
        const allIssuesWithoutInline = [];
        const totalBatches = Math.ceil(relevantFiles.length / maxPerBatch);
        for (let i = 0; i < relevantFiles.length; i += maxPerBatch) {
            const batchIndex = i / maxPerBatch + 1;
            const batchFiles = relevantFiles.slice(i, i + maxPerBatch);
            console.log(`\n--- Running AI review for batch ${batchIndex}/${totalBatches} (${batchFiles.length} files) ---`);
            const batchDiff = buildBatchDiff(batchFiles);
            const { comments: batchComments, issues: batchIssues, issuesWithoutInline: batchIssuesWithoutInline, } = await aiReviewer.reviewCode(batchFiles, batchDiff, distilledContext);
            console.log(`Batch ${batchIndex}/${totalBatches}: model reported ${batchIssues.length} issues, ${batchComments.length} have valid inline positions, ${batchIssuesWithoutInline.length} without inline positions\n`);
            allComments.push(...batchComments);
            allIssues.push(...batchIssues);
            allIssuesWithoutInline.push(...batchIssuesWithoutInline);
        }
        // Filter only Critical and High severity issues (ignore Medium and Low)
        const criticalAndHighIssues = allIssues.filter((issue) => issue.severity === 'critical' || issue.severity === 'high');
        const criticalAndHighComments = allComments.filter((comment) => comment.severity === 'critical' || comment.severity === 'high');
        const criticalAndHighWithoutInline = allIssuesWithoutInline.filter((issue) => issue.severity === 'critical' || issue.severity === 'high');
        const comments = criticalAndHighComments;
        const issues = criticalAndHighIssues;
        console.log(`Found ${issues.length} Critical/High issues (${comments.length} with inline positions)\n`);
        if (issues.length === 0) {
            console.log('✅ No Critical or High severity issues found!');
            // Dismiss previous REQUEST_CHANGES reviews from this bot
            await githubClient.dismissPreviousReviews(prNumber);
            const commitId = await githubClient.getLatestCommit(prNumber);
            // GitHub Actions cannot APPROVE PRs, use COMMENT instead
            const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
            const event = isGitHubActions ? 'COMMENT' : 'APPROVE';
            console.log(isGitHubActions ? 'Leaving comment...' : 'Approving PR...');
            await githubClient.createReview(prNumber, commitId, [], event, '✅ AI Code Review: No Critical or High severity issues found. Code looks good!');
            // Успешное завершение без Critical/High — явно выходим с кодом 0,
            // чтобы GitHub Actions/job корректно завершались
            process.exit(0);
        }
        // Analyze severity (only Critical and High are tracked now)
        const criticalIssues = issues.filter((c) => c.severity === 'critical');
        const highIssues = issues.filter((c) => c.severity === 'high');
        // Build human-readable summary for issues that could not be mapped to inline diff positions.
        const maxNonInlineInSummary = 30;
        const uniqueNonInline = [];
        const seenKeys = new Set();
        for (const issue of criticalAndHighWithoutInline) {
            const key = `${issue.file}:${issue.line}:${issue.message}`;
            if (seenKeys.has(key))
                continue;
            seenKeys.add(key);
            uniqueNonInline.push(issue);
            if (uniqueNonInline.length >= maxNonInlineInSummary)
                break;
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
            const extraCount = criticalAndHighWithoutInline.length - uniqueNonInline.length;
            const truncatedNote = extraCount > 0
                ? `\n\n_(+${extraCount} more issues without inline positions not listed here)_`
                : '';
            nonInlineSection = `\n\n**Issues without inline comments (no diff mapping, e.g. unchanged lines or other batches):**\n\n${lines.join('\n')}${truncatedNote}`;
        }
        console.log('Issue breakdown (Critical & High only):');
        console.log(`  🔴 Critical: ${criticalIssues.length}`);
        console.log(`  🟠 High: ${highIssues.length}`);
        console.log('\n');
        // Save full report to files (only Critical & High)
        const reportPaths = await saveFullReport(prNumber, issues, comments, criticalAndHighWithoutInline);
        const reportNote = process.env.GITHUB_ACTIONS === 'true'
            ? `\n\n📄 **Full report available in workflow artifacts** (check the workflow run for download links)`
            : `\n\n📄 **Full report saved locally:**\n- JSON: \`${path.relative(CONFIG.review.projectRoot, reportPaths.jsonPath)}\`\n- Markdown: \`${path.relative(CONFIG.review.projectRoot, reportPaths.markdownPath)}\``;
        // Determine review action
        // Note: Cannot REQUEST_CHANGES on your own PR, so always use COMMENT
        const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
        let reviewEvent;
        let reviewBody;
        if (criticalIssues.length > 0) {
            reviewEvent = isGitHubActions ? 'REQUEST_CHANGES' : 'COMMENT';
            reviewBody = `🔴 **AI Code Review: Critical issues found**

Found ${criticalIssues.length} critical issue(s) that must be fixed before merging.

**Summary:**
- 🔴 Critical: ${criticalIssues.length}
- 🟠 High: ${highIssues.length}

Please address the critical issues and request a new review.${nonInlineSection}${reportNote}`;
        }
        else if (highIssues.length > 0) {
            reviewEvent = isGitHubActions ? 'REQUEST_CHANGES' : 'COMMENT';
            reviewBody = `🟠 **AI Code Review: Important issues found**

Found ${highIssues.length} high-severity issue(s) that should be fixed.

**Summary:**
- 🟠 High: ${highIssues.length}

Please address the issues and request a new review.${nonInlineSection}${reportNote}`;
        }
        else {
            // Should not reach here since we filter only Critical/High
            reviewEvent = 'COMMENT';
            reviewBody = `✅ **AI Code Review**

No Critical or High severity issues found.${reportNote}`;
        }
        // Dismiss previous REQUEST_CHANGES reviews from this bot
        await githubClient.dismissPreviousReviews(prNumber);
        // Create review (with safe fallback to summary-only comment on failure)
        const commitId = await githubClient.getLatestCommit(prNumber);
        try {
            await githubClient.createReview(prNumber, commitId, comments, reviewEvent, reviewBody);
        }
        catch (err) {
            console.warn('  ⚠ Failed to create review with inline comments. Falling back to summary-only comment.', err);
            try {
                await githubClient.createReview(prNumber, commitId, [], 'COMMENT', `${reviewBody}\n\n_(Inline comments unavailable due to diff mapping.)_`);
            }
            catch (fallbackErr) {
                console.warn('  ⚠ Failed to create summary-only review comment as well.', fallbackErr);
                // If only medium/low suggestions, do not fail the job because of a commenting error
                if (criticalIssues.length === 0 && highIssues.length === 0) {
                    console.log('Continuing without publishing review since only minor suggestions were found.');
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
        // Явно завершаем процесс с успешным кодом
        process.exit(0);
    }
    catch (error) {
        console.error('\n❌ Error during review:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map