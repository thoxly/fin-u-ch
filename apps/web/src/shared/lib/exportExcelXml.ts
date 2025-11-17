import * as XLSX from 'xlsx';
import type { ExportRow } from './exportData';

export function downloadExcelXml(
  rows: ExportRow[],
  filename: string,
  columns?: string[]
): void {
  const headers =
    columns ||
    Array.from(
      rows.reduce<Set<string>>((set, row) => {
        Object.keys(row).forEach((k) => set.add(k));
        return set;
      }, new Set<string>())
    );

  // Создаем массив данных для Excel
  const data: (string | number)[][] = [];

  // Добавляем заголовки
  data.push(headers);

  // Добавляем строки данных
  rows.forEach((row) => {
    const rowData = headers.map((h) => {
      const value = row[h];
      // Преобразуем значения: числа остаются числами, остальное - строки
      if (typeof value === 'number') {
        return value;
      }
      return value == null ? '' : String(value);
    });
    data.push(rowData);
  });

  // Создаем рабочую книгу
  const wb = XLSX.utils.book_new();

  // Создаем рабочий лист из данных
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Добавляем рабочий лист в книгу
  XLSX.utils.book_append_sheet(wb, ws, 'Export');

  // Генерируем бинарный файл .xlsx
  const excelBuffer = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'array',
    cellStyles: false,
  });

  // Создаем Blob и скачиваем файл
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
