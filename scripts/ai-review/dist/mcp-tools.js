import fs from 'fs/promises';
import path from 'path';
import { CONFIG } from './config.js';
import fg from 'fast-glob';
const projectRoot = CONFIG.review.projectRoot;
export async function readFileTool(params) {
    const fullPath = path.isAbsolute(params.path)
        ? params.path
        : path.join(projectRoot, params.path);
    try {
        // Check if file exists first
        await fs.access(fullPath);
        const content = await fs.readFile(fullPath, 'utf-8');
        return content;
    }
    catch (error) {
        // If file not found, try to find similar files and suggest alternatives
        if (error.code === 'ENOENT') {
            const suggestions = await findSimilarFiles(params.path);
            if (suggestions.length > 0) {
                const suggestionList = suggestions
                    .slice(0, 5)
                    .map((s) => `  - ${s}`)
                    .join('\n');
                return `ERROR: File not found: ${params.path}

The file may have been moved, renamed, or doesn't exist.

Did you mean one of these files?
${suggestionList}

Try using the 'search' tool to find the correct file, or use 'list_files' with a pattern like "${path.basename(params.path)}"`;
            }
            return `ERROR: File not found: ${params.path}

The file doesn't exist in the repository. 

Suggestions:
- Use 'search' tool to find similar code or functionality
- Use 'list_files' tool with pattern to explore the directory structure
- Check if the file was moved to a different location`;
        }
        if (error.code === 'EACCES') {
            return `ERROR: Permission denied reading file: ${params.path}. Check file permissions.`;
        }
        return `ERROR: Failed to read file ${params.path}: ${error.message || 'Unknown error'}`;
    }
}
/**
 * Find similar files based on filename and path
 */
async function findSimilarFiles(targetPath) {
    const basename = path.basename(targetPath);
    const dirname = path.dirname(targetPath);
    // Extract key parts from the path
    const nameWithoutExt = path.parse(basename).name;
    const ext = path.parse(basename).ext;
    try {
        // Search for files with similar names
        const patterns = [
            `**/${basename}`, // Exact filename anywhere
            `**/${nameWithoutExt}*${ext}`, // Similar name with same extension
            `**/*${nameWithoutExt}*${ext}`, // Contains the name
        ];
        const allResults = new Set();
        for (const pattern of patterns) {
            try {
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
                files.forEach((f) => allResults.add(f));
            }
            catch {
                // Ignore glob errors
            }
        }
        // Score and sort by similarity
        const scored = Array.from(allResults).map((file) => {
            let score = 0;
            // Exact basename match
            if (path.basename(file) === basename)
                score += 100;
            // Same directory structure
            const fileDirname = path.dirname(file);
            if (fileDirname === dirname)
                score += 50;
            else if (fileDirname.includes(dirname) || dirname.includes(fileDirname)) {
                score += 25;
            }
            // Same extension
            if (path.extname(file) === ext)
                score += 10;
            // Similar name
            const fileNameWithoutExt = path.parse(file).name;
            if (fileNameWithoutExt.includes(nameWithoutExt))
                score += 20;
            if (nameWithoutExt.includes(fileNameWithoutExt))
                score += 15;
            return { file, score };
        });
        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);
        return scored.map((s) => s.file);
    }
    catch (error) {
        return [];
    }
}
export async function readFileRangeTool(params) {
    const content = await readFileTool({ path: params.path });
    const lines = content.split('\n');
    const start = Math.max(0, params.start - 1);
    // If `end` is not provided or invalid, default to a 80-line window or to the file end.
    const rawEnd = typeof params.end === 'number' && Number.isFinite(params.end)
        ? params.end
        : params.start + 79;
    const end = Math.min(lines.length, rawEnd);
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
    // IMPORTANT: include not only TS/JS, but also schema and migration files,
    // because a lot of critical project logic (Prisma schema, SQL migrations)
    // lives there and the reviewer often searches for fields/enums there.
    const files = await fg('**/*.{ts,tsx,js,jsx,json,md,prisma,sql}', {
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
        }
        catch (error) {
            // Skip files that can't be read (e.g., deleted, permission denied, binary files)
            console.warn(`[MCP] Warning: Could not read file ${relativePath}: ${error.message}`);
            continue;
        }
    }
    return results;
}
//# sourceMappingURL=mcp-tools.js.map