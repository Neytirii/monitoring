-- =============================================================================
-- TimescaleDB initialisation — runs once when the database is first created
-- =============================================================================

-- 1. Enable TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 2. Create the raw metrics table (NOT managed by Prisma)
--    Prisma handles all relational tables; this hypertable lives alongside them.
CREATE TABLE IF NOT EXISTS metrics (
    time        TIMESTAMPTZ       NOT NULL,
    host_id     TEXT              NOT NULL,
    tenant_id   TEXT              NOT NULL,
    name        TEXT              NOT NULL,
    value       DOUBLE PRECISION  NOT NULL,
    tags        JSONB             NOT NULL DEFAULT '{}'
);

-- 3. Convert to hypertable (partitioned by time automatically)
SELECT create_hypertable('metrics', 'time', if_not_exists => TRUE);

-- 4. Indexes for the query patterns used in metrics.ts
CREATE INDEX IF NOT EXISTS idx_metrics_host_time   ON metrics (host_id,   time DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_tenant_time ON metrics (tenant_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_name_time   ON metrics (name,      time DESC);
