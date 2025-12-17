/**
 * Catalog types: Accounts, Departments, Counterparties, Deals, Articles
 */

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
  category: 'supplier' | 'customer' | 'gov' | 'employee' | 'other';
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
  type: 'income' | 'expense' | 'transfer';
  activity?: 'operating' | 'investing' | 'financing' | null;
  indicator?:
    | 'amortization'
    | 'dividends'
    | 'taxes'
    | 'opex'
    | 'interest'
    | 'other'
    | 'cogs'
    | 'loan_principal'
    | 'payroll'
    | 'revenue'
    | 'other_income'
    | null;
  isActive: boolean;
  counterpartyId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
