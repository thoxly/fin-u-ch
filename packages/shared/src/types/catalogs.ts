/**
 * Catalog types: Accounts, Departments, Counterparties, Deals, Articles
 */

import {
  CounterpartyCategory,
  OperationType,
  Activity,
  ArticleIndicator,
} from '../constants/enums';

export interface Account {
  id: string;
  companyId: string;
  name: string;
  number?: string | null;
  currency: string;
  openingBalance: number;
  excludeFromTotals: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Counterparty {
  id: string;
  companyId: string;
  name: string;
  inn?: string | null;
  category: CounterpartyCategory;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Deal {
  id: string;
  companyId: string;
  name: string;
  amount?: number | null;
  departmentId?: string | null;
  counterpartyId?: string | null;
  ownerUserId?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Article {
  id: string;
  companyId: string;
  name: string;
  parentId?: string | null;
  type: OperationType;
  activity: Activity;
  indicator: ArticleIndicator;
  isActive: boolean;
  counterpartyId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Salary {
  id: string;
  companyId: string;
  employeeCounterpartyId: string;
  departmentId?: string | null;
  baseWage: number;
  contributionsPct: number;
  incomeTaxPct: number;
  periodicity: 'monthly';
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}

export interface GeneratedSalaryOperation {
  id: string;
  salaryId: string;
  month: string;
  createdOperationId: string;
  breakdown: Record<string, unknown>;
}
