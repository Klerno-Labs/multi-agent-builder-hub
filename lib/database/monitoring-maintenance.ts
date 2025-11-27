/**
 * Monitoring & Maintenance - Database health monitoring and maintenance patterns
 */

export interface DatabaseHealth {
  status: "healthy" | "degraded" | "critical";
  connectionPool: PoolMetrics;
  slowQueries: number;
  diskUsage: DiskMetrics;
  locks: LockMetrics;
  replication?: ReplicationMetrics;
}

export interface PoolMetrics {
  total: number;
  active: number;
  idle: number;
  waiting: number;
}

export interface DiskMetrics {
  total: string;
  used: string;
  available: string;
  percentUsed: number;
}

export interface LockMetrics {
  activeBlocking: number;
  waiting: number;
}

export interface ReplicationMetrics {
  lag: number; // milliseconds
  status: "syncing" | "in_sync" | "error";
}

/**
 * Health check patterns
 */
export const healthCheckPatterns = {
  /**
   * Basic database connectivity check
   */
  basicHealthCheck: `import { Pool } from 'pg';

export async function checkDatabaseHealth(pool: Pool): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1');
    return result.rows.length === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Express health check endpoint
app.get('/health/db', async (req, res) => {
  const isHealthy = await checkDatabaseHealth(pool);
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
  });
});`,

  /**
   * Comprehensive health check
   */
  comprehensiveHealthCheck: `export async function comprehensiveHealthCheck(pool: Pool): Promise<DatabaseHealth> {
  const [connectionPool, slowQueries, diskUsage, locks] = await Promise.all([
    checkConnectionPool(pool),
    checkSlowQueries(pool),
    checkDiskUsage(pool),
    checkLocks(pool),
  ]);

  const status = determineHealthStatus({
    connectionPool,
    slowQueries,
    diskUsage,
    locks,
  });

  return {
    status,
    connectionPool,
    slowQueries,
    diskUsage,
    locks,
  };
}

async function checkConnectionPool(pool: Pool): Promise<PoolMetrics> {
  return {
    total: pool.totalCount,
    active: pool.idleCount,
    idle: pool.waitingCount,
    waiting: pool.totalCount - pool.idleCount - pool.waitingCount,
  };
}

async function checkSlowQueries(pool: Pool): Promise<number> {
  const result = await pool.query(\`
    SELECT COUNT(*)
    FROM pg_stat_activity
    WHERE state = 'active'
      AND (now() - query_start) > interval '10 seconds'
  \`);
  return parseInt(result.rows[0].count);
}

async function checkDiskUsage(pool: Pool): Promise<DiskMetrics> {
  const result = await pool.query(\`
    SELECT
      pg_size_pretty(pg_database_size(current_database())) as used,
      pg_size_pretty(pg_tablespace_size('pg_default')) as total
  \`);
  // Parse and calculate percentage
  return {
    total: result.rows[0].total,
    used: result.rows[0].used,
    available: '...',
    percentUsed: 75, // Calculate actual percentage
  };
}

async function checkLocks(pool: Pool): Promise<LockMetrics> {
  const result = await pool.query(\`
    SELECT
      COUNT(*) FILTER (WHERE NOT granted) as waiting,
      COUNT(*) FILTER (WHERE granted AND pid IN (
        SELECT blocking_pid FROM pg_blocking_pids(pid) WHERE blocking_pid IS NOT NULL
      )) as blocking
    FROM pg_locks
  \`);
  return {
    activeBlocking: parseInt(result.rows[0].blocking || 0),
    waiting: parseInt(result.rows[0].waiting || 0),
  };
}`,

  /**
   * Replication lag check
   */
  replicationLagCheck: `-- Check replication lag (PostgreSQL)
-- Run on replica server

SELECT
  CASE
    WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn() THEN 0
    ELSE EXTRACT(EPOCH FROM now() - pg_last_xact_replay_timestamp())
  END AS lag_seconds,
  pg_last_wal_receive_lsn() AS received_lsn,
  pg_last_wal_replay_lsn() AS replayed_lsn,
  pg_last_xact_replay_timestamp() AS last_replay;

-- Alert if lag > 5 seconds
-- (Indicates replica is falling behind)`,
};

/**
 * Performance monitoring queries
 */
