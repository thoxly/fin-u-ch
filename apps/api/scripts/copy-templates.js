import { cp } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcTemplatesDir = join(__dirname, '..', 'src', 'services', 'mail', 'templates');
const distTemplatesDir = join(__dirname, '..', 'dist', 'services', 'mail', 'templates');

try {
  console.log('Copying email templates...');
  await cp(srcTemplatesDir, distTemplatesDir, { recursive: true });
  console.log('✅ Email templates copied successfully!');
} catch (error) {
  console.error('❌ Failed to copy email templates:', error);
  process.exit(1);
}

