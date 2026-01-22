import prisma from '../../../../../config/db';
import { ParsedDocument } from '../../../parsers/clientBankExchange.parser';
import { MatchResult } from '../matching.types';
import { matchCounterpartyByRules } from './counterparty-rules-matcher.service';
import { matchCounterpartyByFuzzy } from './counterparty-fuzzy-matcher.service';

/**
 * Сопоставляет контрагента по ИНН, правилам и fuzzy match
 */
export async function matchCounterparty(
  companyId: string,
  operation: ParsedDocument,
  direction: 'income' | 'expense' | 'transfer' | null
): Promise<MatchResult | null> {
  // 1. Сопоставление по ИНН (100% совпадение)
  if (operation.payerInn || operation.receiverInn) {
    const innToSearch =
      direction === 'expense' ? operation.receiverInn : operation.payerInn;

    if (innToSearch) {
      const counterparty = await prisma.counterparty.findFirst({
        where: {
          companyId,
          inn: innToSearch,
        },
      });

      if (counterparty) {
        return {
          id: counterparty.id,
          matchedBy: 'inn',
        };
      }
    }
  }

  // 2. Сопоставление по правилам маппинга
  // Если direction не определен, пробуем оба варианта
  let nameToSearch: string | undefined;
  let sourceField: 'payer' | 'receiver' | undefined;

  if (direction === 'expense') {
    nameToSearch = operation.receiver;
    sourceField = 'receiver';
  } else if (direction === 'income') {
    nameToSearch = operation.payer;
    sourceField = 'payer';
  } else {
    // Если direction не определен, пробуем оба поля
    // Сначала пробуем receiver, потом payer
    nameToSearch = operation.receiver || operation.payer;
    sourceField = operation.receiver ? 'receiver' : 'payer';
  }

  // Если direction = null, пробуем оба поля последовательно
  const fieldsToCheck: Array<{
    field: 'payer' | 'receiver';
    name: string | null | undefined;
  }> = [];

  if (direction === null) {
    // При direction = null проверяем оба поля
    if (operation.receiver) {
      fieldsToCheck.push({ field: 'receiver', name: operation.receiver });
    }
    if (operation.payer) {
      fieldsToCheck.push({ field: 'payer', name: operation.payer });
    }
  } else {
    // При известном направлении проверяем только нужное поле
    if (nameToSearch) {
      fieldsToCheck.push({ field: sourceField!, name: nameToSearch });
    }
  }

  // Проверяем каждое поле для всех типов правил
  for (const { field, name } of fieldsToCheck) {
    if (!name) continue;

    const ruleMatch = await matchCounterpartyByRules(
      companyId,
      name,
      field,
      direction
    );

    if (ruleMatch) {
      return ruleMatch;
    }
  }

  // 3. Fuzzy match по названию контрагента
  if (nameToSearch) {
    const fuzzyMatch = await matchCounterpartyByFuzzy(companyId, nameToSearch);
    if (fuzzyMatch) {
      return fuzzyMatch;
    }
  }

  return null;
}
