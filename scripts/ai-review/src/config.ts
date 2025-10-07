import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../..');

export const CONFIG = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 8000,
  },
  github: {
    token: process.env.GITHUB_TOKEN || '',
    owner: process.env.GITHUB_REPOSITORY_OWNER || '',
    repo: process.env.GITHUB_REPOSITORY_NAME || '',
  },
  // Используем существующие документы + новые AI-specific файлы
  contextPaths: [
    'docs/PROJECT_OVERVIEW.md',
    'docs/ARCHITECTURE.md',
    'docs/DOMAIN_MODEL.md',
    'docs/ai-context/style-guide.md',
    'docs/ai-context/security-checklist.md',
    'docs/ai-context/common-pitfalls.md',
  ],
  review: {
    maxFilesPerBatch: 10,
    minSeverity: 'low', // low, medium, high, critical
    projectRoot,
  },
};

// Validate configuration
export function validateConfig(): void {
  const errors: string[] = [];

  if (!CONFIG.anthropic.apiKey) {
    errors.push('ANTHROPIC_API_KEY is required');
  }

  if (!CONFIG.github.token) {
    errors.push('GITHUB_TOKEN is required');
  }

  if (!CONFIG.github.owner) {
    errors.push('GITHUB_REPOSITORY_OWNER is required');
  }

  if (!CONFIG.github.repo) {
    errors.push('GITHUB_REPOSITORY_NAME is required');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }
}
