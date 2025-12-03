import fs from 'fs/promises';
import path from 'path';
import Redis from 'ioredis';
import OpenAI from 'openai';
import { CONFIG } from './config.js';
const DISTILLED_KEY = 'ai:context:distilled';
const CACHE_FILE_NAME = '.distilled-context.cache';
const CACHE_TTL_MS = 60 * 60 * 24 * 7 * 1000; // 7 days in milliseconds
function createRedis() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    return new Redis(url, {
        maxRetriesPerRequest: 3,
    });
}
async function getFileCachePath() {
    const projectRoot = CONFIG.review.projectRoot;
    return path.join(projectRoot, CACHE_FILE_NAME);
}
async function getFileCache() {
    try {
        const cachePath = await getFileCachePath();
        const stats = await fs.stat(cachePath);
        const age = Date.now() - stats.mtimeMs;
        if (age > CACHE_TTL_MS) {
            console.log(`File cache expired (age: ${Math.round(age / (1000 * 60 * 60 * 24))} days), will regenerate`);
            return null;
        }
        const content = await fs.readFile(cachePath, 'utf-8');
        console.log(`Using distilled context from file cache (age: ${Math.round(age / (1000 * 60 * 60 * 24))} days)`);
        return content;
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            return null; // File doesn't exist, cache miss
        }
        console.warn('  ⚠ Failed to read file cache:', err);
        return null;
    }
}
async function setFileCache(content) {
    try {
        const cachePath = await getFileCachePath();
        await fs.writeFile(cachePath, content, 'utf-8');
        console.log('Distilled context cached to file');
    }
    catch (err) {
        console.warn('  ⚠ Failed to write file cache:', err);
    }
}
async function loadRawContext() {
    const projectRoot = CONFIG.review.projectRoot;
    // Use only the most important files for distillation
    const importantPaths = [
        'docs/ARCHITECTURE.md',
        'docs/DOMAIN_MODEL.md',
        'docs/ai-context/style-guide.md',
        'docs/ai-context/security-checklist.md',
    ];
    const contents = await Promise.all(importantPaths.map(async (relativePath) => {
        const fullPath = path.join(projectRoot, relativePath);
        try {
            const content = await fs.readFile(fullPath, 'utf-8');
            return `## ${path.basename(relativePath)}\n\n${content}`;
        }
        catch (err) {
            console.warn(`  ⚠ Distillation: could not load ${relativePath}, skipping`);
            return '';
        }
    }));
    return contents.filter(Boolean).join('\n\n---\n\n');
}
export async function getDistilledContext() {
    // Try Redis cache first (for persistent environments)
    let redis = null;
    try {
        redis = createRedis();
        const cached = await redis.get(DISTILLED_KEY);
        if (cached) {
            console.log('Using distilled context from Redis cache');
            // Also update file cache for fallback
            await setFileCache(cached);
            redis.disconnect();
            return cached;
        }
    }
    catch (err) {
        console.warn('  ⚠ Failed to read distilled context from Redis:', err);
    }
    finally {
        if (redis) {
            redis.disconnect();
            redis = null;
        }
    }
    // Try file cache as fallback (works in GitHub Actions and local dev)
    const fileCache = await getFileCache();
    if (fileCache) {
        // Try to also cache in Redis if available (for next time)
        try {
            redis = createRedis();
            await redis.set(DISTILLED_KEY, fileCache, 'EX', 60 * 60 * 24 * 7); // 7 days
            redis.disconnect();
        }
        catch (err) {
            // Ignore Redis errors, file cache is sufficient
            if (redis) {
                redis.disconnect();
            }
        }
        return fileCache;
    }
    // Cache miss - need to distill
    console.log('Distilling project context with LLM...');
    const rawContext = await loadRawContext();
    if (!rawContext) {
        console.warn('  ⚠ No raw context loaded for distillation, falling back to empty context');
        return '';
    }
    const client = new OpenAI({
        apiKey: CONFIG.deepseek.apiKey,
        baseURL: 'https://api.deepseek.com/v1',
        timeout: 300000, // 5 minutes timeout
        maxRetries: 3,
    });
    // Retry wrapper for API calls with exponential backoff
    const retryApiCall = async (fn, maxRetries = 3, baseDelay = 1000) => {
        let lastError = null;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                // Check if it's a retryable error
                const isRetryable = error?.code === 'ERR_STREAM_PREMATURE_CLOSE' ||
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
                console.warn(`  ⚠ API call failed (attempt ${attempt + 1}/${maxRetries}): ${error?.message || error}. Retrying in ${delay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        throw lastError || new Error('API call failed after retries');
    };
    const completion = await retryApiCall(() => client.chat.completions.create({
        model: CONFIG.deepseek.model,
        max_tokens: 4000,
        messages: [
            {
                role: 'system',
                content: 'You are an expert software architect. Compress the following project documentation into a dense reference summary (3-5k tokens) for an AI code reviewer. Preserve all critical architectural rules, domain model invariants, security rules (especially multi-tenancy and companyId), and style-guide conventions.',
            },
            {
                role: 'user',
                content: rawContext,
            },
        ],
    }));
    const distilled = completion.choices[0]?.message?.content?.trim() ||
        'Project context distillation failed or returned empty.';
    // Save to both caches
    await setFileCache(distilled);
    try {
        redis = createRedis();
        await redis.set(DISTILLED_KEY, distilled, 'EX', 60 * 60 * 24 * 7); // 7 days
        console.log('Distilled context cached in Redis');
    }
    catch (err) {
        console.warn('  ⚠ Failed to store distilled context in Redis:', err);
    }
    finally {
        if (redis) {
            redis.disconnect();
        }
    }
    return distilled;
}
//# sourceMappingURL=distilled-context.js.map