import { format as dateFnsFormat, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export const formatDate = (date: string | Date, formatStr = 'dd.MM.yyyy'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsFormat(dateObj, formatStr, { locale: ru });
};

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'dd.MM.yyyy HH:mm');
};

export const formatMonth = (date: string | Date): string => {
  return formatDate(date, 'LLLL yyyy');
};

export const getCurrentMonth = (): string => {
  return dateFnsFormat(new Date(), 'yyyy-MM');
};

export const toISODate = (date: Date): string => {
  return dateFnsFormat(date, 'yyyy-MM-dd');
};

