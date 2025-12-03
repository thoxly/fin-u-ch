import OpenAI from 'openai';
import { CONFIG } from './config.js';
import { ReviewComment, PullRequestFile } from './github-client.js';
import { callMcpTool } from './mcp-client.js';

export interface Finding {
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

type ToolCall = {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
};

export class AiReviewer {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: CONFIG.deepseek.apiKey,
      baseURL: 'https://api.deepseek.com/v1',
      timeout: 300000, // 5 minutes timeout
      maxRetries: 3,
    });
  }

  /**
   * Truncate tool results to prevent context overflow.
   * Different tools have different size limits based on their typical output sizes.
   */
  private truncateToolResult(toolName: string, result: unknown): unknown {
    const resultStr =
      typeof result === 'string' ? result : JSON.stringify(result);
    const originalSize = resultStr.length;

    // Define size limits per tool type (in characters)
    // These limits are conservative to leave room for other messages and completion tokens
    const limits: Record<string, number> = {
      search: 50000, // Search results can be huge, keep first 50k chars
      read_file: 80000, // Large files, keep first 80k chars
      read_file_range: 80000, // Range reads, same limit
      list_files: 20000, // File listings, usually smaller
    };

    const limit = limits[toolName] || 50000; // Default limit

    if (originalSize <= limit) {
      return result; // No truncation needed
    }

    console.warn(
      `  ⚠ Truncating ${toolName} result from ${originalSize} to ${limit} chars to prevent context overflow`
    );

    // For all results, convert to string, truncate, and try to parse back
    // This ensures we maintain the original structure as much as possible
    if (typeof result === 'string') {
      // For string results, truncate and add a note
      return (
        result.substring(0, limit - 100) + // Leave room for truncation note
        `\n\n[Result truncated: ${originalSize} chars total, showing first ${limit - 100} chars]`
      );
    } else {
      // For structured results (objects/arrays), try to truncate intelligently
      try {
        const parsed = JSON.parse(resultStr);
        if (Array.isArray(parsed)) {
          // For arrays, keep items until we approach the limit
          const truncated: any[] = [];
          let currentSize = 2; // Account for '[' and ']'
          const truncationNoteSize = 150; // Approximate size of truncation note

          for (const item of parsed) {
            const itemStr = JSON.stringify(item);
            const itemSize = itemStr.length + (truncated.length > 0 ? 2 : 0); // +2 for ', '
            if (currentSize + itemSize + truncationNoteSize > limit) {
              break;
            }
            truncated.push(item);
            currentSize += itemSize;
          }

          if (truncated.length < parsed.length) {
            // Add truncation info as a final array element (as a special marker object)
            truncated.push({
              _truncated: true,
              _originalCount: parsed.length,
              _showingCount: truncated.length,
              _note: `Result truncated: ${parsed.length} items total, showing first ${truncated.length} items`,
            });
          }
          return truncated;
        } else {
          // For objects, truncate the JSON string representation
          // Try to keep it valid JSON by finding a good break point
          const truncated = resultStr.substring(0, limit - 100);
          // Try to find the last complete key-value pair
          const lastBrace = truncated.lastIndexOf('}');
          if (lastBrace > limit - 500) {
            // If we're close to a closing brace, use that
            const partial = truncated.substring(0, lastBrace + 1);
            try {
              const parsed = JSON.parse(partial);
              return {
                ...parsed,
                _truncated: true,
                _note: `Result truncated from ${originalSize} to ${partial.length} chars`,
              };
            } catch {
              // Fall through to error case
            }
          }
          // If we can't parse it nicely, return an error object
          return {
            error: 'Result too large',
            truncated_preview: resultStr.substring(
              0,
              Math.min(limit - 200, 10000)
            ),
            original_size: originalSize,
            note: `Result truncated from ${originalSize} to ${limit} chars. Original result was too large to include fully.`,
          };
        }
      } catch {
        // If parsing fails, return truncated string with note
        return {
          error: 'Result too large and could not be parsed',
          truncated_preview: resultStr.substring(
            0,
            Math.min(limit - 200, 10000)
          ),
          original_size: originalSize,
          note: `Result truncated from ${originalSize} to ${limit} chars`,
        };
      }
    }
  }

  /**
   * Retry wrapper for API calls with exponential backoff
   */
  private async retryApiCall<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if it's a retryable error
        const isRetryable =
          error?.code === 'ERR_STREAM_PREMATURE_CLOSE' ||
          error?.message?.includes('Premature close') ||
          error?.message?.includes('ECONNRESET') ||
          error?.message?.includes('ETIMEDOUT') ||
          error?.status === 429 || // Rate limit
          error?.status === 500 || // Server error
          error?.status === 502 || // Bad gateway
          error?.status === 503 || // Service unavailable
          error?.status === 504; // Gateway timeout

        if (!isRetryable || attempt === maxRetries - 1) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(
          `  ⚠ API call failed (attempt ${attempt + 1}/${maxRetries}): ${error?.message || error}. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('API call failed after retries');
  }

  async reviewCode(
    files: PullRequestFile[],
    diff: string,
    distilledContext: string
  ): Promise<{
    comments: ReviewComment[];
    issues: Finding[];
    issuesWithoutInline: Finding[];
  }> {
    console.log('Sending code to LLM (with tools) for review...');

    const systemPrompt =
      'You are an expert, ultra-conservative AI code reviewer with access to tools for reading project files, listing files, and searching the codebase.' +
      ' Your TOP PRIORITY is to AVOID FALSE POSITIVES.' +
      ' It is ALWAYS better to miss a potential issue than to wrongly accuse correct code.' +
      ' Use tools aggressively whenever you need additional context beyond the diff, and NEVER claim that something is missing (a field, a filter, error handling, etc.) unless you have verified it in the actual code via tools.';

    const userPrompt = this.buildPrompt(files, diff, distilledContext);

    const tools = this.buildTools();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      // Tool calling loop (limited by LLM behaviour; stops when no tool calls requested)
      let awaitingToolCalls = true;
      let loopIterations = 0;
      let totalToolCalls = 0;

      while (awaitingToolCalls) {
        loopIterations++;
        if (loopIterations > 10 || totalToolCalls > 50) {
          console.warn(
            `  ⚠ Aborting main LLM tool loop after ${loopIterations} iterations and ${totalToolCalls} tool calls to avoid timeouts.`
          );
          console.warn(
            '  ⚠ Returning empty findings due to main LLM tool loop safety limit.'
          );
          // Fail-safe: if the model misbehaves with tools, we prefer to return
          // an empty result (no issues) rather than fail the entire CI job.
          return { comments: [], issues: [], issuesWithoutInline: [] };
        }
        const completion = await this.retryApiCall(() =>
          this.openai.chat.completions.create({
            model: CONFIG.deepseek.model,
            max_tokens: CONFIG.deepseek.maxTokens,
            messages,
            tools,
            tool_choice: 'auto',
            // Note: We don't use response_format here because we need a JSON array,
            // not a JSON object. The prompt explicitly requests an array format.
          })
        );

        const message = completion.choices[0]?.message;

        if (!message) {
          throw new Error('LLM returned empty response');
        }

        const toolCalls = (message as any).tool_calls as ToolCall[] | undefined;

        if (toolCalls && toolCalls.length > 0) {
          totalToolCalls += toolCalls.length;
          console.log(`  LLM requested ${toolCalls.length} tool call(s)`);

          for (const toolCall of toolCalls) {
            const { name, arguments: argsJson } = toolCall.function;

            let parsedArgs: any;
            try {
              parsedArgs = JSON.parse(argsJson || '{}');
            } catch (err) {
              console.warn(
                `  ⚠ Failed to parse tool arguments for ${name}:`,
                err
              );
              parsedArgs = {};
            }

            // Детальное логирование: что именно делает нейронка
            const formatArg = (key: string, value: any): string => {
              if (typeof value === 'string') {
                // Обрезаем длинные пути/строки для читаемости
                const maxLen = 60;
                const str =
                  value.length > maxLen
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

            // Truncate result to prevent context overflow
            const truncatedResult = this.truncateToolResult(name, result);

            // Логируем размер результата (для понимания сколько данных получили)
            const originalSize =
              typeof result === 'string'
                ? result.length
                : JSON.stringify(result).length;
            const truncatedSize =
              typeof truncatedResult === 'string'
                ? truncatedResult.length
                : JSON.stringify(truncatedResult).length;
            const resultPreview =
              truncatedSize > 200
                ? `[${truncatedSize} chars${originalSize !== truncatedSize ? ` (truncated from ${originalSize})` : ''}]`
                : JSON.stringify(truncatedResult).substring(0, 200);
            console.log(`    ← ${resultPreview}`);

            // DeepSeek API requires reasoning_content field when using tools
            const assistantMessage: any = {
              role: 'assistant',
              content: null,
              tool_calls: [toolCall],
            };

            // Include reasoning_content if present in the original message
            if ((message as any).reasoning_content) {
              assistantMessage.reasoning_content = (
                message as any
              ).reasoning_content;
            }

            messages.push(assistantMessage);

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(truncatedResult),
            } as any);
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

        // First, parse raw findings from the model
        const issues = this.parseFindings(responseText);

        // Second, run a dedicated verification pass whose ONLY job is to
        // aggressively filter out false positives. The verifier:
        // - must NEVER invent new issues;
        // - may only keep issues that it can confirm with code evidence;
        // - should drop or downgrade anything uncertain.
        const verifiedIssues = await this.verifyFindings(
          issues,
          files,
          diff,
          distilledContext
        );

        const { comments, issuesWithoutInline } = this.convertToReviewComments(
          verifiedIssues,
          files
        );

        console.log(
          `  Parsed findings (after verification): ${verifiedIssues.length} total, ${comments.length} with valid inline positions, ${issuesWithoutInline.length} without inline positions`
        );

        return { comments, issues: verifiedIssues, issuesWithoutInline };
      }

      throw new Error('LLM finished without producing a final response');
    } catch (error) {
      console.error('Error calling LLM API:', error);
      throw error;
    }
  }

  /**
   * Second-pass verifier.
   *
   * Takes the raw issues produced by the first model pass and asks the model
   * (with full tool access) to strictly verify each one against the real code.
   *
   * Rules for the verifier:
   * - MUST NOT invent new issues.
   * - MAY drop any issue that cannot be clearly confirmed from the code.
   * - SHOULD prefer dropping/downgrading over keeping uncertain issues.
   */
  private async verifyFindings(
    issues: Finding[],
    files: PullRequestFile[],
    diff: string,
    distilledContext: string
  ): Promise<Finding[]> {
    if (!issues || issues.length === 0) {
      return issues;
    }

    console.log(
      `\nRunning verification pass for ${issues.length} initial issue(s)...`
    );

    const tools = this.buildTools();
    let loopIterations = 0;
    let totalToolCalls = 0;

    const systemPrompt =
      'You are a STRICT VERIFIER of AI code review findings for the Fin-U-CH project.' +
      ' Your ONLY job is to review a list of proposed issues and remove anything that is not clearly confirmed in the code.' +
      ' You MUST NOT invent new issues.' +
      ' False positives are MUCH WORSE than missed issues.' +
      ' If you are not sure, you MUST drop the issue.' +
      ' You have tools to read files, read line ranges, list files and search the codebase — use them to confirm or reject each issue.' +
      ' Never call the same tool with the exact same arguments more than once: if a search or file read returned empty or not found, treat it as definitive and move on.';

    const userPrompt = `
You are given:

1) DISTILLED PROJECT CONTEXT:

