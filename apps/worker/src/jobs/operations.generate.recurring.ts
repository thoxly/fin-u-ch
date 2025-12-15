import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

interface GenerateRecurringParams {
  companyId?: string; // Optional: generate for specific company only
  targetDate?: Date; // Optional: target date for generation (default: today)
}

/**
 * Генерирует периодические операции на указанную дату
 *
 * Для каждой операции-шаблона (isTemplate: true с периодичностью)
 * проверяет, нужна ли новая операция на целевую дату, и создает ее если нужно
 */
export async function generateRecurringOperations(
  params: GenerateRecurringParams = {}
): Promise<void> {
  const { companyId, targetDate = new Date() } = params;

  // Устанавливаем время на начало дня для целевой даты
  const today = new Date(targetDate);
  today.setHours(0, 0, 0, 0);

  logger.info(
    `Starting recurring operations generation for date: ${today.toISOString()}${companyId ? ` (company: ${companyId})` : ''}`
  );

  try {
    // Находим все операции-шаблоны (isTemplate: true с периодичностью)
    const templateOperations = await prisma.operation.findMany({
      where: {
        ...(companyId && { companyId }),
        repeat: { not: 'none' },
        isTemplate: true,
        // Проверяем, что шаблон еще активен (дата окончания не наступила)
        OR: [
          { recurrenceEndDate: null },
          { recurrenceEndDate: { gte: today } },
        ],
      },
      include: {
        company: true,
      },
    });

    if (templateOperations.length === 0) {
      logger.info('No active recurring operation templates found');
      return;
    }

    logger.info(
      `Found ${templateOperations.length} recurring operation template(s)`
    );

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const template of templateOperations) {
      try {
        // Проверяем, нужно ли создавать операцию на эту дату
        const shouldCreate = await shouldCreateRecurrence(template, today);

        if (!shouldCreate) {
          totalSkipped++;
          continue;
        }

        // Проверяем, что операция на эту дату еще не создана
        const existingOperation = await prisma.operation.findFirst({
          where: {
            recurrenceParentId: template.id,
            operationDate: today,
          },
        });

        if (existingOperation) {
          logger.debug(
            `Operation already exists for template ${template.id} on ${today.toISOString()}`
          );
          totalSkipped++;
          continue;
        }

        // Создаем новую операцию-копию в транзакции для атомарности
        await prisma.$transaction(async (tx) => {
          // Дополнительная проверка на существование операции в транзакции
          const existingInTx = await tx.operation.findFirst({
            where: {
              recurrenceParentId: template.id,
              operationDate: today,
            },
          });

          if (existingInTx) {
            logger.debug(
              `Operation already exists in transaction for template ${template.id} on ${today.toISOString()}`
            );
            return;
          }

          await tx.operation.create({
            data: {
              companyId: template.companyId,
              type: template.type,
              operationDate: today,
              amount: template.amount,
              currency: template.currency,
              accountId: template.accountId,
              sourceAccountId: template.sourceAccountId,
              targetAccountId: template.targetAccountId,
              articleId: template.articleId,
              counterpartyId: template.counterpartyId,
              dealId: template.dealId,
              departmentId: template.departmentId,
              description: template.description, // Копируем описание как есть, без изменений
              repeat: 'none', // Дочерняя операция не повторяется
              recurrenceParentId: template.id,
              recurrenceEndDate: null,
              isConfirmed: false, // Требует подтверждения
              isTemplate: false, // Реальная операция
            },
          });
        });

        totalCreated++;
        logger.info(
          `Created recurring operation for template ${template.id}, amount: ${template.amount}, date: ${today.toISOString()}`
        );
      } catch (error) {
        logger.error(
          `Error generating recurring operation for template ${template.id}:`,
          error
        );
        // Продолжаем обработку остальных шаблонов
      }
    }

    logger.info(
      `Recurring operations generation completed. Created: ${totalCreated}, Skipped: ${totalSkipped}`
    );
  } catch (error) {
    logger.error('Error in generateRecurringOperations:', error);
    throw error;
  }
}

/**
 * Определяет, нужно ли создавать операцию на указанную дату
 * на основе периодичности и даты последней операции
 */
async function shouldCreateRecurrence(
  template: {
    id: string;
    operationDate: Date;
    repeat: string;
    recurrenceEndDate: Date | null;
  },
  targetDate: Date
): Promise<boolean> {
  const templateDate = new Date(template.operationDate);
  templateDate.setHours(0, 0, 0, 0);

  // Проверяем, что целевая дата не раньше даты шаблона
  if (targetDate < templateDate) {
    return false;
  }

  // Проверяем дату окончания периодичности
  if (template.recurrenceEndDate) {
    const endDate = new Date(template.recurrenceEndDate);
    endDate.setHours(0, 0, 0, 0);
    if (targetDate > endDate) {
      return false;
    }
  }

  // Рассчитываем, должна ли операция быть создана на эту дату
  switch (template.repeat) {
    case 'daily':
      return true; // Каждый день

    case 'weekly': {
      // Каждую неделю в тот же день недели
      const templateDay = templateDate.getDay();
      const targetDay = targetDate.getDay();
      return templateDay === targetDay;
    }

    case 'monthly': {
      // Каждый месяц в то же число
      const templateDay = templateDate.getDate();
      const targetDay = targetDate.getDate();
      return templateDay === targetDay;
    }

    case 'quarterly': {
      // Каждый квартал (каждые 3 месяца)
      const templateDay = templateDate.getDate();
      const targetDay = targetDate.getDate();
      if (templateDay !== targetDay) return false;

      const templateMonth = templateDate.getMonth();
      const targetMonth = targetDate.getMonth();
      const monthDiff = targetMonth - templateMonth;
      return monthDiff % 3 === 0;
    }

    case 'semiannual': {
      // Каждые полгода (каждые 6 месяцев)
      const templateDay = templateDate.getDate();
      const targetDay = targetDate.getDate();
      if (templateDay !== targetDay) return false;

      const templateMonth = templateDate.getMonth();
      const targetMonth = targetDate.getMonth();
      const monthDiff = targetMonth - templateMonth;
      return monthDiff % 6 === 0;
    }

    case 'annual': {
      // Каждый год в ту же дату
      const templateDay = templateDate.getDate();
      const templateMonth = templateDate.getMonth();
      const targetDay = targetDate.getDate();
      const targetMonth = targetDate.getMonth();
      return templateDay === targetDay && templateMonth === targetMonth;
    }

    default:
      return false;
  }
}

/**
 * Форматирует текущую дату в формат YYYY-MM-DD
 */
export function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
