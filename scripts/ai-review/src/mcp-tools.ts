import fs from 'fs/promises';
import path from 'path';
import { CONFIG } from './config.js';
import fg from 'fast-glob';

export interface ReadFileParams {
  path: string;
}

export interface ReadFileRangeParams {
  path: string;
  start: number;
  end: number;
}

export interface ListFilesParams {
  pattern: string;
}

export interface SearchParams {
  query: string;
}

const projectRoot = CONFIG.review.projectRoot;

export async function readFileTool(params: ReadFileParams): Promise<string> {
  const fullPath = path.isAbsolute(params.path)
    ? params.path
    : path.join(projectRoot, params.path);

  try {
    // Check if file exists first
    await fs.access(fullPath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return content;
  } catch (error: any) {
    // Return a helpful error message instead of throwing
    if (error.code === 'ENOENT') {
      throw new Error(
        `File not found: ${params.path}. This file may have been deleted, moved, or doesn't exist in the repository.`
      );
    }
    if (error.code === 'EACCES') {
      throw new Error(
        `Permission denied reading file: ${params.path}. Check file permissions.`
      );
    }
    throw new Error(
      `Failed to read file ${params.path}: ${error.message || 'Unknown error'}`
    );
  }
}

export async function readFileRangeTool(
  params: ReadFileRangeParams
): Promise<string> {
  const content = await readFileTool({ path: params.path });
  const lines = content.split('\n');

  const start = Math.max(0, params.start - 1);
  const end = Math.min(lines.length, params.end);

  return lines.slice(start, end).join('\n');
}

export async function listFilesTool(
  params: ListFilesParams
): Promise<string[]> {
  const pattern = params.pattern || '**/*';

  const files = await fg(pattern, {
    cwd: projectRoot,
    dot: false,
    onlyFiles: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/coverage/**',
    ],
  });

  return files;
}

export async function searchTool(
  params: SearchParams
): Promise<{ path: string; line: number; preview: string }[]> {
  const files = await fg('**/*.{ts,tsx,js,jsx,json,md}', {
    cwd: projectRoot,
    dot: false,
    onlyFiles: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/coverage/**',
    ],
  });

  const needle = params.query.toLowerCase();
  const results: { path: string; line: number; preview: string }[] = [];

  for (const relativePath of files) {
    const fullPath = path.join(projectRoot, relativePath);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(needle)) {
          results.push({
            path: relativePath,
            line: index + 1,
            preview: line.trim().slice(0, 300),
          });
        }
      });
    } catch (error: any) {
      // Skip files that can't be read (e.g., deleted, permission denied, binary files)
      console.warn(
        `[MCP] Warning: Could not read file ${relativePath}: ${error.message}`
      );
      continue;
    }
  }

  return results;
}
