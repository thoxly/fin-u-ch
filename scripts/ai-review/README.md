# AI Code Review Agent

Automated PR review using DeepSeek with GitHub integration.

## Installation

```bash
cd scripts/ai-review
pnpm install
```

## Configuration

Create `.env` or export the following environment variables:

```bash
DEEPSEEK_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
GITHUB_REPOSITORY_OWNER=your-org
GITHUB_REPOSITORY_NAME=fin-u-ch
```

## Usage

### Run locally

```bash
cd scripts/ai-review

# Build the project
pnpm build

# Review PR #123
 pnpm start 123

# Or in dev mode without build
pnpm dev 123
```

### In GitHub Actions

Workflow runs AI review for each PR:

```yaml
- name: Run AI Code Review
  env:
    DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITHUB_PR_NUMBER: ${{ github.event.pull_request.number }}
  run: |
    cd scripts/ai-review
    pnpm install
    pnpm build
    pnpm start
```

## How it works

1. Loads project context from docs (ARCHITECTURE.md, DOMAIN_MODEL.md, style-guide.md, etc.)
2. Fetches PR diff via GitHub API
3. Sends for analysis to DeepSeek at two levels:
   - Level 1: Code-level review (security, performance, bugs, style)
   - Level 2: Architectural/system review
4. Parses response and creates PR comments
5. Determines review result:
   - `REQUEST_CHANGES` for critical/high issues
   - `COMMENT` for medium/low issues
   - `APPROVE` when no issues

## Two-level review

**Level 1: Code-Level** — Security, Performance, Bugs, Style  
**Level 2: Architectural** — Structure, Reuse, Complexity, Domain Model

📖 [Полная документация](../../docs/ai-context/REVIEW_LEVELS.md) | 💡 [Примеры](../../docs/ai-context/REVIEW_EXAMPLE.md)

## Debugging

If AI review fails:

1. Verify environment variables
2. Check GitHub Actions logs
3. Run locally with `pnpm dev <pr-number>`
4. Ensure DeepSeek response format is valid JSON

## Full Reports

All review results are saved to `.ai-review-reports/` directory in the project root:

- **JSON format**: `pr-{number}-{timestamp}.json` - Machine-readable format with all issues
- **Markdown format**: `pr-{number}-{timestamp}.md` - Human-readable report grouped by severity

The reports include:

- All issues (even those without inline diff positions)
- Issues grouped by severity (Critical, High, Medium, Low)
- Issues grouped by file
- Full suggestions and recommendations

**Note**: The GitHub PR summary comment shows only up to 30 issues without inline positions. For the complete list, check the saved reports.

## Limits

- Max 10 files per batch (`maxFilesPerBatch`)
- DeepSeek limits: 16000 tokens per response
- Skips generated files (dist/, \*.d.ts, maps, lockfiles)
- GitHub summary shows max 30 issues without inline positions (full list in saved reports)
