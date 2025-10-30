export type ExportRow = Record<string, string | number | null | undefined>;

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function downloadCsv(
  rows: ExportRow[],
  filename: string,
  columns?: string[]
): void {
  if (!rows || rows.length === 0) {
    // Create empty file with header if columns provided
    const emptyHeader = (
      columns || ['date', 'category', 'amount', 'type']
    ).join(',');
    const blob = new Blob([emptyHeader + '\n'], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      filename.endsWith('.csv') ? filename : filename + '.csv'
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const headers =
    columns ||
    Array.from(
      rows.reduce<Set<string>>((set, row) => {
        Object.keys(row).forEach((k) => set.add(k));
        return set;
      }, new Set<string>())
    );

  const headerLine = headers.join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => toCsvValue(row[h])).join(',')
  );
  const csv = [headerLine, ...dataLines].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    filename.endsWith('.csv') ? filename : filename + '.csv'
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
