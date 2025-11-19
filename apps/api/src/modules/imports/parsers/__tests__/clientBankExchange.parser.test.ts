// Mock env.ts before importing anything that uses it
jest.mock('../../../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 4000,
    DATABASE_URL: 'postgresql://test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    FRONTEND_URL: 'http://localhost:3000',
    SMTP_HOST: '',
    SMTP_PORT: 465,
    SMTP_USER: '',
    SMTP_PASS: '',
  },
}));

// Mock logger
jest.mock('../../../config/logger', () => ({
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import { parseClientBankExchange } from '../clientBankExchange.parser';
import { AppError } from '../../../../middlewares/error';

describe('parseClientBankExchange', () => {
  const fixturesDir = join(__dirname, 'fixtures');

  describe('Парсинг корректного файла', () => {
    it('должен успешно распарсить файл с Windows-1251 кодировкой', () => {
      const filePath = join(fixturesDir, 'sample-statement.txt');
      const content = readFileSync(filePath);
      const result = parseClientBankExchange(content);

      expect(result.documents).toHaveLength(2);

      // Проверяем первую операцию
      expect(result.documents[0].date).toBeInstanceOf(Date);
      expect(result.documents[0].number).toBe('115');
      expect(result.documents[0].amount).toBe(8263.0);
      expect(result.documents[0].payer).toBe('ООО АКСОН');
      expect(result.documents[0].payerInn).toBe('5262382878');
      expect(result.documents[0].payerAccount).toBe('40702810068000001468');
      expect(result.documents[0].receiver).toBe('ФНС России');
      expect(result.documents[0].receiverInn).toBe('7727406020');
      expect(result.documents[0].receiverAccount).toBe('03100643000000018500');
      expect(result.documents[0].purpose).toBe('Единый налоговый платеж');

      // Проверяем вторую операцию
      expect(result.documents[1].number).toBe('116');
      expect(result.documents[1].amount).toBe(15000.5);
      expect(result.documents[1].purpose).toBe(
        'Оплата по счету №123 от 20.10.2025'
      );
    });

    it('должен успешно распарсить файл с UTF-8 кодировкой', () => {
      const filePath = join(fixturesDir, 'sample-statement-utf8.txt');
      const content = readFileSync(filePath);
      const result = parseClientBankExchange(content);

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].number).toBe('200');
      expect(result.documents[0].amount).toBe(5000.0); // Запятая должна быть заменена на точку
      expect(result.documents[0].receiver).toBe('ООО Клиент');
    });

    it('должен успешно распарсить файл из строки', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03
Кодировка=Windows

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=1000.00
НазначениеПлатежа=Тест
КонецДокумента`;

      const result = parseClientBankExchange(content);

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].amount).toBe(1000.0);
      expect(result.documents[0].date).toBeInstanceOf(Date);
    });
  });

  describe('Валидация формата файла', () => {
    it('должен выбросить ошибку для файла без заголовка 1CClientBankExchange', () => {
      const content = 'Invalid file content';
      expect(() => parseClientBankExchange(content)).toThrow(AppError);
      expect(() => parseClientBankExchange(content)).toThrow(
        'Invalid file format'
      );
    });

    it('должен выбросить ошибку для пустого файла', () => {
      expect(() => parseClientBankExchange('')).toThrow(AppError);
    });

    it('должен выбросить ошибку для файла без документов', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03
Кодировка=Windows`;
      expect(() => parseClientBankExchange(content)).toThrow(AppError);
      expect(() => parseClientBankExchange(content)).toThrow(
        'File contains no valid operations'
      );
    });
  });

  describe('Парсинг дат', () => {
    it('должен корректно парсить дату в формате DD.MM.YYYY', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=15.03.2025
Сумма=1000.00
НазначениеПлатежа=Тест
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents[0].date).toBeInstanceOf(Date);
      expect(result.documents[0].date.getFullYear()).toBe(2025);
      expect(result.documents[0].date.getMonth()).toBe(2); // месяцы начинаются с 0
      expect(result.documents[0].date.getDate()).toBe(15);
    });

    it('должен выбросить ошибку для невалидной даты', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=32.13.2025
Сумма=1000.00
НазначениеПлатежа=Тест
КонецДокумента`;

      expect(() => parseClientBankExchange(content)).toThrow(AppError);
    });

    it('должен выбросить ошибку для отсутствующей даты', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Сумма=1000.00
НазначениеПлатежа=Тест
КонецДокумента`;

      expect(() => parseClientBankExchange(content)).toThrow();
    });
  });

  describe('Парсинг сумм', () => {
    it('должен корректно парсить сумму с точкой', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=1234.56
НазначениеПлатежа=Тест
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents[0].amount).toBe(1234.56);
    });

    it('должен корректно парсить сумму с запятой', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=1234,56
НазначениеПлатежа=Тест
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents[0].amount).toBe(1234.56);
    });

    it('должен выбросить ошибку для отрицательной суммы', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=-100.00
НазначениеПлатежа=Тест
КонецДокумента`;

      expect(() => parseClientBankExchange(content)).toThrow(AppError);
    });

    it('должен выбросить ошибку для нулевой суммы', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=0.00
НазначениеПлатежа=Тест
КонецДокумента`;

      expect(() => parseClientBankExchange(content)).toThrow(AppError);
    });

    it('должен выбросить ошибку для отсутствующей суммы', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=01.01.2025
НазначениеПлатежа=Тест
КонецДокумента`;

      expect(() => parseClientBankExchange(content)).toThrow();
    });
  });

  describe('Валидация ИНН', () => {
    it('должен корректно парсить ИНН из 10 цифр', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=1000.00
ПлательщикИНН=1234567890
НазначениеПлатежа=Тест
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents[0].payerInn).toBe('1234567890');
    });

    it('должен корректно парсить ИНН из 12 цифр', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=1000.00
ПлательщикИНН=123456789012
НазначениеПлатежа=Тест
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents[0].payerInn).toBe('123456789012');
    });

    it('должен игнорировать ИНН с неправильной длиной', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=1000.00
ПлательщикИНН=12345
НазначениеПлатежа=Тест
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents[0].payerInn).toBeUndefined();
    });

    it('должен убирать пробелы из ИНН', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=1000.00
ПлательщикИНН=1234 5678 90
НазначениеПлатежа=Тест
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents[0].payerInn).toBe('1234567890');
    });
  });

  describe('Валидация номеров счетов', () => {
    it('должен корректно парсить номер счета из 20 цифр', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=1000.00
ПлательщикСчет=12345678901234567890
НазначениеПлатежа=Тест
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents[0].payerAccount).toBe('12345678901234567890');
    });

    it('должен игнорировать номер счета с неправильной длиной', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=1000.00
ПлательщикСчет=12345
НазначениеПлатежа=Тест
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents[0].payerAccount).toBeUndefined();
    });

    it('должен убирать пробелы из номера счета', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=1000.00
ПлательщикСчет=1234 5678 9012 3456 7890
НазначениеПлатежа=Тест
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents[0].payerAccount).toBe('12345678901234567890');
    });
  });

  describe('Обработка некорректных данных', () => {
    it('должен пропускать документы без обязательных полей', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Номер=100
КонецДокумента

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=1000.00
НазначениеПлатежа=Валидный документ
КонецДокумента`;

      const result = parseClientBankExchange(content);
      // Должен быть только один валидный документ
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].purpose).toBe('Валидный документ');
    });

    it('должен обрабатывать документы с пустыми полями', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=1000.00
Номер=
Плательщик=
НазначениеПлатежа=Тест
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].number).toBeUndefined();
      expect(result.documents[0].payer).toBeUndefined();
    });
  });

  describe('Обработка BOM (Byte Order Mark)', () => {
    it('должен корректно обрабатывать файл с BOM', () => {
      const content =
        '\uFEFF1CClientBankExchange\nВерсияФормата=1.03\n\nСекцияДокумент=Платежное поручение\nДата=01.01.2025\nСумма=1000.00\nНазначениеПлатежа=Тест\nКонецДокумента';
      const result = parseClientBankExchange(content);
      expect(result.documents).toHaveLength(1);
    });
  });
});
