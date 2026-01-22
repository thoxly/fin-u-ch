import prisma from '../../../../../config/db';
import { compareTwoStrings } from 'string-similarity';
import { MatchResult } from '../matching.types';

/**
 * Сопоставляет контрагента по fuzzy match (нечеткое совпадение)
 * TODO: Проверить соответствие требованиям ТЗ (порог ≥ 0.8, библиотека string-similarity)
 * Возможно, стоит рассмотреть использование fuse.js для более гибкого поиска
 */
export async function matchCounterpartyByFuzzy(
  companyId: string,
  nameToSearch: string
): Promise<MatchResult | null> {
  const counterparties = await prisma.counterparty.findMany({
    where: { companyId },
    select: { id: true, name: true },
    take: 1000, // Лимит для производительности
  });

  if (counterparties.length >= 1000) {
    // Если слишком много контрагентов, пропускаем fuzzy match
    return null;
  }

  let bestMatch: { id: string; similarity: number } | null = null;
  const threshold = 0.8;

  for (const counterparty of counterparties) {
    const similarity = compareTwoStrings(
      nameToSearch.toLowerCase(),
      counterparty.name.toLowerCase()
    );

    if (
      similarity >= threshold &&
      (!bestMatch || similarity > bestMatch.similarity)
    ) {
      bestMatch = { id: counterparty.id, similarity };
    }
  }

  if (bestMatch) {
    return {
      id: bestMatch.id,
      matchedBy: 'fuzzy',
    };
  }

  return null;
}