export const performanceMonitoring = {
  /**
   * Active connections
   */
  activeConnections: `-- Monitor active connections
SELECT
  count(*),
  state,
  usename,
  application_name
FROM pg_stat_activity
WHERE state IS NOT NULL
GROUP BY state, usename, application_name
ORDER BY count(*) DESC;

-- Alert if active connections > 80% of max_connections`,

  /**
   * Long-running queries
   */
  longRunningQueries: `-- Find queries running longer than 10 seconds
SELECT
  pid,
  now() - query_start AS duration,
  state,
  query,
  wait_event_type,
  wait_event
FROM pg_stat_activity
WHERE state != 'idle'
  AND (now() - query_start) > interval '10 seconds'
ORDER BY duration DESC;

-- Kill long-running query if needed
-- SELECT pg_terminate_backend(pid);`,

  /**
   * Blocking queries
   */
  blockingQueries: `-- Find blocking queries
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement,
  blocked_activity.application_name AS blocked_application
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;`,

  /**
   * Cache hit ratio
   */
  cacheHitRatio: `-- Database cache hit ratio (should be > 95%)
SELECT
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit)  as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 AS ratio
FROM pg_statio_user_tables;

-- If ratio < 95%, consider increasing shared_buffers`,

  /**
   * Table sizes
   */
  tableSizes: `-- Top 10 largest tables
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY size_bytes DESC
LIMIT 10;`,

  /**
   * Index usage
   */
  indexUsage: `-- Unused indexes (candidates for removal)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Missing indexes (sequential scans on large tables)
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / seq_scan AS avg_seq_read,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS table_size
FROM pg_stat_user_tables
WHERE seq_scan > 0
  AND seq_tup_read / seq_scan > 1000
ORDER BY seq_tup_read DESC
LIMIT 20;`,

  /**
   * Deadlocks
   */
  deadlocks: `-- Check for deadlocks
SELECT
  datname,
  deadlocks
FROM pg_stat_database
WHERE datname = current_database();

-- Investigate deadlock causes
-- Check application logs and pg_locks during deadlock`,
};

/**
 * Backup strategies
 */
export const backupStrategies = {
  /**
   * Logical backup (pg_dump)
   */
  pgDump: `#!/bin/bash
# Logical backup with pg_dump

# Full database backup
pg_dump -h localhost -U postgres -d mydb -F c -f /backups/mydb_\$(date +%Y%m%d_%H%M%S).dump

# Compressed backup
pg_dump -h localhost -U postgres -d mydb | gzip > /backups/mydb_\$(date +%Y%m%d_%H%M%S).sql.gz

# Backup specific tables
pg_dump -h localhost -U postgres -d mydb -t users -t posts -F c -f /backups/mydb_tables.dump

# Backup schema only (no data)
pg_dump -h localhost -U postgres -d mydb --schema-only -f /backups/mydb_schema.sql

# Restore from backup
pg_restore -h localhost -U postgres -d mydb -c /backups/mydb_20230101.dump

# Schedule daily backups (crontab)
# 0 2 * * * /scripts/backup_database.sh`,

  /**
   * Physical backup (pg_basebackup)
   */
  pgBaseBackup: `#!/bin/bash
# Physical backup with pg_basebackup

# Full cluster backup
pg_basebackup -h localhost -U replication_user -D /backups/base -Ft -z -P

# Benefits:
# - Faster backup and restore for large databases
# - Point-in-time recovery (PITR) with WAL archiving
# - Can be used for replication setup

# Restore:
# 1. Stop PostgreSQL
# 2. Clear data directory
# 3. Extract backup to data directory
# 4. Start PostgreSQL`,

  /**
   * Continuous archiving (WAL)
   */
  walArchiving: `# Configure WAL archiving in postgresql.conf

wal_level = replica
archive_mode = on
archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
archive_timeout = 300  # Force WAL file switch every 5 minutes

# Take base backup
pg_basebackup -h localhost -U replication_user -D /backups/base -Ft -z

# Point-in-time recovery
# 1. Restore base backup
# 2. Create recovery.conf:
#    restore_command = 'cp /archive/%f %p'
#    recovery_target_time = '2023-01-01 12:00:00'
# 3. Start PostgreSQL (will recover to specified time)`,

  /**
   * Automated backup script
   */
  automatedBackup: `#!/bin/bash
# Automated database backup script

BACKUP_DIR="/backups"
DB_NAME="mydb"
DB_USER="postgres"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/\${DB_NAME}_$TIMESTAMP.dump"

# Create backup
echo "Starting backup of $DB_NAME..."
pg_dump -h localhost -U $DB_USER -d $DB_NAME -F c -f $BACKUP_FILE

# Check if backup succeeded
if [ $? -eq 0 ]; then
  echo "Backup completed successfully: $BACKUP_FILE"

  # Compress backup
  gzip $BACKUP_FILE

  # Upload to S3 (optional)
  aws s3 cp $BACKUP_FILE.gz s3://my-backups/database/

  # Delete old backups
  find $BACKUP_DIR -name "\${DB_NAME}_*.dump.gz" -mtime +$RETENTION_DAYS -delete

  echo "Backup retention: $RETENTION_DAYS days"
else
  echo "Backup failed!"
  # Send alert
  exit 1
fi`,

  /**
   * Backup verification
   */
  verifyBackup: `#!/bin/bash
# Verify backup integrity

BACKUP_FILE=$1

# Test restore to temporary database
createdb test_restore
pg_restore -d test_restore $BACKUP_FILE

if [ $? -eq 0 ]; then
  # Run validation queries
  psql -d test_restore -c "SELECT COUNT(*) FROM users;"
  psql -d test_restore -c "SELECT COUNT(*) FROM posts;"

  echo "Backup verified successfully"
  dropdb test_restore
else
  echo "Backup verification failed!"
  exit 1
fi`,
};

