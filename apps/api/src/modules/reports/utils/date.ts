export const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const getMonthsBetween = (startDate: Date, endDate: Date): string[] => {
  const months: string[] = [];
  const current = new Date(startDate);
  current.setDate(1);

  while (current <= endDate) {
    months.push(getMonthKey(current));
    current.setMonth(current.getMonth() + 1);
  }

  return months;
};

export const parseMonthKey = (monthKey: string): Date => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1);
};

