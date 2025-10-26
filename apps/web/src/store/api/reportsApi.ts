import { apiSlice } from './apiSlice';
import type {
  DashboardReport,
  CashflowReport,
  BDDSReport,
  PlanFactReport,
  DDSReport,
} from '@shared/types/reports';

interface DashboardParams {
  periodFrom: string;
  periodTo: string;
  mode?: 'plan' | 'fact' | 'both';
  periodFormat?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

interface ReportParams {
  periodFrom: string;
  periodTo: string;
  activity?: string;
  level?: string;
}

interface BDDSReportParams {
  periodFrom: string;
  periodTo: string;
  activity?: string;
  budgetId?: string;
}

export const reportsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardReport, DashboardParams>({
      query: (params) => ({
        url: '/reports/dashboard',
        params,
      }),
      providesTags: ['Dashboard'],
    }),
    getCumulativeCashFlow: builder.query<{
      cumulativeSeries: Array<{
        date: string;
        label: string;
        cumulativeIncome: number;
        cumulativeExpense: number;
        cumulativeNetCashFlow: number;
        operations?: Array<{
          id: string;
          type: string;
          amount: number;
          description: string | null;
          article: {
            id: string;
            name: string;
          } | null;
        }>;
        hasOperations?: boolean;
      }>;
      summary: {
        totalIncome: number;
        totalExpense: number;
        totalNetCashFlow: number;
      };
    }, DashboardParams>({
      query: (params) => ({
        url: '/reports/dashboard/cumulative-cash-flow',
        params,
      }),
      providesTags: ['Dashboard'],
    }),
    getCashflowReport: builder.query<CashflowReport, ReportParams>({
      query: (params) => ({
        url: '/reports/cashflow',
        params,
      }),
      providesTags: ['Report'],
    }),
    getBddsReport: builder.query<BDDSReport, BDDSReportParams>({
      query: (params) => ({
        url: '/reports/bdds',
        params,
      }),
      providesTags: ['Report'],
    }),
    getPlanFactReport: builder.query<PlanFactReport, ReportParams>({
      query: (params) => ({
        url: '/reports/planfact',
        params,
      }),
      providesTags: ['Report'],
    }),
    getDdsReport: builder.query<DDSReport, ReportParams>({
      query: (params) => ({
        url: '/reports/dds',
        params,
      }),
      providesTags: ['Report'],
    }),
  }),
});

export const {
  useGetDashboardQuery,
  useGetCumulativeCashFlowQuery,
  useGetCashflowReportQuery,
  useGetBddsReportQuery,
  useGetPlanFactReportQuery,
  useGetDdsReportQuery,
} = reportsApi;