/**
 * Vacuum and analyze
 */
export const vacuumAndAnalyze = {
  /**
   * Auto-vacuum configuration
   */
  autoVacuumConfig: `-- Configure auto-vacuum in postgresql.conf

autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min

# Per-table settings
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50
autovacuum_vacuum_scale_factor = 0.2
autovacuum_analyze_scale_factor = 0.1

# Monitor auto-vacuum
SELECT
  schemaname,
  tablename,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze,
  n_dead_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;`,

  /**
   * Manual vacuum
   */
  manualVacuum: `-- Vacuum specific table
VACUUM users;

-- Vacuum and analyze (update statistics)
VACUUM ANALYZE users;

-- Full vacuum (reclaims space, locks table)
VACUUM FULL users;

-- Verbose output
VACUUM VERBOSE users;

-- Vacuum entire database
VACUUM;`,

  /**
   * Analyze tables
   */
  analyzeTables: `-- Analyze specific table (update query planner statistics)
ANALYZE users;

-- Analyze all tables
ANALYZE;

-- Analyze with verbose output
ANALYZE VERBOSE users;

-- When to run ANALYZE:
-- - After bulk data changes (INSERT, UPDATE, DELETE)
-- - After creating indexes
-- - When query plans seem suboptimal`,

  /**
   * Reindex
   */
  reindex: `-- Reindex specific index
REINDEX INDEX idx_users_email;

-- Reindex table (all indexes)
REINDEX TABLE users;

-- Reindex database
REINDEX DATABASE mydb;

-- Reindex concurrently (PostgreSQL 12+, doesn't lock)
REINDEX INDEX CONCURRENTLY idx_users_email;

-- When to reindex:
-- - Index bloat (wasted space)
-- - Corruption
-- - After major updates`,
};

/**
 * Monitoring tools integration
 */
export const monitoringTools = {
  /**
   * Prometheus metrics exporter
   */
  prometheusExporter: `import promClient from 'prom-client';
import { Pool } from 'pg';

const register = new promClient.Registry();

// Database connection pool metrics
const poolTotalGauge = new promClient.Gauge({
  name: 'db_pool_total_connections',
  help: 'Total number of database connections in pool',
  registers: [register],
});

const poolActiveGauge = new promClient.Gauge({
  name: 'db_pool_active_connections',
  help: 'Number of active database connections',
  registers: [register],
});

const poolIdleGauge = new promClient.Gauge({
  name: 'db_pool_idle_connections',
  help: 'Number of idle database connections',
  registers: [register],
});

// Query metrics
const queryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

// Update metrics periodically
export function startMetricsCollection(pool: Pool) {
  setInterval(() => {
    poolTotalGauge.set(pool.totalCount);
    poolActiveGauge.set(pool.totalCount - pool.idleCount);
    poolIdleGauge.set(pool.idleCount);
  }, 5000);
}

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});`,

  /**
   * Grafana dashboard query examples
   */
  grafanaDashboard: `# Prometheus queries for Grafana

# Database connections
sum(db_pool_active_connections)

# Connection pool utilization
(sum(db_pool_active_connections) / sum(db_pool_total_connections)) * 100

# Query latency p95
histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (le))

# Slow queries per minute
sum(rate(db_query_duration_seconds_count{le="1"}[5m])) * 60`,

  /**
   * Custom monitoring dashboard
   */
  customDashboard: `export async function getDatabaseMetrics(pool: Pool) {
  const [
    connectionCount,
    tableSize,
    slowQueries,
    cacheHitRatio,
    deadlocks,
  ] = await Promise.all([
    pool.query('SELECT count(*) FROM pg_stat_activity'),
    pool.query(\`
      SELECT pg_size_pretty(pg_database_size(current_database()))
    \`),
    pool.query(\`
      SELECT count(*) FROM pg_stat_activity
      WHERE state = 'active'
        AND (now() - query_start) > interval '5 seconds'
    \`),
    pool.query(\`
      SELECT
        sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100
      FROM pg_statio_user_tables
    \`),
    pool.query(\`
      SELECT deadlocks FROM pg_stat_database
      WHERE datname = current_database()
    \`),
  ]);

  return {
    connections: parseInt(connectionCount.rows[0].count),
    databaseSize: tableSize.rows[0].pg_size_pretty,
    slowQueries: parseInt(slowQueries.rows[0].count),
    cacheHitRatio: parseFloat(cacheHitRatio.rows[0].ratio || 0),
    deadlocks: parseInt(deadlocks.rows[0].deadlocks),
    timestamp: new Date().toISOString(),
  };
}`,
};

