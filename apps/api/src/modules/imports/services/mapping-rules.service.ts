import { Prisma } from '@prisma/client';
import prisma from '../../../config/db';
import { AppError } from '../../../middlewares/error';

/**
 * Service for managing mapping rules
 */
export class MappingRulesService {
  /**
   * Получает список правил маппинга
   */
  async getMappingRules(
    companyId: string,
    filters?: { targetType?: string; sourceField?: string }
  ): Promise<Prisma.MappingRuleGetPayload<Record<string, never>>[]> {
    const where: Prisma.MappingRuleWhereInput = { companyId };

    if (filters?.targetType) {
      where.targetType = filters.targetType;
    }

    if (filters?.sourceField) {
      where.sourceField = filters.sourceField;
    }

    return prisma.mappingRule.findMany({
      where,
      orderBy: { usageCount: 'desc' },
    });
  }

  /**
   * Создает правило маппинга
   */
  async createMappingRule(
    companyId: string,
    userId: string,
    data: {
      ruleType: 'contains' | 'equals' | 'regex' | 'alias';
      pattern: string;
      targetType: 'article' | 'counterparty' | 'account' | 'operationType';
      targetId?: string;
      targetName?: string;
      sourceField?: 'description' | 'receiver' | 'payer' | 'inn';
    }
  ): Promise<Prisma.MappingRuleGetPayload<Record<string, never>>> {
    return prisma.mappingRule.create({
      data: {
        companyId,
        userId,
        ruleType: data.ruleType,
        pattern: data.pattern,
        targetType: data.targetType,
        targetId: data.targetId || null,
        targetName: data.targetName || null,
        sourceField: data.sourceField || 'description',
      },
    });
  }

  /**
   * Обновляет правило маппинга
   */
  async updateMappingRule(
    id: string,
    companyId: string,
    data: Partial<{
      ruleType: string;
      pattern: string;
      targetType: string;
      targetId: string | null;
      targetName: string | null;
      sourceField: string;
    }>
  ): Promise<Prisma.MappingRuleGetPayload<Record<string, never>>> {
    const rule = await prisma.mappingRule.findFirst({
      where: { id, companyId },
    });

    if (!rule) {
      throw new AppError('Mapping rule not found', 404);
    }

    return prisma.mappingRule.update({
      where: { id, companyId },
      data,
    });
  }

  /**
   * Удаляет правило маппинга
   */
  async deleteMappingRule(
    id: string,
    companyId: string
  ): Promise<Prisma.MappingRuleGetPayload<Record<string, never>>> {
    const rule = await prisma.mappingRule.findFirst({
      where: { id, companyId },
    });

    if (!rule) {
      throw new AppError('Mapping rule not found', 404);
    }

    return prisma.mappingRule.delete({
      where: { id, companyId },
    });
  }

  /**
   * Сохраняет правила для операции в транзакции
   */
  async saveRulesForOperation(
    tx: Prisma.TransactionClient,
    companyId: string,
    userId: string,
    operation: {
      id: string;
      direction: string | null;
      description: string | null;
      payer: string | null;
      receiver: string | null;
      matchedArticleId: string | null;
      matchedCounterpartyId: string | null;
      matchedAccountId: string | null;
    }
  ): Promise<void> {
    // Сохраняем правила для контрагента
    if (operation.matchedCounterpartyId) {
      const pattern =
        operation.direction === 'expense'
          ? operation.receiver
          : operation.payer;
      if (pattern) {
        await tx.mappingRule.create({
          data: {
            companyId,
            userId,
            ruleType: 'contains',
            pattern,
            targetType: 'counterparty',
            targetId: operation.matchedCounterpartyId,
            sourceField:
              operation.direction === 'expense' ? 'receiver' : 'payer',
          },
        });
      }
    }

    // Сохраняем правила для статьи
    if (operation.matchedArticleId && operation.description) {
      await tx.mappingRule.create({
        data: {
          companyId,
          userId,
          ruleType: 'contains',
          pattern: operation.description,
          targetType: 'article',
          targetId: operation.matchedArticleId,
          sourceField: 'description',
        },
      });
    }

    // Сохраняем правила для счета
    if (operation.matchedAccountId && operation.description) {
      await tx.mappingRule.create({
        data: {
          companyId,
          userId,
          ruleType: 'contains',
          pattern: operation.description,
          targetType: 'account',
          targetId: operation.matchedAccountId,
          sourceField: 'description',
        },
      });
    }
  }
}

export default new MappingRulesService();
