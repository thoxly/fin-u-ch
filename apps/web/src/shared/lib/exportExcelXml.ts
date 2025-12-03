import * as XLSX from 'xlsx';
import type { ExportRow } from './exportData';

export function downloadExcelXml(
  rows: ExportRow[],
  filename: string,
  columns?: string[]
): void {
  // Определяем заголовки
  const headers =
    columns ||
    Array.from(
      rows.reduce<Set<string>>((set, row) => {
        Object.keys(row).forEach((k) => set.add(k));
        return set;
      }, new Set<string>())
    );

  // Создаем массив данных для Excel
  const data: (string | number | null)[][] = [];

  // Добавляем заголовки
  data.push(headers);

  // Добавляем строки данных
  if (rows && rows.length > 0) {
    rows.forEach((row) => {
      const rowData = headers.map((h) => {
        const value = row[h];
        // Преобразуем null/undefined в пустую строку
        if (value === null || value === undefined) {
          return '';
        }
        return value;
      });
      data.push(rowData);
    });
  }

  // Создаем рабочую книгу
  const wb = XLSX.utils.book_new();

  // Создаем рабочий лист из данных
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Добавляем рабочий лист в книгу
  XLSX.utils.book_append_sheet(wb, ws, 'Export');

  // Генерируем бинарный файл Excel
  const excelBuffer = XLSX.write(wb, {
    type: 'array',
    bookType: 'xlsx',
  });

  // Создаем Blob с правильным MIME типом для Excel
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // Скачиваем файл
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
