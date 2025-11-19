/**
 * Operation and Plan types
 */

export interface Operation {
  id: string;
  companyId: string;
  type: 'income' | 'expense' | 'transfer';
  operationDate: Date;
  amount: number;
  currency: string;
  accountId?: string | null;
  sourceAccountId?: string | null;
  targetAccountId?: string | null;
  articleId: string;
  counterpartyId?: string | null;
  dealId?: string | null;
  departmentId?: string | null;
  description?: string | null;
  repeat:
    | 'none'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'quarterly'
    | 'semiannual'
    | 'annual';
  recurrenceParentId?: string | null;
  recurrenceEndDate?: Date | null;
  isConfirmed: boolean;
  isTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface PlanItem {
  id: string;
  companyId: string;
  type: 'income' | 'expense' | 'transfer';
  startDate: Date;
  endDate?: Date | null;
  amount: number;
  currency: string;
  articleId: string;
  counterpartyId?: string | null;
  dealId?: string | null;
  departmentId?: string | null;
  budgetId?: string | null;
  description?: string | null;
  repeat:
    | 'none'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'quarterly'
    | 'semiannual'
    | 'annual';
  accountId?: string | null;
  sourceAccountId?: string | null;
  targetAccountId?: string | null;
  status: 'active' | 'paused' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateOperationDTO {
  type: 'income' | 'expense' | 'transfer';
  operationDate: Date | string;
  amount: number;
  currency: string;
  accountId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  articleId: string;
  counterpartyId?: string;
  dealId?: string;
  departmentId?: string;
  description?: string;
  repeat?:
    | 'none'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'quarterly'
    | 'semiannual'
    | 'annual';
  recurrenceEndDate?: Date | string;
  isTemplate?: boolean;
}

export interface CreatePlanItemDTO {
  type: 'income' | 'expense' | 'transfer';
  startDate: Date | string;
  endDate?: Date | string;
  amount: number;
  currency: string;
  articleId: string;
  counterpartyId?: string;
  dealId?: string;
  departmentId?: string;
  budgetId?: string;
  description?: string;
  repeat:
    | 'none'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'quarterly'
    | 'semiannual'
    | 'annual';
  accountId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  status?: 'active' | 'paused' | 'archived';
}

export interface MonthlyAmount {
  month: string;
  amount: number;
}

export interface Budget {
  id: string;
  companyId: string;
  name: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateBudgetDTO {
  name: string;
  startDate: Date | string;
  endDate?: Date | string;
}

export interface UpdateBudgetDTO {
  name?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  status?: string;
}

export interface ConfirmOperationDTO {
  isConfirmed: boolean;
}
