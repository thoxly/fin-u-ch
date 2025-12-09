import fs from 'fs';
import path from 'path';

describe('CompanyPage content', () => {
  test('does not contain deprecated Integrations text for BUSINESS', () => {
    const filePath = path.resolve(__dirname, '..', 'CompanyPage.tsx');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).not.toMatch(/Интеграции \(Ozon и другие\)/);
  });
});