${distilledContext}

2) CODE DIFF FOR THIS BATCH:

\`\`\`diff
${diff}
\`\`\`

3) LIST OF FILES IN THIS BATCH:

${files
  .map((f) => `- ${f.filename} (+${f.additions}/-${f.deletions})`)
  .join('\n')}

4) INITIAL AI ISSUES (POTENTIALLY NOISY, MAY CONTAIN FALSE POSITIVES):

\`\`\`json
${JSON.stringify(issues, null, 2)}
\`\`\`

YOUR TASK:

- For EACH issue in the list, verify whether it is REAL based on the actual code.
- You MUST use tools to inspect the relevant files/lines before keeping an issue.
- You MUST NOT add any new issues that are not present in the input list.
- If you cannot clearly confirm an issue from the code, you MUST DROP it.

SPECIAL RULES TO AVOID TYPICAL FALSE POSITIVES FOR THIS PROJECT:

1) Prisma / types:
   - Do NOT report "missing field" or "type mismatch" between Prisma schema and generated types as a bug.
   - If there is a mismatch, treat it as "types may be outdated" and DROP the issue (this is not a code bug).

2) companyId filters:
   - Before claiming that a query lacks companyId filtering, you MUST:
     a) Inspect the exact query via tools.
     b) Check service-level methods that may add companyId filters.
   - If companyId is present at any level (controller OR service), DROP the issue.

3) Error handling:
   - Before claiming "missing error handling" for a call, you MUST:
     a) Inspect the surrounding code for try/catch or centralised error handlers.
   - If there is a try/catch or appropriate error handling, DROP the issue.

4) "X is not defined / not found":
   - NEVER claim that a variable/field/identifier does not exist without:
     a) Using search tools to look for it;
     b) Showing a concrete code location where it is absent and clearly required.
   - If there is any ambiguity (e.g. could be generated, imported elsewhere, or from types), DROP the issue.

OUTPUT FORMAT:

- Return a JSON array of VERIFIED issues.
- Each issue MUST correspond to one of the input issues (same "file" and "line" and "message" semantics).
- You may optionally add:
  - "verification_status": "confirmed" | "dropped" | "downgraded"
  - "verification_notes": string (short explanation)
- HOWEVER:
  - Only include issues in the output array if "verification_status" is "confirmed" or "downgraded".
  - Never output issues with "verification_status": "dropped".

IMPORTANT:
- Prefer dropping an issue over keeping a doubtful one.
- Do NOT output any free-form text — only the JSON array.`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      loopIterations++;
      if (loopIterations > 10 || totalToolCalls > 50) {
        console.warn(
          `  ⚠ Verifier: aborting tool loop after ${loopIterations} iterations and ${totalToolCalls} tool calls to avoid timeouts. Returning original issues without further verification.`
        );
        return issues;
      }
      const completion = await this.retryApiCall(() =>
        this.openai.chat.completions.create({
          model: CONFIG.deepseek.model,
          max_tokens: CONFIG.deepseek.maxTokens,
          messages,
          tools,
          tool_choice: 'auto',
        })
      );

      const message = completion.choices[0]?.message;

      if (!message) {
        throw new Error('Verifier LLM returned empty response');
      }

      const toolCalls = (message as any).tool_calls as ToolCall[] | undefined;

      if (toolCalls && toolCalls.length > 0) {
        totalToolCalls += toolCalls.length;
        console.log(`  Verifier requested ${toolCalls.length} tool call(s)`);

        for (const toolCall of toolCalls) {
          const { name, arguments: argsJson } = toolCall.function;

          let parsedArgs: any;
          try {
            parsedArgs = JSON.parse(argsJson || '{}');
          } catch (err) {
            console.warn(
              `  ⚠ Verifier: failed to parse tool arguments for ${name}:`,
              err
            );
            parsedArgs = {};
          }

          const formatArg = (key: string, value: any): string => {
            if (typeof value === 'string') {
              const maxLen = 60;
              const str =
                value.length > maxLen
                  ? `${value.substring(0, maxLen)}...`
                  : value;
              return `${key}="${str}"`;
            }
            return `${key}=${JSON.stringify(value)}`;
          };

          const argsStr = Object.entries(parsedArgs)
            .map(([key, value]) => formatArg(key, value))
            .join(', ');

          console.log(`  → verifier.${name}(${argsStr})`);

          const result = await this.callTool(name, parsedArgs);

          // Truncate result to prevent context overflow
          const truncatedResult = this.truncateToolResult(name, result);

          const originalSize =
            typeof result === 'string'
              ? result.length
              : JSON.stringify(result).length;
          const truncatedSize =
            typeof truncatedResult === 'string'
              ? truncatedResult.length
              : JSON.stringify(truncatedResult).length;
          const resultPreview =
            truncatedSize > 200
              ? `[${truncatedSize} chars${originalSize !== truncatedSize ? ` (truncated from ${originalSize})` : ''}]`
              : JSON.stringify(truncatedResult).substring(0, 200);
          console.log(`    ← verifier result: ${resultPreview}`);

          // DeepSeek API requires reasoning_content field when using tools
          const assistantMessage: any = {
            role: 'assistant',
            content: null,
            tool_calls: [toolCall],
          };

          // Include reasoning_content if present in the original message
          if ((message as any).reasoning_content) {
            assistantMessage.reasoning_content = (
              message as any
            ).reasoning_content;
          }

          messages.push(assistantMessage);

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(truncatedResult),
          } as any);
        }

        continue;
      }

      const responseText = message.content || '';

      console.log('Verifier LLM response:');
      console.log(responseText);
      console.log('\n');

      const verifiedIssues = this.parseFindings(responseText);

      console.log(
        `Verifier kept ${verifiedIssues.length} / ${issues.length} initial issue(s).`
      );

      return verifiedIssues;
    }
  }

  private buildPrompt(
    files: PullRequestFile[],
    diff: string,
    distilledContext: string
  ): string {
    const basePrompt = `You are an expert, ULTRA-CONSERVATIVE code reviewer for the Fin-U-CH financial management system.

# DISTILLED PROJECT CONTEXT

${distilledContext}

# YOUR TASK (MULTI-LEVEL REVIEW WITH TOOLS, MINIMISING FALSE POSITIVES)

**IMPORTANT: Focus ONLY on CRITICAL and HIGH severity issues. Do NOT report Medium or Low severity issues.**
This project is in early stages, and we want to avoid noise from minor issues.

**EVEN MORE IMPORTANT: Avoid FALSE POSITIVES at all costs.**
- It is BETTER to MISS a real issue than to mislabel correct code as a bug.
- You MUST use tools (read_file, read_file_range, list_files, search) whenever you are unsure.
- You MUST provide evidence from code for every issue (file, line, and a short code quote in the message).

Review the following pull request changes and identify issues at THREE LEVELS:

## LEVEL 1: CODE-LEVEL REVIEW (File/Function level)

Identify issues based on:
1. Style Guide rules (TypeScript, React, API patterns)
2. Security vulnerabilities (OWASP Top 10, multi-tenancy)
3. Common pitfalls specific to this project
4. Performance issues (N+1 queries, missing indexes, no pagination)
5. Missing error handling or validation
6. Breaking changes or technical debt
7. **Simplicity & readability** — prefer simple, boring, explicit code over clever abstractions.

### Simplicity & "junior + AI" patterns

Flag code as problematic (HIGH/CRITICAL if it clearly hurts maintainability) when:
- Code looks "smart" but:
  - uses complex TypeScript patterns (deep generics, advanced utility/conditional types) without real need;
  - introduces unnecessary abstraction layers (wrappers around simple calls, generic helpers used only once);
  - does premature optimization (heavy useMemo/useCallback, custom caches, complex algorithms for small datasets).
- It re-implements existing project solutions:
  - writes a custom hook instead of using an existing hook from \`shared/hooks\`;
  - uses a custom HTTP client / RTK query hook instead of \`shared/api\` or existing API layer;
  - implements a new UI component instead of reusing components from \`shared/ui\` or \`entities/\` / \`features/\`.
- Logic is made more complex for "beauty":
  - hard-to-read one-liners and long method chains;
  - heavy map/filter/reduce chains where a simple for/if would be clearer;
  - usage of patterns/libraries that are not used elsewhere in this project.

Priority:
- If the code is technically correct but clearly too complex and harms maintainability → category \`architecture\` or \`best-practice\`, severity usually "high".
- If complexity significantly increases the risk of bugs or domain model mismatch → severity can be "critical".

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

**Note:** Do not report medium or low severity issues. Focus only on critical and high.

## PROJECT-SPECIFIC FALSE POSITIVE PATTERNS TO AVOID

Before reporting an issue, ALWAYS check if it falls into one of these categories. If yes, you MUST either:
- downgrade it to a suggestion (but we skip medium/low entirely), or
- NOT report it at all.

1) **Prisma fields / types appear "missing"**
   - Sometimes generated Prisma types may be out of sync with the schema.
   - Treat this as "types may need regeneration (e.g. prisma generate)", NOT as a bug in business logic.
   - Do NOT report issues purely about missing fields in generated types if the schema contains them.

2) **companyId filters**
   - Never assume there is "no companyId filter" after looking at only one layer.
   - You MUST inspect:
     - the controller/route handler,
     - the service method it calls,
     - and any shared helper used for the query.
   - If companyId is present in ANY of these, do NOT report a missing companyId bug.

3) **Error handling**
   - Do NOT report "missing error handling" if:
     - there is a try/catch around the call,
     - errors are passed to a central error handler,
     - or the error is intentionally propagated to a higher layer that handles it.

4) **"X is not defined / not found"**
   - NEVER claim that a field/variable/identifier does not exist without:
     - using the search tool to look for it,
     - and verifying that the code truly expects it to be present there.
   - If it could reasonably come from types, imports, or generated code, treat it as uncertain and do NOT report it.

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

**Note:** Do not report medium or low severity issues. Focus only on critical and high.

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
- message: clear description of the issue. The message MUST briefly quote or describe the exact code snippet that proves the problem (e.g. mention the Prisma query or the try/catch that is missing).
- suggestion: (optional) how to fix it

You may also include optional fields:
- evidence: short code snippet or reference that clearly shows the problem

**Use "architecture" category for Level 2 issues** (wrong placement, duplication, complexity, domain inconsistency)

**CRITICAL SEVERITY**: Security vulnerabilities (missing companyId, SQL injection, XSS), architecture breaks (wrong layer, data leakage)
**HIGH SEVERITY**: Bugs, major duplication, missing error handling

**IMPORTANT REMINDER**: Only report CRITICAL and HIGH severity issues. Skip medium and low severity issues entirely.

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

  private buildTools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'read_file',
          description:
            'Read the full contents of a file in the repository by relative path from project root.',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description:
                  'Relative path to the file from repository root, e.g. "apps/api/src/main.ts".',
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
          description:
            'Read a range of lines from a file in the repository. Use this when you only need part of a large file.',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description:
                  'Relative path to the file from repository root, e.g. "apps/web/src/App.tsx".',
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
          description:
            'List files in the repository matching a glob pattern from the project root.',
          parameters: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description:
                  'Glob pattern relative to project root, e.g. "apps/api/src/**/*.ts".',
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
          description:
            'Search for a text query across the codebase. Use this to find related modules, services, or usages.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description:
                  'Search phrase, e.g. "companyId" or "OperationService".',
              },
            },
            required: ['query'],
          },
        },
      },
    ];
  }

  private async callTool(name: string, args: any): Promise<unknown> {
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
    } catch (error: any) {
      // Return error message to LLM instead of crashing the entire review
      const errorMessage = error?.message || 'Unknown error';
      console.warn(`  ⚠ Tool call failed: ${name} - ${errorMessage}`);

      // Return a user-friendly error message that the LLM can understand
      if (
        errorMessage.includes('ENOENT') ||
        errorMessage.includes('no such file')
      ) {
        return {
          error: `File not found: ${args.path || args.pattern || 'unknown'}. This file may have been deleted, moved, or doesn't exist in the repository.`,
        };
      }

      return {
        error: `Failed to execute ${name}: ${errorMessage}`,
      };
    }
  }

  private parseFindings(response: string): Finding[] {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      let jsonStr = jsonMatch ? jsonMatch[1] : response;

      // Try to fix truncated JSON arrays
      jsonStr = jsonStr.trim();

      // If it looks like a truncated array (starts with [ but doesn't end with ])
      if (jsonStr.startsWith('[') && !jsonStr.endsWith(']')) {
        // Try to extract valid JSON objects from the array using balanced brace matching
        const objectMatches: string[] = [];
        let depth = 0;
        let start = -1;
        let inArray = false;
        let arrayDepth = 0;

        for (let i = 1; i < jsonStr.length; i++) {
          // Start from 1 to skip opening [
          const char = jsonStr[i];

          if (char === '[') {
            if (depth === 0) inArray = true;
            arrayDepth++;
          } else if (char === ']') {
            arrayDepth--;
            if (arrayDepth === 0) inArray = false;
          } else if (char === '{') {
            if (depth === 0 && !inArray) start = i;
            depth++;
          } else if (char === '}') {
            depth--;
            if (depth === 0 && start !== -1 && !inArray) {
              const objStr = jsonStr.substring(start, i + 1);
              objectMatches.push(objStr);
              start = -1;
            }
          }
        }

        if (objectMatches.length > 0) {
          console.warn(
            `⚠️  Response was truncated. Extracted ${objectMatches.length} complete objects from partial JSON.`
          );
          // Reconstruct valid JSON array
          jsonStr = '[' + objectMatches.join(',') + ']';
        } else {
          // Try to close the array manually if we can find the last complete object
          const lastBraceIndex = jsonStr.lastIndexOf('}');
          if (lastBraceIndex > 0) {
            console.warn(
              '⚠️  Response was truncated. Attempting to close JSON array manually.'
            );
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
    } catch (error) {
      console.error('Failed to parse LLM response as JSON:', error);

      // Try to extract partial results from truncated JSON
      try {
        // Look for complete JSON objects in the response
        // We'll try to find objects by matching balanced braces
        const objectMatches: string[] = [];
        let depth = 0;
        let start = -1;

        for (let i = 0; i < response.length; i++) {
          if (response[i] === '{') {
            if (depth === 0) start = i;
            depth++;
          } else if (response[i] === '}') {
            depth--;
            if (depth === 0 && start !== -1) {
              const objStr = response.substring(start, i + 1);
              // Check if it looks like a Finding object (has required fields)
              if (
                objStr.includes('"file"') &&
                objStr.includes('"line"') &&
                objStr.includes('"severity"') &&
                objStr.includes('"category"') &&
                objStr.includes('"message"')
              ) {
                objectMatches.push(objStr);
              }
              start = -1;
            }
          }
        }

        if (objectMatches && objectMatches.length > 0) {
          console.warn(
            `⚠️  Extracted ${objectMatches.length} issues from truncated response. Some issues may be missing.`
          );
          const partialIssues = objectMatches
            .map((obj) => {
              try {
                return JSON.parse(obj);
              } catch {
                return null;
              }
            })
            .filter((issue): issue is Finding => {
              if (!issue) return false;
              // Validate that it has all required fields
              return (
                typeof issue.file === 'string' &&
                typeof issue.line === 'number' &&
                typeof issue.severity === 'string' &&
                typeof issue.category === 'string' &&
                typeof issue.message === 'string'
              );
            });

          if (partialIssues.length > 0) {
            console.warn(
              `⚠️  Using ${partialIssues.length} extracted issues. Original error: ${error}`
            );
            return partialIssues;
          }
        }
      } catch (extractError) {
        console.warn('Failed to extract partial results:', extractError);
      }

      // Логируем только начало ответа, чтобы не засорять логи огромными строками
      const preview =
        response.length > 2000
          ? `${response.slice(0, 2000)}... [truncated]`
          : response;
      console.log('Response was (preview):', preview);
      // Не проглатываем проблему — пусть упадёт батч/джоба, чтобы не терять найденные issues
      throw new Error('LLM response was not valid JSON; see logs for details.');
    }
  }

  private convertToReviewComments(
    issues: Finding[],
    files: PullRequestFile[]
  ): { comments: ReviewComment[]; issuesWithoutInline: Finding[] } {
    const comments: ReviewComment[] = [];
    const issuesWithoutInline: Finding[] = [];

    for (const issue of issues) {
      const file = files.find((f) => f.filename === issue.file);

      if (!file || !file.patch) {
        console.warn(
          `  ⚠ Skipping issue for ${issue.file}: file not found or no patch`
        );
        issuesWithoutInline.push(issue);
        continue;
      }

      // Calculate position in the diff
      const position = this.calculateDiffPosition(
        file.patch,
        issue.line,
        issue.file
      );

      if (position === null) {
        console.warn(
          `  ⚠ Skipping issue at ${issue.file}:${issue.line}: line not found in diff (may be already fixed or outside changed blocks)`
        );
        // Log the issue details for debugging
        console.warn(
          `    Issue: ${issue.category} - ${issue.message.substring(0, 100)}...`
        );
        issuesWithoutInline.push(issue);
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

    return { comments, issuesWithoutInline };
  }

  private calculateDiffPosition(
    patch: string,
    targetLine: number,
    filename: string
  ): number | null {
    const lines = patch.split('\n');
    // Position in the unified diff for this file. GitHub expects a 1-based index
    // across the entire file patch, including hunk headers.
    let diffPosition = 0;
    // Tracks the current line number in the NEW file (+ side) across all hunks.
    let newFileLineNumber = 0;
    // Track if we're inside a hunk (to skip lines before first hunk)
    let insideHunk = false;
    // Track hunk ranges for debugging
    const hunkRanges: Array<{ start: number; end: number; diffStart: number }> =
      [];

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
      } else if (line.startsWith(' ')) {
        // Context (unchanged) line also exists in the new file; can be commented on.
        newFileLineNumber++;
        if (newFileLineNumber === targetLine) {
          return diffPosition;
        }
      } else if (line.startsWith('-')) {
        // Deletion; does not advance new file line number and cannot be commented via position.
        // But we still need to track diffPosition for it.
        continue;
      } else {
        // Any other line (shouldn't normally occur) — treat conservatively.
        continue;
      }
    }

    // Target line not present in the diff for this file (likely unchanged outside hunks).
    // Log warning for debugging with more context
    console.warn(
      `  ⚠ Could not find line ${targetLine} in ${filename}. Last tracked line was ${newFileLineNumber}`
    );
    if (hunkRanges.length > 0) {
      console.warn(
        `    Hunk ranges in diff: ${hunkRanges.map((r) => `${r.start}-${r.end}`).join(', ')}`
      );
      const isInRange = hunkRanges.some(
        (r) => targetLine >= r.start && targetLine <= r.end
      );
      if (!isInRange) {
        console.warn(
          `    Line ${targetLine} is outside all hunk ranges - may indicate issue was already fixed or AI is referencing old code`
        );
      }
    }
    return null;
  }
}
