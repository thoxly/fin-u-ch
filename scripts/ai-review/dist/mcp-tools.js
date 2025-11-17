import fs from 'fs/promises';
import path from 'path';
import { CONFIG } from './config.js';
import fg from 'fast-glob';
const projectRoot = CONFIG.review.projectRoot;
export async function readFileTool(params) {
    const fullPath = path.isAbsolute(params.path)
        ? params.path
        : path.join(projectRoot, params.path);
    const content = await fs.readFile(fullPath, 'utf-8');
    return content;
}
export async function readFileRangeTool(params) {
    const content = await readFileTool({ path: params.path });
    const lines = content.split('\n');
    const start = Math.max(0, params.start - 1);
    const end = Math.min(lines.length, params.end);
    return lines.slice(start, end).join('\n');
}
export async function listFilesTool(params) {
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
export async function searchTool(params) {
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
    const results = [];
    for (const relativePath of files) {
        const fullPath = path.join(projectRoot, relativePath);
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
    }
    return results;
}
//# sourceMappingURL=mcp-tools.js.map