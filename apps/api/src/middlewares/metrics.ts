import type { RequestHandler } from 'express';

let metricsMiddleware: RequestHandler | null = null;

export class MetricsService {
  public static async getMetricsMiddleware(): Promise<RequestHandler> {
    if (!metricsMiddleware) {
      const { default: promBundle } = await import('express-prom-bundle');

      metricsMiddleware = promBundle({
        includeMethod: true,
        includePath: true,
        includeStatusCode: true,
        includeUp: true,
        customLabels: {
          project_name: 'finance-api',
          app_version: process.env.APP_VERSION || '1.0.0',
        },
        normalizePath: [
          ['^/api/users/[^/]+', '/api/users/#id'],
          ['^/api/companies/[^/]+', '/api/companies/#id'],
          ['^/api/articles/[^/]+', '/api/articles/#id'],
          ['^/api/accounts/[^/]+', '/api/accounts/#id'],
          ['^/api/departments/[^/]+', '/api/departments/#id'],
          ['^/api/counterparties/[^/]+', '/api/counterparties/#id'],
          ['^/api/deals/[^/]+', '/api/deals/#id'],
          ['^/api/salaries/[^/]+', '/api/salaries/#id'],
          ['^/api/operations/[^/]+', '/api/operations/#id'],
          ['^/api/plans/[^/]+', '/api/plans/#id'],
          ['^/api/budgets/[^/]+', '/api/budgets/#id'],
        ],
      });
    }

    return metricsMiddleware;
  }
}
