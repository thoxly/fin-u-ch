/**
 * Report types
 */

import { OperationType, Activity } from '../constants/enums';

export interface DashboardReport {
  // Общие суммы
  summary: {
    income: number;
    expense: number;
    netProfit: number;
  };
  
  // Серии для графика доходов/расходов
  incomeExpenseSeries: Array<{
    date: string;
    label: string;
    income: number;
    expense: number;
    netCashFlow: number;
  }>;
  
  // Остатки по счетам по интервалам
  accountBalancesSeries: Array<{
    date: string;
    label: string;
    accounts: Record<string, number>;
  }>;
  
  // Справочник счетов
  accounts: Array<{
    id: string;
    name: string;
  }>;
  
  // Финальные балансы на конец периода
  finalBalances: Array<{
    accountId: string;
    accountName: string;
    balance: number;
  }>;
}

export interface AccountBalance {
  accountId: string;
  accountName: string;
  currency: string;
  balance: number;
}

export interface TimeSeries {
  month: string;
  income: number;
  expense: number;
  netProfit: number;
  plan?: {
    income: number;
    expense: number;
    netProfit: number;
  };
}

export interface CashflowReport {
  periodFrom: string;
  periodTo: string;
  activities: ActivityGroup[];
}

export interface ActivityGroup {
  activity: Activity;
  incomeGroups: ArticleGroup[];
  expenseGroups: ArticleGroup[];
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
}

export interface ArticleGroup {
  articleId: string;
  articleName: string;
  type: OperationType;
  months: MonthlyData[];
  total: number;
}

export interface MonthlyData {
  month: string;
  amount: number;
}

export interface BDDSReport {
  periodFrom: string;
  periodTo: string;
  budgetId?: string;
  activities: ActivityGroup[];
}

export interface BDDSRow {
  articleId: string;
  articleName: string;
  type: OperationType;
  months: MonthlyData[];
  total: number;
}

export interface PlanFactReport {
  periodFrom: string;
  periodTo: string;
  level: 'article' | 'department' | 'deal';
  rows: PlanFactRow[];
}

export interface PlanFactRow {
  key: string;
  month: string;
  articleId?: string;
  articleName?: string;
  departmentId?: string;
  departmentName?: string;
  dealId?: string;
  dealName?: string;
  plan: number;
  fact: number;
  delta: number;
  deltaPercent: number;
}

export interface DDSReport {
  accounts: DDSAccountBalance[];
  inflows: DDSFlow[];
  outflows: DDSFlow[];
  summary: DDSSummary;
}

export interface DDSAccountBalance {
  accountId: string;
  accountName: string;
  openingBalance: number;
  closingBalance: number;
}

export interface DDSFlow {
  articleId: string;
  articleName: string;
  type: 'income' | 'expense';
  months: Record<string, number>;
  total: number;
}

export interface DDSSummary {
  totalInflow: number;
  totalOutflow: number;
  netCashflow: number;
}

export interface ReportFilters {
  periodFrom: string;
  periodTo: string;
  mode?: 'plan' | 'fact' | 'both';
  activity?: Activity;
  level?: 'article' | 'department' | 'deal';
  articleId?: string;
  departmentId?: string;
  dealId?: string;
  counterpartyId?: string;
  accountId?: string;
  budgetId?: string;
}
