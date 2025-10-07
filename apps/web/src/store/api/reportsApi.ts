import { apiSlice } from './apiSlice';
import type {
  DashboardReport,
  CashflowReport,
  BDDSReport,
  PlanFactReport,
} from '@shared/types/reports';

interface DashboardParams {
  periodFrom: string;
  periodTo: string;
  mode?: 'plan' | 'fact' | 'both';
}

interface ReportParams {
  periodFrom: string;
  periodTo: string;
  activity?: string;
  level?: string;
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
    getCashflowReport: builder.query<CashflowReport, ReportParams>({
      query: (params) => ({
        url: '/reports/cashflow',
        params,
      }),
      providesTags: ['Report'],
    }),
    getBddsReport: builder.query<BDDSReport, ReportParams>({
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
  }),
});

export const {
  useGetDashboardQuery,
  useGetCashflowReportQuery,
  useGetBddsReportQuery,
  useGetPlanFactReportQuery,
} = reportsApi;
