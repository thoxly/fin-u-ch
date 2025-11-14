/**
 * Import and mapping types
 */

export interface ImportSession {
  id: string;
  companyId: string;
  userId: string;
  fileName: string;
  status: 'draft' | 'confirmed' | 'processed' | 'canceled';
  importedCount: number;
  confirmedCount: number;
  processedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportedOperation {
  id: string;
  importSessionId: string;
  companyId: string;
  date: Date;
  number?: string | null;
  amount: number;
  description: string;
  direction?: 'income' | 'expense' | 'transfer' | null;
  payer?: string | null;
  payerInn?: string | null;
  payerAccount?: string | null;
  receiver?: string | null;
  receiverInn?: string | null;
  receiverAccount?: string | null;
  matchedArticleId?: string | null;
  matchedCounterpartyId?: string | null;
  matchedAccountId?: string | null;
  matchedDealId?: string | null;
  matchedDepartmentId?: string | null;
  currency?: string;
  repeat?: string; // none|daily|weekly|monthly|quarterly|semiannual|annual
  matchedBy?: string | null;
  matchedRuleId?: string | null;
  confirmed: boolean;
  processed: boolean;
  draft: boolean;
  createdAt: Date;
  updatedAt: Date;
  matchedArticle?: { id: string; name: string } | null;
  matchedCounterparty?: { id: string; name: string } | null;
  matchedAccount?: { id: string; name: string } | null;
  matchedDeal?: { id: string; name: string } | null;
  matchedDepartment?: { id: string; name: string } | null;
}

export interface MappingRule {
  id: string;
  companyId: string;
  userId: string;
  ruleType: 'contains' | 'equals' | 'regex' | 'alias';
  pattern: string;
  targetType: 'article' | 'counterparty' | 'account' | 'operationType';
  targetId?: string | null;
  targetName?: string | null;
  sourceField: 'description' | 'receiver' | 'payer' | 'inn';
  usageCount: number;
  lastUsedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportedOperationsResponse {
  operations: ImportedOperation[];
  total: number;
  confirmed: number;
  unmatched: number;
}

export interface ImportSessionsResponse {
  sessions: ImportSession[];
  total: number;
}

export interface ImportOperationsRequest {
  operationIds?: string[];
  saveRulesForIds?: string[];
}