/**
 * Alerting rules
 */
export const alertingRules = {
  /**
   * Alert conditions
   */
  conditions: [
    {
      name: "High CPU usage",
      condition: "cpu_usage > 80%",
      duration: "5 minutes",
      severity: "warning",
    },
    {
      name: "Low disk space",
      condition: "disk_free < 10%",
      duration: "1 minute",
      severity: "critical",
    },
    {
      name: "Too many connections",
      condition: "active_connections > max_connections * 0.8",
      duration: "2 minutes",
      severity: "warning",
    },
    {
      name: "Slow queries",
      condition: "query_duration > 10 seconds",
      duration: "immediate",
      severity: "warning",
    },
    {
      name: "Replication lag",
      condition: "replication_lag > 5 seconds",
      duration: "1 minute",
      severity: "warning",
    },
    {
      name: "Database down",
      condition: "health_check_failed",
      duration: "immediate",
      severity: "critical",
    },
  ],

  /**
   * Alert implementation
   */
  alertImplementation: `import nodemailer from 'nodemailer';

interface Alert {
  name: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
}

export async function sendAlert(alert: Alert) {
  // Log alert
  console.error(\`[ALERT] \${alert.severity.toUpperCase()}: \${alert.name}\`);
  console.error(\`Message: \${alert.message}\`);
  console.error(\`Value: \${alert.value}, Threshold: \${alert.threshold}\`);

  // Send email notification
  if (alert.severity === 'critical') {
    await sendEmailAlert(alert);
  }

  // Send to Slack/Discord
  await sendSlackAlert(alert);

  // Create incident in PagerDuty (critical only)
  if (alert.severity === 'critical') {
    await createPagerDutyIncident(alert);
  }
}

async function sendEmailAlert(alert: Alert) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: 'alerts@example.com',
    to: 'oncall@example.com',
    subject: \`[DATABASE ALERT] \${alert.name}\`,
    text: alert.message,
  });
}`,
};

/**
 * Maintenance best practices
 */
export const maintenanceBestPractices = {
  daily: [
    "Monitor active connections",
    "Check for long-running queries",
    "Review slow query log",
    "Monitor disk usage",
    "Check replication lag",
  ],

  weekly: [
    "Analyze unused indexes",
    "Review table bloat",
    "Check vacuum statistics",
    "Verify backup integrity",
    "Review error logs",
  ],

  monthly: [
    "Full database backup verification",
    "Review and optimize slow queries",
    "Check for missing indexes",
    "Analyze table statistics",
    "Review security patches",
    "Plan capacity upgrades if needed",
  ],

  quarterly: [
    "Performance benchmark",
    "Disaster recovery drill",
    "Review retention policies",
    "Optimize database configuration",
    "Plan for scaling needs",
  ],
};

/**
 * Generate monitoring setup
 */
export function generateMonitoringSetup(): string {
  return `/**
 * Database Monitoring Setup
 * Complete monitoring configuration
 */

import { Pool } from 'pg';
import promClient from 'prom-client';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

// Prometheus metrics
const register = new promClient.Registry();

const queryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

// Health check
export async function healthCheck(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// Monitor query execution
pool.on('connect', () => {
  console.log('New database connection');
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Periodic health checks
setInterval(async () => {
  const healthy = await healthCheck();
  if (!healthy) {
    // Send alert
    console.error('Database health check failed!');
  }
}, 30000); // Every 30 seconds

export { pool, register };
`;
}
