import fs from 'fs/promises';
import path from 'path';
import Redis from 'ioredis';
import OpenAI from 'openai';
import { CONFIG } from './config.js';

const DISTILLED_KEY = 'ai:context:distilled';

function createRedis(): Redis {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  return new Redis(url, {
    maxRetriesPerRequest: 3,
  });
}

async function loadRawContext(): Promise<string> {
  const projectRoot = CONFIG.review.projectRoot;

  // Use only the most important files for distillation
  const importantPaths = [
    'docs/ARCHITECTURE.md',
    'docs/DOMAIN_MODEL.md',
    'docs/ai-context/style-guide.md',
    'docs/ai-context/security-checklist.md',
  ];

  const contents = await Promise.all(
    importantPaths.map(async (relativePath) => {
      const fullPath = path.join(projectRoot, relativePath);
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        return `## ${path.basename(relativePath)}\n\n${content}`;
      } catch (err) {
        console.warn(
          `  ⚠ Distillation: could not load ${relativePath}, skipping`
        );
        return '';
      }
    })
  );

  return contents.filter(Boolean).join('\n\n---\n\n');
}

export async function getDistilledContext(): Promise<string> {
  const redis = createRedis();

  try {
    const cached = await redis.get(DISTILLED_KEY);
    if (cached) {
      console.log('Using distilled context from Redis cache');
      return cached;
    }
  } catch (err) {
    console.warn('  ⚠ Failed to read distilled context from Redis:', err);
  }

  console.log('Distilling project context with LLM...');
  const rawContext = await loadRawContext();

  if (!rawContext) {
    console.warn(
      '  ⚠ No raw context loaded for distillation, falling back to empty context'
    );
    return '';
  }

  const client = new OpenAI({
    apiKey: CONFIG.deepseek.apiKey,
    baseURL: 'https://api.deepseek.com/v1',
  });

  const completion = await client.chat.completions.create({
    model: CONFIG.deepseek.model,
    max_tokens: 4000,
    messages: [
      {
        role: 'system',
        content:
          'You are an expert software architect. Compress the following project documentation into a dense reference summary (3-5k tokens) for an AI code reviewer. Preserve all critical architectural rules, domain model invariants, security rules (especially multi-tenancy and companyId), and style-guide conventions.',
      },
      {
        role: 'user',
        content: rawContext,
      },
    ],
  });

  const distilled =
    completion.choices[0]?.message?.content?.trim() ||
    'Project context distillation failed or returned empty.';

  try {
    await redis.set(DISTILLED_KEY, distilled, 'EX', 60 * 60 * 24 * 7); // 7 days
    console.log('Distilled context cached in Redis');
  } catch (err) {
    console.warn('  ⚠ Failed to store distilled context in Redis:', err);
  } finally {
    redis.disconnect();
  }

  return distilled;
}
