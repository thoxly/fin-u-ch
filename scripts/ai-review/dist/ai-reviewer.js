import OpenAI from 'openai';
import { CONFIG } from './config.js';
import { callMcpTool } from './mcp-client.js';
export class AiReviewer {
    openai;
    constructor() {
        this.openai = new OpenAI({
            apiKey: CONFIG.deepseek.apiKey,
            baseURL: 'https://api.deepseek.com/v1',
        });
    }
    async reviewCode(files, diff, distilledContext) {
        console.log('Sending code to LLM (with tools) for review...');
        const systemPrompt = 'You are an expert AI code reviewer with access to tools for reading project files, listing files, and searching the codebase. Use tools when you need additional context beyond the diff.';
        const userPrompt = this.buildPrompt(files, diff, distilledContext);
        const tools = this.buildTools();
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ];
        try {
            // Tool calling loop (limited by LLM behaviour; stops when no tool calls requested)
            let awaitingToolCalls = true;
            while (awaitingToolCalls) {
                const completion = await this.openai.chat.completions.create({
                    model: CONFIG.deepseek.model,
                    max_tokens: CONFIG.deepseek.maxTokens,
                    messages,
                    tools,
                    tool_choice: 'auto',
                    // Note: We don't use response_format here because we need a JSON array,
                    // not a JSON object. The prompt explicitly requests an array format.
                });
                const message = completion.choices[0]?.message;
                if (!message) {
                    throw new Error('LLM returned empty response');
                }
                const toolCalls = message.tool_calls;
                if (toolCalls && toolCalls.length > 0) {
                    console.log(`  LLM requested ${toolCalls.length} tool call(s)`);
                    for (const toolCall of toolCalls) {
                        const { name, arguments: argsJson } = toolCall.function;
                        let parsedArgs;
                        try {
                            parsedArgs = JSON.parse(argsJson || '{}');
                        }
                        catch (err) {
                            console.warn(`  ⚠ Failed to parse tool arguments for ${name}:`, err);
                            parsedArgs = {};
                        }
                        // Детальное логирование: что именно делает нейронка
                        const formatArg = (key, value) => {
                            if (typeof value === 'string') {
                                // Обрезаем длинные пути/строки для читаемости
                                const maxLen = 60;
                                const str = value.length > maxLen
                                    ? `${value.substring(0, maxLen)}...`
                                    : value;
                                return `${key}="${str}"`;
                            }
                            return `${key}=${JSON.stringify(value)}`;
                        };
                        const argsStr = Object.entries(parsedArgs)
                            .map(([key, value]) => formatArg(key, value))
                            .join(', ');
                        console.log(`  → ${name}(${argsStr})`);
                        const result = await this.callTool(name, parsedArgs);
                        // Логируем размер результата (для понимания сколько данных получили)
                        const resultSize = typeof result === 'string'
                            ? result.length
                            : JSON.stringify(result).length;
                        const resultPreview = resultSize > 200
                            ? `[${resultSize} chars]`
                            : JSON.stringify(result).substring(0, 200);
                        console.log(`    ← ${resultPreview}`);
                        messages.push({
                            role: 'assistant',
                            content: null,
                            tool_calls: [toolCall],
                        });
                        messages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: JSON.stringify(result),
                        });
                    }
                    // Continue loop – LLM will receive tool results and may call tools again or produce final answer
                    continue;
                }
                awaitingToolCalls = false;
                const responseText = message.content || '';
                console.log('  LLM review completed\n');
                console.log('LLM response:');
                console.log(responseText);
                console.log('\n');
                const issues = this.parseFindings(responseText);
                const { comments, issuesWithoutInline } = this.convertToReviewComments(issues, files);
                console.log(`  Parsed findings: ${issues.length} total, ${comments.length} with valid inline positions, ${issuesWithoutInline.length} without inline positions`);
                return { comments, issues, issuesWithoutInline };
            }
            throw new Error('LLM finished without producing a final response');
        }
        catch (error) {
            console.error('Error calling LLM API:', error);
            throw error;
        }
    }
    buildPrompt(files, diff, distilledContext) {
        const basePrompt = `You are an expert code reviewer for the Fin-U-CH financial management system.

# DISTILLED PROJECT CONTEXT

${distilledContext}

# YOUR TASK (MULTI-LEVEL REVIEW WITH TOOLS)

Review the following pull request changes and identify issues at THREE LEVELS:

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

## LEVEL 3: CONFIGURATION & SECURITY REVIEW

If any of the changed files are configuration or infrastructure files 
(e.g. \`.env\`, \`.env.example\`, \`package.json\`, \`tsconfig.json\`, 
\`vite.config.ts\`, \`docker-compose.yml\`, \`.github/workflows/*\`, \`.eslintrc\`, 
\`nodemon.json\`, or files inside \`/ops\` or \`/infra\` folders), 
perform a dedicated configuration review.

Check for:
1. Security risks:
   - Hardcoded secrets or tokens
   - Disabled validation, lint, or type checking
   - Insecure CORS or HTTPS settings
2. Dependency and environment integrity:
   - Downgraded or replaced dependencies
   - Modified versions of runtime (Node, pnpm, etc.)
   - Broken or removed build steps
3. Deployment and CI/CD risks:
   - Removed test/build/lint stages
   - Changed Docker or workflow commands that affect safety

**Severity rules (Level 3):**
- critical — leaked secrets, disabled security validation, public tokens
- high — build or deployment bypass, unsafe env config
- medium — bad dependency management, missing validation
- low — naming or formatting inconsistencies

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
- Perform ALL THREE LEVELS: Level 1 (code), Level 2 (architecture), and Level 3 (configuration & security)
- Be specific about line numbers and file paths
- For architecture issues, reference the correct folder structure from ARCHITECTURE.md
- For configuration files, always check for security risks and dependency changes

Begin your review:`;
        return basePrompt;
    }
    buildTools() {
        return [
            {
                type: 'function',
                function: {
                    name: 'read_file',
                    description: 'Read the full contents of a file in the repository by relative path from project root.',
                    parameters: {
                        type: 'object',
                        properties: {
                            path: {
                                type: 'string',
                                description: 'Relative path to the file from repository root, e.g. "apps/api/src/main.ts".',
                            },
                        },
                        required: ['path'],
                    },
                },
            },
            {
                type: 'function',
                function: {
                    name: 'read_file_range',
                    description: 'Read a range of lines from a file in the repository. Use this when you only need part of a large file.',
                    parameters: {
                        type: 'object',
                        properties: {
                            path: {
                                type: 'string',
                                description: 'Relative path to the file from repository root, e.g. "apps/web/src/App.tsx".',
                            },
                            start: {
                                type: 'number',
                                description: 'Start line number (1-based, inclusive).',
                            },
                            end: {
                                type: 'number',
                                description: 'End line number (1-based, inclusive).',
                            },
                        },
                        required: ['path', 'start', 'end'],
                    },
                },
            },
            {
                type: 'function',
                function: {
                    name: 'list_files',
                    description: 'List files in the repository matching a glob pattern from the project root.',
                    parameters: {
                        type: 'object',
                        properties: {
                            pattern: {
                                type: 'string',
                                description: 'Glob pattern relative to project root, e.g. "apps/api/src/**/*.ts".',
                            },
                        },
                        required: ['pattern'],
                    },
                },
            },
            {
                type: 'function',
                function: {
                    name: 'search',
                    description: 'Search for a text query across the codebase. Use this to find related modules, services, or usages.',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'Search phrase, e.g. "companyId" or "OperationService".',
                            },
                        },
                        required: ['query'],
                    },
                },
            },
        ];
    }
    async callTool(name, args) {
        try {
            switch (name) {
                case 'read_file':
                    return callMcpTool('read_file', {
                        path: args.path,
                    });
                case 'read_file_range':
                    return callMcpTool('read_file_range', {
                        path: args.path,
                        start: args.start,
                        end: args.end,
                    });
                case 'list_files':
                    return callMcpTool('list_files', {
                        pattern: args.pattern,
                    });
                case 'search':
                    return callMcpTool('search', {
                        query: args.query,
                    });
                default:
                    console.warn(`  ⚠ Unknown tool requested: ${name}`);
                    return { error: `Unknown tool: ${name}` };
            }
        }
        catch (error) {
            // Return error message to LLM instead of crashing the entire review
            const errorMessage = error?.message || 'Unknown error';
            console.warn(`  ⚠ Tool call failed: ${name} - ${errorMessage}`);
            // Return a user-friendly error message that the LLM can understand
            if (errorMessage.includes('ENOENT') ||
                errorMessage.includes('no such file')) {
                return {
                    error: `File not found: ${args.path || args.pattern || 'unknown'}. This file may have been deleted, moved, or doesn't exist in the repository.`,
                };
            }
            return {
                error: `Failed to execute ${name}: ${errorMessage}`,
            };
        }
    }
    parseFindings(response) {
        try {
            // Extract JSON from markdown code blocks if present
            const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
            let jsonStr = jsonMatch ? jsonMatch[1] : response;
            // Try to fix truncated JSON arrays
            jsonStr = jsonStr.trim();
            // If it looks like a truncated array (starts with [ but doesn't end with ])
            if (jsonStr.startsWith('[') && !jsonStr.endsWith(']')) {
                // Try to extract valid JSON objects from the array using balanced brace matching
                const objectMatches = [];
                let depth = 0;
                let start = -1;
                let inArray = false;
                let arrayDepth = 0;
                for (let i = 1; i < jsonStr.length; i++) {
                    // Start from 1 to skip opening [
                    const char = jsonStr[i];
                    if (char === '[') {
                        if (depth === 0)
                            inArray = true;
                        arrayDepth++;
                    }
                    else if (char === ']') {
                        arrayDepth--;
                        if (arrayDepth === 0)
                            inArray = false;
                    }
                    else if (char === '{') {
                        if (depth === 0 && !inArray)
                            start = i;
                        depth++;
                    }
                    else if (char === '}') {
                        depth--;
                        if (depth === 0 && start !== -1 && !inArray) {
                            const objStr = jsonStr.substring(start, i + 1);
                            objectMatches.push(objStr);
                            start = -1;
                        }
                    }
                }
                if (objectMatches.length > 0) {
                    console.warn(`⚠️  Response was truncated. Extracted ${objectMatches.length} complete objects from partial JSON.`);
                    // Reconstruct valid JSON array
                    jsonStr = '[' + objectMatches.join(',') + ']';
                }
                else {
                    // Try to close the array manually if we can find the last complete object
                    const lastBraceIndex = jsonStr.lastIndexOf('}');
                    if (lastBraceIndex > 0) {
                        console.warn('⚠️  Response was truncated. Attempting to close JSON array manually.');
                        jsonStr = jsonStr.substring(0, lastBraceIndex + 1) + ']';
                    }
                }
            }
            const issues = JSON.parse(jsonStr);
            if (!Array.isArray(issues)) {
                console.warn('LLM response is not an array, returning empty');
                return [];
            }
            return issues;
        }
        catch (error) {
            console.error('Failed to parse LLM response as JSON:', error);
            // Try to extract partial results from truncated JSON
            try {
                // Look for complete JSON objects in the response
                // We'll try to find objects by matching balanced braces
                const objectMatches = [];
                let depth = 0;
                let start = -1;
                for (let i = 0; i < response.length; i++) {
                    if (response[i] === '{') {
                        if (depth === 0)
                            start = i;
                        depth++;
                    }
                    else if (response[i] === '}') {
                        depth--;
                        if (depth === 0 && start !== -1) {
                            const objStr = response.substring(start, i + 1);
                            // Check if it looks like a Finding object (has required fields)
                            if (objStr.includes('"file"') &&
                                objStr.includes('"line"') &&
                                objStr.includes('"severity"') &&
                                objStr.includes('"category"') &&
                                objStr.includes('"message"')) {
                                objectMatches.push(objStr);
                            }
                            start = -1;
                        }
                    }
                }
                if (objectMatches && objectMatches.length > 0) {
                    console.warn(`⚠️  Extracted ${objectMatches.length} issues from truncated response. Some issues may be missing.`);
                    const partialIssues = objectMatches
                        .map((obj) => {
                        try {
                            return JSON.parse(obj);
                        }
                        catch {
                            return null;
                        }
                    })
                        .filter((issue) => {
                        if (!issue)
                            return false;
                        // Validate that it has all required fields
                        return (typeof issue.file === 'string' &&
                            typeof issue.line === 'number' &&
                            typeof issue.severity === 'string' &&
                            typeof issue.category === 'string' &&
                            typeof issue.message === 'string');
                    });
                    if (partialIssues.length > 0) {
                        console.warn(`⚠️  Using ${partialIssues.length} extracted issues. Original error: ${error}`);
                        return partialIssues;
                    }
                }
            }
            catch (extractError) {
                console.warn('Failed to extract partial results:', extractError);
            }
            // Логируем только начало ответа, чтобы не засорять логи огромными строками
            const preview = response.length > 2000
                ? `${response.slice(0, 2000)}... [truncated]`
                : response;
            console.log('Response was (preview):', preview);
            // Не проглатываем проблему — пусть упадёт батч/джоба, чтобы не терять найденные issues
            throw new Error('LLM response was not valid JSON; see logs for details.');
        }
    }
    convertToReviewComments(issues, files) {
        const comments = [];
        const issuesWithoutInline = [];
        for (const issue of issues) {
            const file = files.find((f) => f.filename === issue.file);
            if (!file || !file.patch) {
                console.warn(`  ⚠ Skipping issue for ${issue.file}: file not found or no patch`);
                issuesWithoutInline.push(issue);
                continue;
            }
            // Calculate position in the diff
            const position = this.calculateDiffPosition(file.patch, issue.line, issue.file);
            if (position === null) {
                console.warn(`  ⚠ Skipping issue at ${issue.file}:${issue.line}: line not found in diff (may be already fixed or outside changed blocks)`);
                // Log the issue details for debugging
                console.warn(`    Issue: ${issue.category} - ${issue.message.substring(0, 100)}...`);
                issuesWithoutInline.push(issue);
                continue;
            }
            const body = `**${issue.category}**: ${issue.message}${issue.suggestion ? `\n\n💡 **Suggestion**: ${issue.suggestion}` : ''}`;
            comments.push({
                path: issue.file,
                position,
                body,
                severity: issue.severity,
            });
        }
        return { comments, issuesWithoutInline };
    }
    calculateDiffPosition(patch, targetLine, filename) {
        const lines = patch.split('\n');
        // Position in the unified diff for this file. GitHub expects a 1-based index
        // across the entire file patch, including hunk headers.
        let diffPosition = 0;
        // Tracks the current line number in the NEW file (+ side) across all hunks.
        let newFileLineNumber = 0;
        // Track if we're inside a hunk (to skip lines before first hunk)
        let insideHunk = false;
        // Track hunk ranges for debugging
        const hunkRanges = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            diffPosition++;
            // Hunk header: @@ -old_start,old_count +new_start,new_count @@
            if (line.startsWith('@@')) {
                insideHunk = true;
                const match = line.match(/\+(\d+),?(\d*)/);
                if (match) {
                    const hunkStart = parseInt(match[1], 10);
                    const hunkCount = match[2] ? parseInt(match[2], 10) : 1;
                    // Reset to the starting line number of this hunk (minus 1, will be incremented)
                    newFileLineNumber = hunkStart - 1;
                    hunkRanges.push({
                        start: hunkStart,
                        end: hunkStart + hunkCount - 1,
                        diffStart: diffPosition,
                    });
                }
                // Continue; header counts toward position, but not a commentable line itself.
                continue;
            }
            // Only process lines inside hunks
            if (!insideHunk) {
                continue;
            }
            if (line.startsWith('+')) {
                // Added line exists in the new file; can be commented on.
                newFileLineNumber++;
                if (newFileLineNumber === targetLine) {
                    return diffPosition;
                }
            }
            else if (line.startsWith(' ')) {
                // Context (unchanged) line also exists in the new file; can be commented on.
                newFileLineNumber++;
                if (newFileLineNumber === targetLine) {
                    return diffPosition;
                }
            }
            else if (line.startsWith('-')) {
                // Deletion; does not advance new file line number and cannot be commented via position.
                // But we still need to track diffPosition for it.
                continue;
            }
            else {
                // Any other line (shouldn't normally occur) — treat conservatively.
                continue;
            }
        }
        // Target line not present in the diff for this file (likely unchanged outside hunks).
        // Log warning for debugging with more context
        console.warn(`  ⚠ Could not find line ${targetLine} in ${filename}. Last tracked line was ${newFileLineNumber}`);
        if (hunkRanges.length > 0) {
            console.warn(`    Hunk ranges in diff: ${hunkRanges.map((r) => `${r.start}-${r.end}`).join(', ')}`);
            const isInRange = hunkRanges.some((r) => targetLine >= r.start && targetLine <= r.end);
            if (!isInRange) {
                console.warn(`    Line ${targetLine} is outside all hunk ranges - may indicate issue was already fixed or AI is referencing old code`);
            }
        }
        return null;
    }
}
//# sourceMappingURL=ai-reviewer.js.map