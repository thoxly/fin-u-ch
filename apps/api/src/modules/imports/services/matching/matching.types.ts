import { ParsedDocument } from '../../parsers/clientBankExchange.parser';

export interface MatchingResult {
  matchedArticleId?: string;
  matchedCounterpartyId?: string;
  matchedAccountId?: string;
  matchedBy?: string;
  matchedRuleId?: string;
  direction?: 'income' | 'expense' | 'transfer';
}

export interface MatchResult {
  id?: string;
  matchedBy?: string;
  ruleId?: string;
}

export interface KeywordRule {
  keywords: string[];
  articleNames: string[];
}
