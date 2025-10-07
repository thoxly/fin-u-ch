import fs from 'fs/promises';
import path from 'path';
import { CONFIG } from './config.js';

export async function loadProjectContext(): Promise<string> {
  console.log('Loading project context...');

  const contents = await Promise.all(
    CONFIG.contextPaths.map(async (filePath) => {
      const fullPath = path.join(CONFIG.review.projectRoot, filePath);
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        console.log(`  ✓ Loaded ${filePath}`);
        return `## ${path.basename(filePath)}\n\n${content}`;
      } catch (error) {
        console.warn(`  ⚠ Warning: Could not load ${filePath}. Skipping...`);
        return '';
      }
    })
  );

  const context = contents.filter(Boolean).join('\n\n---\n\n');
  console.log(`Context loaded: ${context.length} characters\n`);

  return context;
}
