import { useMemo } from 'react';
import type { Deal } from '@fin-u-ch/shared';

/**
 * Хук для фильтрации сделок по контрагенту
 */
export const useFilteredDeals = (
  counterpartyId: string | undefined,
  deals: Deal[]
): Deal[] => {
  return useMemo(() => {
    if (!counterpartyId) return deals;
    return deals.filter((deal) => deal.counterpartyId === counterpartyId);
  }, [deals, counterpartyId]);
};
