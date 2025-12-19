-- Enable pg_stat_statements extension for query performance monitoring
-- This extension is required for postgres_exporter to collect query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

