import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from './config.js';
import { ReviewComment, PullRequestFile } from './github-client.js';

interface ClaudeIssue {
  file: string;
  line: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  message: string;
  suggestion?: string;
}

export class ClaudeReviewer {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: CONFIG.anthropic.apiKey,
    });
  }

  async reviewCode(
    files: PullRequestFile[],
    diff: string,
    projectContext: string
  ): Promise<ReviewComment[]> {
    console.log('Sending code to Claude for review...');

    const prompt = this.buildPrompt(files, diff, projectContext);

    try {
      const message = await this.anthropic.messages.create({
        model: CONFIG.anthropic.model,
        max_tokens: CONFIG.anthropic.maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText =
        message.content[0].type === 'text' ? message.content[0].text : '';

      console.log('  Claude review completed\n');
      console.log('Claude response:');
      console.log(responseText);
      console.log('\n');

      const issues = this.parseClaudeResponse(responseText);
      return this.convertToReviewComments(issues, files);
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw error;
    }
  }

  private buildPrompt(
    files: PullRequestFile[],
    diff: string,
    projectContext: string
  ): string {
    return `You are an expert code reviewer for the Fin-U-CH financial management system.

# PROJECT CONTEXT

${projectContext}

# YOUR TASK

Review the following pull request changes and identify issues based on:
1. Style Guide rules (TypeScript, React, API patterns)
2. Security vulnerabilities (OWASP Top 10, multi-tenancy)
3. Common pitfalls specific to this project
4. Performance issues (N+1 queries, missing indexes, no pagination)
5. Missing error handling or validation
6. Breaking changes or technical debt

# CHANGED FILES

${files.map((f) => `- ${f.filename} (+${f.additions}/-${f.deletions})`).join('\n')}

# CODE DIFF

\`\`\`diff
${diff}
\`\`\`

# OUTPUT FORMAT

Provide your review as a JSON array of issues. Each issue must have:
- file: filename
- line: line number in the NEW file (not diff line)
- severity: "low" | "medium" | "high" | "critical"
- category: one of "security", "performance", "bug", "style", "best-practice"
- message: clear description of the issue
- suggestion: (optional) how to fix it

**CRITICAL SEVERITY**: Use for security vulnerabilities (missing companyId filter, SQL injection, XSS, exposed secrets)
**HIGH SEVERITY**: Use for bugs, data leakage, missing error handling
**MEDIUM SEVERITY**: Use for performance issues, missing validation, bad patterns
**LOW SEVERITY**: Use for style issues, minor improvements

Example:
\`\`\`json
[
  {
    "file": "apps/api/src/modules/operations/operations.service.ts",
    "line": 42,
    "severity": "critical",
    "category": "security",
    "message": "Missing companyId filter in Prisma query - this will leak data between tenants!",
    "suggestion": "Add 'where: { companyId }' to the findMany call"
  },
  {
    "file": "apps/api/src/modules/reports/dashboard.service.ts",
    "line": 67,
    "severity": "medium",
    "category": "performance",
    "message": "N+1 query problem: fetching articles in a loop",
    "suggestion": "Use include or select in the initial query to load related data"
  }
]
\`\`\`

**IMPORTANT**: 
- Only output the JSON array, no other text
- If no issues found, return empty array []
- Focus on critical and high severity issues
- Be specific about line numbers and file paths
- Reference the project's style guide and security checklist

Begin your review:`;
  }

  private parseClaudeResponse(response: string): ClaudeIssue[] {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;

      const issues = JSON.parse(jsonStr.trim());

      if (!Array.isArray(issues)) {
        console.warn('Claude response is not an array, returning empty');
        return [];
      }

      return issues;
    } catch (error) {
      console.error('Failed to parse Claude response as JSON:', error);
      console.log('Response was:', response);
      return [];
    }
  }

  private convertToReviewComments(
    issues: ClaudeIssue[],
    files: PullRequestFile[]
  ): ReviewComment[] {
    const comments: ReviewComment[] = [];

    for (const issue of issues) {
      const file = files.find((f) => f.filename === issue.file);

      if (!file || !file.patch) {
        console.warn(
          `  ⚠ Skipping issue for ${issue.file}: file not found or no patch`
        );
        continue;
      }

      // Calculate position in the diff
      const position = this.calculateDiffPosition(file.patch, issue.line);

      if (position === null) {
        console.warn(
          `  ⚠ Skipping issue at ${issue.file}:${issue.line}: line not in diff`
        );
        continue;
      }

      const body = `**${issue.category}**: ${issue.message}${
        issue.suggestion ? `\n\n💡 **Suggestion**: ${issue.suggestion}` : ''
      }`;

      comments.push({
        path: issue.file,
        position,
        body,
        severity: issue.severity,
      });
    }

    return comments;
  }

  private calculateDiffPosition(
    patch: string,
    targetLine: number
  ): number | null {
    const lines = patch.split('\n');
    let newFileLineNumber = 0;
    let diffPosition = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      diffPosition++;

      // Parse hunk header: @@ -old_start,old_count +new_start,new_count @@
      if (line.startsWith('@@')) {
        const match = line.match(/\+(\d+)/);
        if (match) {
          newFileLineNumber = parseInt(match[1], 10) - 1;
        }
        continue;
      }

      // Lines starting with + are additions
      if (line.startsWith('+')) {
        newFileLineNumber++;
        if (newFileLineNumber === targetLine) {
          return diffPosition;
        }
      }
      // Lines starting with space are context (unchanged)
      else if (line.startsWith(' ')) {
        newFileLineNumber++;
      }
      // Lines starting with - are deletions (don't increment new line number)
    }

    return null;
  }
}
