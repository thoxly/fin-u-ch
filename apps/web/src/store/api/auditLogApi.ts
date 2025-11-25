import { apiSlice } from './apiSlice';

export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  changes?: {
    old?: Record<string, unknown>;
    new?: Record<string, unknown>;
  };
  metadata?: {
    ip?: string;
    userAgent?: string;
    bulk?: boolean;
    [key: string]: unknown;
  };
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface GetAuditLogsParams {
  userId?: string;
  entity?: string;
  entityId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export const auditLogApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query<AuditLogsResponse, GetAuditLogsParams | void>({
      query: (params) => ({
        url: '/audit-logs',
        params,
      }),
      providesTags: ['AuditLog'],
    }),
    getEntityLogs: builder.query<
      AuditLogsResponse,
      { entity: string; entityId: string }
    >({
      query: ({ entity, entityId }) =>
        `/audit-logs/entity/${entity}/${entityId}`,
      providesTags: ['AuditLog'],
    }),
    getUserLogs: builder.query<
      AuditLogsResponse,
      { userId: string; limit?: number }
    >({
      query: ({ userId, limit }) => ({
        url: `/audit-logs/user/${userId}`,
        params: limit ? { limit } : undefined,
      }),
      providesTags: ['AuditLog'],
    }),
  }),
});

export const {
  useGetAuditLogsQuery,
  useGetEntityLogsQuery,
  useGetUserLogsQuery,
} = auditLogApi;
