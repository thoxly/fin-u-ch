// Mock env.ts before importing anything that uses it
jest.mock('../../../../config/env', () => ({
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
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock('../../../../config/logger', () => ({
  __esModule: true,
  default: mockLogger,
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import { parseClientBankExchange } from '../clientBankExchange.parser';
import { AppError } from '../../../../middlewares/error';

describe('parseClientBankExchange', () => {
  const fixturesDir = join(__dirname, 'fixtures');

  describe('Парсинг корректного файла', () => {
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
        'File has no valid documents'
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

  describe('Поддержка различных типов документов', () => {
    it('должен парсить Платежное поручение', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=1000.00
НазначениеПлатежа=Тест
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents).toHaveLength(1);
      expect(result.stats.documentTypesFound).toContain('Платежное поручение');
    });

    it('должен парсить Банковский ордер', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Банковский ордер
Дата=01.01.2025
Сумма=5000.00
НазначениеПлатежа=Банковский ордер
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents).toHaveLength(1);
    });

    it('должен парсить СБП', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=СБП
Дата=01.01.2025
Сумма=2500.00
НазначениеПлатежа=Оплата через СБП
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents).toHaveLength(1);
    });

    it('должен парсить Списание', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Списание
Дата=01.01.2025
Сумма=150.00
НазначениеПлатежа=Комиссия
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents).toHaveLength(1);
    });

    it('должен парсить Поступление', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Поступление
Дата=01.01.2025
Сумма=10000.00
НазначениеПлатежа=Поступление от клиента
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents).toHaveLength(1);
    });

    it('должен пропускать неподдерживаемые типы документов', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Справка о состоянии счета
Дата=01.01.2025
Сумма=0.00
НазначениеПлатежа=Справка
КонецДокумента

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=1000.00
НазначениеПлатежа=Валидный документ
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].purpose).toBe('Валидный документ');
      expect(result.stats.documentsSkipped).toBe(1);
      expect(result.stats.skippedDocumentTypes).toHaveLength(1);
    });
  });

  describe('Приоритет дат (ДатаСписано/ДатаПоступило)', () => {
    it('должен использовать ДатаСписано для списаний', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=01.01.2025
ДатаСписано=02.01.2025
Сумма=1000.00
НазначениеПлатежа=Тест
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].date.getDate()).toBe(2); // Должна использоваться ДатаСписано
    });

    it('должен использовать ДатаПоступило для поступлений', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Поступление
Дата=01.01.2025
ДатаПоступило=03.01.2025
Сумма=5000.00
НазначениеПлатежа=Тест
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].date.getDate()).toBe(3); // Должна использоваться ДатаПоступило
    });

    it('должен fallback на Дата если специальных дат нет', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=05.01.2025
Сумма=1000.00
НазначениеПлатежа=Тест
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].date.getDate()).toBe(5);
    });
  });

  describe('Парсинг сумм с пробелами', () => {
    it('должен корректно парсить сумму с пробелами', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=1 000 000,50
НазначениеПлатежа=Тест
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents[0].amount).toBe(1000000.5);
    });

    it('должен парсить суммы в разных форматах', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=100 000
НазначениеПлатежа=Тест 1
КонецДокумента

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=50 000.75
НазначениеПлатежа=Тест 2
КонецДокумента

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=25 000,99
НазначениеПлатежа=Тест 3
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents).toHaveLength(3);
      expect(result.documents[0].amount).toBe(100000);
      expect(result.documents[1].amount).toBe(50000.75);
      expect(result.documents[2].amount).toBe(25000.99);
    });
  });

  describe('Игнорирование СекцияРасчСчет', () => {
    it('должен игнорировать СекцияРасчСчет и парсить только документы', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03
РасчСчет=40702810138000123456

СекцияРасчСчет
ДатаНачала=01.11.2025
ДатаКонца=01.11.2025
НачальныйОстаток=1000000.00
ВсегоПоступило=250000.00
ВсегоСписано=150000.00
КонечныйОстаток=1100000.00
КонецРасчСчет

СекцияДокумент=Платежное поручение
Номер=1001
Дата=01.11.2025
Сумма=100000.00
НазначениеПлатежа=Оплата услуг
КонецДокумента

СекцияРасчСчет
ДатаНачала=02.11.2025
ДатаКонца=02.11.2025
НачальныйОстаток=1100000.00
ВсегоПоступило=150000.00
ВсегоСписано=100000.00
КонечныйОстаток=1150000.00
КонецРасчСчет

СекцияДокумент=Платежное поручение
Номер=1002
Дата=02.11.2025
Сумма=50000.00
НазначениеПлатежа=Оплата за товар
КонецДокумента`;

      const result = parseClientBankExchange(content);
      expect(result.documents).toHaveLength(2);
      expect(result.companyAccountNumber).toBe('40702810138000123456');
    });
  });

  describe('Реальные файлы банков', () => {
    it('должен корректно парсить файл Сбербанка с ежедневными секциями', () => {
      const filePath = join(fixturesDir, 'sber-with-daily-sections.txt');
      const content = readFileSync(filePath);

      const result = parseClientBankExchange(content);

      expect(result.documents.length).toBeGreaterThanOrEqual(3);
      expect(result.companyAccountNumber).toBe('40702810138000123456');
      expect(result.stats.documentTypesFound).toContain('Платежное поручение');
      expect(result.stats.documentTypesFound).toContain('Банковский ордер');
    });

    it('должен корректно парсить файл Т-Банка', () => {
      const filePath = join(fixturesDir, 'tbank-simple.txt');
      const content = readFileSync(filePath);

      const result = parseClientBankExchange(content);

      expect(result.documents.length).toBe(3);
      expect(result.companyAccountNumber).toBe('40702810500000123456');
      expect(result.stats.documentTypesFound).toContain('Платежное поручение');
      expect(result.stats.documentTypesFound).toContain('Списание');
      expect(result.stats.documentTypesFound).toContain('СБП');
    });

    it('должен корректно парсить файл с различными типами документов', () => {
      const filePath = join(fixturesDir, 'various-doc-types.txt');
      const content = readFileSync(filePath);

      const result = parseClientBankExchange(content);

      expect(result.documents.length).toBe(5);
      expect(result.stats.documentTypesFound).toContain('Мемориальный ордер');
      expect(result.stats.documentTypesFound).toContain('Инкассовое поручение');
      expect(result.stats.documentTypesFound).toContain(
        'Объявление на взнос наличными'
      );
      expect(result.stats.documentTypesFound).toContain('Карточные операции');
      expect(result.stats.documentTypesFound).toContain('Комиссия');
    });
  });

  describe('Расширенная статистика', () => {
    it('должен возвращать статистику по обработке документов', () => {
      const content = `1CClientBankExchange
ВерсияФормата=1.03

СекцияДокумент=Справка
Дата=01.01.2025
Сумма=0.00
КонецДокумента

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=1000.00
КонецДокумента

СекцияДокумент=Акт сверки
Дата=01.01.2025
Сумма=0.00
КонецДокумента`;

      const result = parseClientBankExchange(content);

      expect(result.stats).toBeDefined();
      expect(result.stats.documentsStarted).toBe(3);
      expect(result.stats.documentsFound).toBe(1);
      expect(result.stats.documentsSkipped).toBe(2);
      expect(result.stats.skippedDocumentTypes).toHaveLength(2);
    });
  });
});
