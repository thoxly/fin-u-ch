import { Prisma } from '@prisma/client';
import prisma from '../../../config/db';
import { ParsedDocument, DuplicateCheckResult } from '@fin-u-ch/shared';

/**
 * Service for detecting duplicate operations
 */
export class DuplicateDetectionService {
  /**
   * Проверяет, является ли операция дубликатом существующей
   *
   * Критерии дубликата (сравниваем ТОЛЬКО исходные данные из выписки):
   * 1. Совпадает дата (в пределах 2 дней)
   * 2. Совпадает сумма (точно)
   * 3. Совпадает хотя бы одно из:
   *    - Номер документа
   *    - ИНН плательщика или получателя
   *    - Имена плательщика и получателя
   *    - Назначение платежа
   */
  async detectDuplicate(
    companyId: string,
    doc: ParsedDocument
  ): Promise<DuplicateCheckResult> {
    const dateFrom = new Date(doc.date);
    dateFrom.setDate(dateFrom.getDate() - 2); // -2 дня
    const dateTo = new Date(doc.date);
    dateTo.setDate(dateTo.getDate() + 2); // +2 дня

    // 1. Проверяем среди уже импортированных операций (таблица operation)
    // ВАЖНО: в таблице operation нет исходных данных из выписки (payer, receiver, payerInn и т.д.)
    // Поэтому сравниваем только по: дате, сумме и описанию
    const whereOperation: Prisma.OperationWhereInput = {
      companyId,
      operationDate: {
        gte: dateFrom,
        lte: dateTo,
      },
      amount: doc.amount,
    };

    const existingOperations = await prisma.operation.findMany({
      where: whereOperation,
      take: 10, // Ограничиваем поиск для производительности
    });

    // Проверяем совпадение по описанию (назначению платежа)
    for (const existing of existingOperations) {
      // Сравниваем описание - если совпадает хотя бы частично (первые 50 символов)
      const docDesc = (doc.purpose || '').toLowerCase().trim();
      const existingDesc = (existing.description || '').toLowerCase().trim();

      if (
        docDesc &&
        existingDesc &&
        docDesc.length > 10 &&
        existingDesc.length > 10
      ) {
        const minLength = Math.min(50, docDesc.length, existingDesc.length);
        const docSubstr = docDesc.substring(0, minLength);
        const existingSubstr = existingDesc.substring(0, minLength);

        // Если совпадают первые N символов назначения платежа - это дубликат
        if (docSubstr === existingSubstr) {
          return {
            isDuplicate: true,
            duplicateOfId: existing.id,
            existingOperation: existing,
          };
        }
      }
    }

    // 2. Проверяем среди импортированных, но не обработанных операций (таблица imported_operations)
    // Здесь есть все исходные данные из выписки, поэтому сравниваем более точно
    const whereImported: Prisma.ImportedOperationWhereInput = {
      companyId,
      date: {
        gte: dateFrom,
        lte: dateTo,
      },
      amount: doc.amount,
      processed: false, // только необработанные
    };

    const importedOperations = await prisma.importedOperation.findMany({
      where: whereImported,
      take: 10,
    });

    // Проверяем каждую импортированную операцию по исходным данным
    for (const imported of importedOperations) {
      const matchResult = this.checkOperationMatch(doc, {
        number: imported.number,
        payerInn: imported.payerInn,
        receiverInn: imported.receiverInn,
        payer: imported.payer,
        receiver: imported.receiver,
        description: imported.description,
      });

      if (matchResult) {
        return {
          isDuplicate: true,
          duplicateOfId: imported.id,
          existingOperation: imported,
        };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Проверяет совпадение операции по различным критериям
   */
  private checkOperationMatch(
    doc: ParsedDocument,
    existing: {
      number?: string | null;
      payerInn?: string | null;
      receiverInn?: string | null;
      payer?: string | null;
      receiver?: string | null;
      description?: string | null;
    }
  ): boolean {
    // Проверка 1: Совпадение по номеру документа
    if (doc.number && existing.number) {
      // Если в existing.number есть полный номер или это description с номером
      const numberMatch = existing.number.match(/№?\s*(\d+)/);
      if (numberMatch && numberMatch[1] === doc.number) {
        return true;
      }
      // Прямое совпадение номера
      if (existing.number === doc.number) {
        return true;
      }
    }

    // Проверка 2: Совпадение по ИНН
    const payerInnMatch = doc.payerInn && existing.payerInn === doc.payerInn;
    const receiverInnMatch =
      doc.receiverInn && existing.receiverInn === doc.receiverInn;

    if (payerInnMatch || receiverInnMatch) {
      return true;
    }

    // Проверка 3: Совпадение по именам контрагентов (частичное)
    const payerNameMatch =
      doc.payer &&
      existing.payer &&
      (existing.payer
        .toLowerCase()
        .includes(doc.payer.toLowerCase().substring(0, 20)) ||
        doc.payer
          .toLowerCase()
          .includes(existing.payer.toLowerCase().substring(0, 20)));
    const receiverNameMatch =
      doc.receiver &&
      existing.receiver &&
      (existing.receiver
        .toLowerCase()
        .includes(doc.receiver.toLowerCase().substring(0, 20)) ||
        doc.receiver
          .toLowerCase()
          .includes(existing.receiver.toLowerCase().substring(0, 20)));

    if (payerNameMatch || receiverNameMatch) {
      // Дополнительно проверяем совпадение description (частично)
      const descMatch =
        doc.purpose &&
        existing.description &&
        (existing.description
          .toLowerCase()
          .includes(doc.purpose.toLowerCase().substring(0, 30)) ||
          doc.purpose
            .toLowerCase()
            .includes(existing.description.toLowerCase().substring(0, 30)));

      if (descMatch) {
        return true;
      }

      // Если совпадают и плательщик и получатель, это уже достаточно
      if (
        (payerNameMatch && receiverNameMatch) ||
        payerInnMatch ||
        receiverInnMatch
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Batch duplicate detection for multiple documents
   * Оптимизированная версия для проверки множества документов за раз
   */
  async detectDuplicatesBatch(
    companyId: string,
    documents: ParsedDocument[]
  ): Promise<Map<ParsedDocument, DuplicateCheckResult>> {
    const results = new Map<ParsedDocument, DuplicateCheckResult>();

    if (documents.length === 0) {
      return results;
    }

    // Находим минимальную и максимальную даты для оптимизации запроса
    const dates = documents.map((doc) => new Date(doc.date));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    minDate.setDate(minDate.getDate() - 2);
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    maxDate.setDate(maxDate.getDate() + 2);

    // Собираем все уникальные суммы
    const amounts = [...new Set(documents.map((doc) => doc.amount))];

    // Загружаем все потенциально подходящие операции одним запросом
    const existingOperations = await prisma.operation.findMany({
      where: {
        companyId,
        operationDate: {
          gte: minDate,
          lte: maxDate,
        },
        amount: { in: amounts },
      },
      select: {
        id: true,
        operationDate: true,
        amount: true,
        description: true,
      },
    });

    const importedOperations = await prisma.importedOperation.findMany({
      where: {
        companyId,
        date: {
          gte: minDate,
          lte: maxDate,
        },
        amount: { in: amounts },
        processed: false,
      },
      select: {
        id: true,
        date: true,
        amount: true,
        number: true,
        payerInn: true,
        receiverInn: true,
        payer: true,
        receiver: true,
        description: true,
      },
    });

    // Проверяем каждый документ
    for (const doc of documents) {
      const dateFrom = new Date(doc.date);
      dateFrom.setDate(dateFrom.getDate() - 2);
      const dateTo = new Date(doc.date);
      dateTo.setDate(dateTo.getDate() + 2);

      // Фильтруем операции по дате и сумме для текущего документа
      const relevantOperations = existingOperations.filter(
        (op) =>
          op.amount === doc.amount &&
          op.operationDate >= dateFrom &&
          op.operationDate <= dateTo
      );

      // Проверяем совпадения
      let foundDuplicate = false;
      for (const existing of relevantOperations) {
        const docDesc = (doc.purpose || '').toLowerCase().trim();
        const existingDesc = (existing.description || '').toLowerCase().trim();

        if (
          docDesc &&
          existingDesc &&
          docDesc.length > 10 &&
          existingDesc.length > 10
        ) {
          const minLength = Math.min(50, docDesc.length, existingDesc.length);
          const docSubstr = docDesc.substring(0, minLength);
          const existingSubstr = existingDesc.substring(0, minLength);

          if (docSubstr === existingSubstr) {
            results.set(doc, {
              isDuplicate: true,
              duplicateOfId: existing.id,
              existingOperation: existing,
            });
            foundDuplicate = true;
            break;
          }
        }
      }

      if (foundDuplicate) {
        continue;
      }

      // Проверяем импортированные операции
      const relevantImported = importedOperations.filter(
        (op) =>
          op.amount === doc.amount && op.date >= dateFrom && op.date <= dateTo
      );

      for (const imported of relevantImported) {
        const matchResult = this.checkOperationMatch(doc, {
          number: imported.number,
          payerInn: imported.payerInn,
          receiverInn: imported.receiverInn,
          payer: imported.payer,
          receiver: imported.receiver,
          description: imported.description,
        });

        if (matchResult) {
          results.set(doc, {
            isDuplicate: true,
            duplicateOfId: imported.id,
            existingOperation: imported,
          });
          foundDuplicate = true;
          break;
        }
      }

      if (!foundDuplicate) {
        results.set(doc, { isDuplicate: false });
      }
    }

    return results;
  }
}

export default new DuplicateDetectionService();
