import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

// Type helper for Prisma transaction client
type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

interface GenerateSalaryParams {
  month: string; // Format: YYYY-MM
  companyId?: string; // Optional: generate for specific company only
}

/**
 * Генерирует зарплатные операции за указанный месяц
 *
 * Для каждой активной записи Salary создаёт 3 операции расхода:
 * 1. ФОТ (начисление зарплаты)
 * 2. Взносы (страховые взносы)
 * 3. НДФЛ (налог на доходы физических лиц)
 */
export async function generateSalaryOperations(
  params: GenerateSalaryParams
): Promise<void> {
  const { month, companyId } = params;

  logger.info(
    `Starting salary generation for month: ${month}${companyId ? ` (company: ${companyId})` : ''}`
  );

  try {
    // Парсим месяц в Date
    const [year, monthNum] = month.split('-').map(Number);
    const targetDate = new Date(year, monthNum - 1, 1);

    // Получаем активные записи зарплат
    const salaries = await (prisma as any).salary.findMany({
      where: {
        ...(companyId && { companyId }),
        effectiveFrom: { lte: targetDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: targetDate } }],
      },
      include: {
        company: true,
        employeeCounterparty: {
          select: {
            id: true,
            name: true,
          },
        },
        department: true,
      },
    });

    if (salaries.length === 0) {
      logger.info('No active salaries found for the specified period');
      return;
    }

    logger.info(`Found ${salaries.length} active salary record(s)`);

    let totalOperations = 0;

    for (const salary of salaries) {
      try {
        // Находим статьи для зарплатных операций
        const articles = await findOrCreateSalaryArticles(salary.companyId);

        // Рассчитываем суммы
        const baseWage = salary.baseWage;
        const contributions = (baseWage * salary.contributionsPct) / 100;
        const incomeTax = (baseWage * salary.incomeTaxPct) / 100;

        // Находим счет компании (берем первый активный)
        const account = await prisma.account.findFirst({
          where: {
            companyId: salary.companyId,
            isActive: true,
          },
        });

        if (!account) {
          logger.warn(
            `No active account found for company ${salary.companyId}, skipping`
          );
          continue;
        }

        // Создаем операции в транзакции
        await prisma.$transaction(async (tx: TransactionClient) => {
          // 1. ФОТ (начисление зарплаты)
          await tx.operation.create({
            data: {
              companyId: salary.companyId,
              type: 'expense',
              operationDate: targetDate,
              amount: baseWage,
              currency: salary.company?.currencyBase || 'RUB',
              accountId: account.id,
              articleId: articles.wage.id,
              counterpartyId: salary.employeeCounterpartyId,
              departmentId: salary.departmentId,
              description: `Зарплата за ${month} - ${salary.employeeCounterparty?.name || 'Неизвестно'}`,
            },
          });

          // 2. Взносы (страховые взносы)
          await tx.operation.create({
            data: {
              companyId: salary.companyId,
              type: 'expense',
              operationDate: targetDate,
              amount: contributions,
              currency: salary.company?.currencyBase || 'RUB',
              accountId: account.id,
              articleId: articles.contributions.id,
              counterpartyId: salary.employeeCounterpartyId,
              departmentId: salary.departmentId,
              description: `Страховые взносы за ${month} - ${salary.employeeCounterparty?.name || 'Неизвестно'} (${salary.contributionsPct}%)`,
            },
          });

          // 3. НДФЛ
          await tx.operation.create({
            data: {
              companyId: salary.companyId,
              type: 'expense',
              operationDate: targetDate,
              amount: incomeTax,
              currency: salary.company?.currencyBase || 'RUB',
              accountId: account.id,
              articleId: articles.incomeTax.id,
              counterpartyId: salary.employeeCounterpartyId,
              departmentId: salary.departmentId,
              description: `НДФЛ за ${month} - ${salary.employeeCounterparty?.name || 'Неизвестно'} (${salary.incomeTaxPct}%)`,
            },
          });
        });

        totalOperations += 3;
        logger.info(
          `Generated salary operations for ${salary.employeeCounterparty?.name || 'Неизвестно'}: ` +
            `wage=${baseWage}, contributions=${contributions.toFixed(2)}, tax=${incomeTax.toFixed(2)}`
        );
      } catch (error) {
        logger.error(
          `Error generating salary for ${salary.employeeCounterparty?.name || 'Неизвестно'}:`,
          error
        );
        // Продолжаем обработку остальных записей
      }
    }

    logger.info(
      `Salary generation completed. Total operations created: ${totalOperations}`
    );
  } catch (error) {
    logger.error('Error in generateSalaryOperations:', error);
    throw error;
  }
}

/**
 * Находит или создает стандартные статьи для зарплатных операций
 */
async function findOrCreateSalaryArticles(companyId: string) {
  // Проверяем существующие статьи
  const existingArticles = await prisma.article.findMany({
    where: {
      companyId,
      name: {
        in: ['Зарплата', 'Страховые взносы', 'НДФЛ'],
      },
    },
  });

  const articleMap = new Map(
    existingArticles.map((a: { name: string; id: string }) => [a.name, a])
  );

  // Создаем недостающие статьи
  const wageArticle =
    articleMap.get('Зарплата') ||
    (await prisma.article.create({
      data: {
        companyId,
        name: 'Зарплата',
        type: 'expense',
        activity: 'operating',
        indicator: 'cash',
        isActive: true,
        description: 'Фонд оплаты труда (ФОТ)',
      },
    }));

  const contributionsArticle =
    articleMap.get('Страховые взносы') ||
    (await prisma.article.create({
      data: {
        companyId,
        name: 'Страховые взносы',
        type: 'expense',
        activity: 'operating',
        indicator: 'cash',
        isActive: true,
        description: 'Страховые взносы на зарплату',
      },
    }));

  const incomeTaxArticle =
    articleMap.get('НДФЛ') ||
    (await prisma.article.create({
      data: {
        companyId,
        name: 'НДФЛ',
        type: 'expense',
        activity: 'operating',
        indicator: 'cash',
        isActive: true,
        description: 'Налог на доходы физических лиц',
      },
    }));

  return {
    wage: wageArticle,
    contributions: contributionsArticle,
    incomeTax: incomeTaxArticle,
  };
}

/**
 * Форматирует текущий месяц в формат YYYY-MM
 */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
