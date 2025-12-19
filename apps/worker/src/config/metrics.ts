import { Registry, Counter, Histogram, Gauge } from 'prom-client';

// Create a Registry to register metrics
export const register = new Registry();

// Add default metrics (CPU, memory, etc.)
import { collectDefaultMetrics } from 'prom-client';
collectDefaultMetrics({ register });

// Job execution counter
export const jobCounter = new Counter({
  name: 'worker_job_total',
  help: 'Total number of job executions',
  labelNames: ['job_name', 'status'],
  registers: [register],
});

// Job duration histogram
export const jobDuration = new Histogram({
  name: 'worker_job_duration_seconds',
  help: 'Duration of job execution in seconds',
  labelNames: ['job_name'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120],
  registers: [register],
});

// Last successful job execution timestamp
export const jobLastSuccess = new Gauge({
  name: 'worker_job_last_success_timestamp',
  help: 'Timestamp of last successful job execution',
  labelNames: ['job_name'],
  registers: [register],
});
