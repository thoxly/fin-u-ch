import * as XLSX from 'xlsx';
import type { ExportRow } from './exportData';

export function downloadExcelXml(
  rows: ExportRow[],
  filename: string,
  columns?: string[]
): void {
  // Determine headers
  const headers =
    columns ||
    (rows && rows.length > 0
      ? Array.from(
          rows.reduce<Set<string>>((set, row) => {
            Object.keys(row).forEach((k) => set.add(k));
            return set;
          }, new Set<string>())
        )
      : ['date', 'category', 'amount', 'type']); // Default headers if no data

  // Prepare data array
  const data: Array<Array<string | number>> = [];

  // Add header row
  data.push(headers);

  // Add data rows
  if (rows && rows.length > 0) {
    rows.forEach((row) => {
      const rowData = headers.map((h) => {
        const value = row[h];
        if (value === null || value === undefined) {
          return '';
        }
        return value;
      });
      data.push(rowData);
    });
  }

  // Create workbook and worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths (optional, but improves readability)
  const columnWidths = headers.map((header) => {
    const headerLength = header.length;
    const maxDataLength =
      rows && rows.length > 0
        ? Math.max(
            ...rows.map((row) => {
              const val = row[header];
              return val ? String(val).length : 0;
            })
          )
        : 0;
    const maxLength = Math.max(headerLength, maxDataLength);
    return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
  });
  worksheet['!cols'] = columnWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');

  // Generate XLSX file
  const excelBuffer = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
    compression: true,
  });

  // Create blob and download
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    filename.endsWith('.xlsx') ? filename : filename + '.xlsx'
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
