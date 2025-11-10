/**
 * Operation and Plan types
 */

import { OperationType, Periodicity, PlanStatus } from '../constants/enums';

export interface Operation {
  id: string;
  companyId: string;
  type: OperationType;
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
  repeat: Periodicity;
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
  type: OperationType;
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
  repeat: Periodicity;
  accountId?: string | null;
  sourceAccountId?: string | null;
  targetAccountId?: string | null;
  status: PlanStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateOperationDTO {
  type: OperationType;
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
  repeat?: Periodicity;
  recurrenceEndDate?: Date | string;
  isTemplate?: boolean;
}

export interface CreatePlanItemDTO {
  type: OperationType;
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
  repeat: Periodicity;
  accountId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  status?: PlanStatus;
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
