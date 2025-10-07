/**
 * Enums for domain model
 */

export enum OperationType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
}

export enum Activity {
  OPERATING = 'operating',
  INVESTING = 'investing',
  FINANCING = 'financing',
}

export enum CounterpartyCategory {
  SUPPLIER = 'supplier',
  CUSTOMER = 'customer',
  GOV = 'gov',
  EMPLOYEE = 'employee',
  OTHER = 'other',
}

export enum Periodicity {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMIANNUAL = 'semiannual',
  ANNUAL = 'annual',
}

export enum PlanStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum ArticleIndicator {
  // For expense
  AMORTIZATION = 'amortization',
  DIVIDENDS = 'dividends',
  TAXES = 'taxes',
  OPEX = 'opex',
  INTEREST = 'interest',
  OTHER = 'other',
  COGS = 'cogs',
  LOAN_PRINCIPAL = 'loan_principal',
  PAYROLL = 'payroll',
  // For income
  REVENUE = 'revenue',
  OTHER_INCOME = 'other_income',
}
