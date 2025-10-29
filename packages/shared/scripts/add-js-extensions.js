import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '..', 'dist');

async function addJsExtensions(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await addJsExtensions(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      let content = await readFile(fullPath, 'utf-8');
      
      // Add .js to relative imports: from './file' to './file.js'
      content = content.replace(
        /from\s+['"](\.[^'"]+)['"]/g,
        (match, path) => {
          if (path.endsWith('.js') || path.endsWith('.json')) {
            return match;
          }
          return `from '${path}.js'`;
        }
      );

      // Also handle dynamic imports
      content = content.replace(
        /import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g,
        (match, path) => {
          if (path.endsWith('.js') || path.endsWith('.json')) {
            return match;
          }
          return `import('${path}.js')`;
        }
      );

      await writeFile(fullPath, content, 'utf-8');
    }
  }
}

console.log('Adding .js extensions to imports...');
await addJsExtensions(distDir);
console.log('✅ Done!');

