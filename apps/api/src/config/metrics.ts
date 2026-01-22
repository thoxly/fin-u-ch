import { Counter, Histogram, Gauge } from 'prom-client';
import { performance } from 'perf_hooks';

// We'll use the default registry from prom-client
// It will be shared with express-prom-bundle

// Report execution time metrics
export const reportDurationHistogram = new Histogram({
  name: 'api_report_duration_seconds',
  help: 'Duration of report generation in seconds',
  labelNames: ['report_type', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

// Database query duration metrics
export const dbQueryDurationHistogram = new Histogram({
  name: 'api_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['model', 'operation', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});

// Slow queries counter (queries > 1s)
export const slowQueryCounter = new Counter({
  name: 'api_db_slow_queries_total',
  help: 'Total number of slow database queries (>1s)',
  labelNames: ['model', 'operation'],
});

// Event loop lag gauge
export const eventLoopLagGauge = new Gauge({
  name: 'api_event_loop_lag_seconds',
  help: 'Event loop lag in seconds',
});

// Database connection pool metrics (if available)
export const dbPoolSizeGauge = new Gauge({
  name: 'api_db_pool_size',
  help: 'Database connection pool size',
  labelNames: ['state'], // 'active', 'idle', 'waiting'
});

// Report request counter
export const reportRequestCounter = new Counter({
  name: 'api_report_requests_total',
  help: 'Total number of report requests',
  labelNames: ['report_type', 'status'],
});

// Redis cache metrics
export const redisCacheHitCounter = new Counter({
  name: 'api_redis_cache_hits_total',
  help: 'Total number of Redis cache hits',
  labelNames: ['cache_type'],
});

export const redisCacheMissCounter = new Counter({
  name: 'api_redis_cache_misses_total',
  help: 'Total number of Redis cache misses',
  labelNames: ['cache_type'],
});

export const redisOperationDurationHistogram = new Histogram({
  name: 'api_redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
});

// Redis connection status gauge
export const redisConnectionStatusGauge = new Gauge({
  name: 'api_redis_connection_status',
  help: 'Redis connection status (1 = connected, 0 = disconnected)',
});

// Start monitoring event loop lag
let eventLoopLagStart = performance.now();
let eventLoopLagTimeout: NodeJS.Timeout | null = null;

export function startEventLoopLagMonitoring(): void {
  const measureLag = () => {
    const start = performance.now();
    setImmediate(() => {
      const lag = (performance.now() - start) / 1000; // Convert to seconds
      eventLoopLagGauge.set(lag);
      eventLoopLagStart = performance.now();

      // Schedule next measurement
      eventLoopLagTimeout = setTimeout(measureLag, 1000);
    });
  };

  measureLag();
}

export function stopEventLoopLagMonitoring(): void {
  if (eventLoopLagTimeout) {
    clearTimeout(eventLoopLagTimeout);
    eventLoopLagTimeout = null;
  }
}

// Helper to track report execution
export function trackReportExecution<T>(
  reportType: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  return fn()
    .then((result) => {
      const duration = (performance.now() - start) / 1000; // Convert to seconds
      reportDurationHistogram.observe(
        { report_type: reportType, status: 'success' },
        duration
      );
      reportRequestCounter.inc({ report_type: reportType, status: 'success' });
      return result;
    })
    .catch((error) => {
      const duration = (performance.now() - start) / 1000;
      reportDurationHistogram.observe(
        { report_type: reportType, status: 'error' },
        duration
      );
      reportRequestCounter.inc({ report_type: reportType, status: 'error' });
      throw error;
    });
}

// Helper to track database query
export function trackDbQuery(
  model: string,
  operation: string,
  duration: number,
  success: boolean
): void {
  const durationSeconds = duration / 1000;
  dbQueryDurationHistogram.observe(
    { model, operation, status: success ? 'success' : 'error' },
    durationSeconds
  );

  // Track slow queries (>1s)
  if (durationSeconds > 1) {
    slowQueryCounter.inc({ model, operation });
  }
}
