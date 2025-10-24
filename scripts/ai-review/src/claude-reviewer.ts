import OpenAI from 'openai';
import { CONFIG } from './config.js';
import { ReviewComment, PullRequestFile } from './github-client.js';

interface ClaudeIssue {
  file: string;
  line: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category:
    | 'security'
    | 'performance'
    | 'bug'
    | 'style'
    | 'best-practice'
    | 'architecture';
  message: string;
  suggestion?: string;
}

export class ClaudeReviewer {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: CONFIG.deepseek.apiKey,
      baseURL: 'https://api.deepseek.com/v1',
    });
  }

  async reviewCode(
    files: PullRequestFile[],
    diff: string,
    projectContext: string
  ): Promise<ReviewComment[]> {
    console.log('Sending code to DeepSeek for review...');

    const prompt = this.buildPrompt(files, diff, projectContext);

    try {
      const completion = await this.openai.chat.completions.create({
        model: CONFIG.deepseek.model,
        max_tokens: CONFIG.deepseek.maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText = completion.choices[0]?.message?.content || '';

      console.log('  DeepSeek review completed\n');
      console.log('DeepSeek response:');
      console.log(responseText);
      console.log('\n');

      const issues = this.parseClaudeResponse(responseText);
      return this.convertToReviewComments(issues, files);
    } catch (error) {
      console.error('Error calling DeepSeek API:', error);
      throw error;
    }
  }

  private buildPrompt(
    files: PullRequestFile[],
    diff: string,
    projectContext: string
  ): string {
    const basePrompt = `You are an expert code reviewer for the Fin-U-CH financial management system.

# PROJECT CONTEXT

${projectContext}

# YOUR TASK

Review the following pull request changes and identify issues at TWO LEVELS:

## LEVEL 1: CODE-LEVEL REVIEW (File/Function level)

Identify issues based on:
1. Style Guide rules (TypeScript, React, API patterns)
2. Security vulnerabilities (OWASP Top 10, multi-tenancy)
3. Common pitfalls specific to this project
4. Performance issues (N+1 queries, missing indexes, no pagination)
5. Missing error handling or validation
6. Breaking changes or technical debt

## LEVEL 2: ARCHITECTURAL & SYSTEM REVIEW (Project structure)

Perform a high-level architectural review. Detect issues that affect scalability, maintainability, or violate project structure.

### Context: Monorepo Structure

**Frontend Structure (apps/web/src/):**
- \`pages/\` → routing screens only, no reusable components
- \`features/\` → reusable forms & widgets (operation-form, plan-editor, salary-wizard)
- \`entities/\` → domain UI elements (article, account, operation, plan)
- \`widgets/\` → large blocks like tables/dashboards
- \`shared/\` → reusable utilities:
  - \`shared/api/\` → axios instance, REST helpers, hooks
  - \`shared/ui/\` → base UI components (Button, Modal, Offcanvas, Toast, etc.)
  - \`shared/lib/\` → utilities (date/money/number formatting, validation)
  - \`shared/hooks/\` → custom React hooks

**Backend Structure (apps/api/src/):**
- \`modules/{domain}/\` → domain services (auth, operations, plans, reports, etc.)
  - Each module: \`{domain}.model.ts\`, \`{domain}.service.ts\`, \`{domain}.controller.ts\`, \`{domain}.routes.ts\`
- \`modules/catalogs/\` → sub-modules: articles, accounts, departments, counterparties, deals
- Multi-tenant: EVERY query must include \`companyId\` filter
- Domain models follow DOMAIN_MODEL.md (Operation, PlanItem, Article, Account, etc.)

### What to Check (Level 2):

#### 1. Folder & Layer Placement
- Is the file in the correct layer according to ARCHITECTURE.md?
- **Violations:**
  - Reusable UI components in \`/pages\` (must be in \`/features\`, \`/entities\`, or \`/shared/ui\`)
  - Backend business logic outside domain modules
  - Utilities not extracted to \`/shared\`

#### 2. Reusability & Duplication
- Is there duplicated logic that should be extracted?
- **Look for:**
  - Duplicate UI components → extract to \`shared/ui\`
  - Duplicate utility functions (date/money formatting) → extract to \`shared/lib\`
  - Duplicate API calls or hooks → extract to \`shared/api\` or \`shared/hooks\`
  - Custom Modal/Offcanvas/Toast instead of using shared components

#### 3. Complexity & Maintainability
- **Flag as too complex:**
  - Functions >40 lines
  - Nesting depth >3 levels
  - Missing separation of concerns (e.g., API calls inside UI components)
  - Non-scalable patterns (hardcoded values, no extensibility)

#### 4. UI/UX Consistency
- Follow current design patterns:
  - Use **Offcanvas** for editing entity details, not Modal
  - Use **Toast** for notifications
  - Naming: PascalCase for components, camelCase for hooks
  - Consistent form validation and error handling

#### 5. Domain Model Consistency
- File names, imports, and models must match DOMAIN_MODEL.md
- **Check:**
  - Operations reference \`articleId\`, \`accountId\`, \`companyId\` (not arbitrary IDs)
  - Correct enums: \`type\` (income/expense/transfer), \`activity\` (operating/investing/financing)
  - Correct indicators: for expense (payroll, opex, taxes, etc.), for income (revenue, other_income)

#### 6. Security & Multi-Tenancy
- **Critical:** Every backend query must filter by \`companyId\`
- No data leakage between companies
- JWT validation in protected routes

### Severity Guide (Level 2)

- **critical** — Architecture break (wrong layer, data leakage, missing companyId)
- **high** — Major duplication or non-reusable component that blocks maintainability
- **medium** — Non-scalable structure, inconsistent abstraction, complexity issues
- **low** — Naming inconsistency, minor structural improvements

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
- category: one of "security", "performance", "bug", "style", "best-practice", **"architecture"**
- message: clear description of the issue
- suggestion: (optional) how to fix it

**Use "architecture" category for Level 2 issues** (wrong placement, duplication, complexity, domain inconsistency)

**CRITICAL SEVERITY**: Security vulnerabilities (missing companyId, SQL injection, XSS), architecture breaks (wrong layer, data leakage)
**HIGH SEVERITY**: Bugs, major duplication, missing error handling
**MEDIUM SEVERITY**: Performance issues, non-scalable patterns, complexity
**LOW SEVERITY**: Style issues, naming inconsistencies, minor improvements

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
    "file": "apps/web/src/pages/DashboardPage/CustomModal.tsx",
    "line": 15,
    "severity": "high",
    "category": "architecture",
    "message": "Reusable Modal component defined in /pages. This violates layer separation and prevents reuse.",
    "suggestion": "Move this component to /shared/ui/Modal or use existing shared Modal component"
  },
  {
    "file": "apps/web/src/features/operation-form/OperationForm.tsx",
    "line": 78,
    "severity": "medium",
    "category": "architecture",
    "message": "Duplicate date formatting logic. Same code exists in 3+ components.",
    "suggestion": "Extract to shared/lib/formatDate.ts and import from there"
  },
  {
    "file": "apps/api/src/modules/reports/complex-report.service.ts",
    "line": 145,
    "severity": "medium",
    "category": "architecture",
    "message": "Function is 67 lines long with nesting depth of 4. Too complex to maintain.",
    "suggestion": "Break down into smaller functions: extractData(), transformData(), aggregateResults()"
  }
]
\`\`\`

**IMPORTANT**: 
- Only output the JSON array, no other text
- If no issues found, return empty array []
- Perform BOTH Level 1 (code) and Level 2 (architecture) reviews
- Be specific about line numbers and file paths
- For architecture issues, reference the correct folder structure from ARCHITECTURE.md

Begin your review:`;

    return basePrompt;
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
