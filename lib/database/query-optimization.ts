/**
 * Query Optimization - Database performance optimization patterns
 */

export interface QueryAnalysis {
  query: string;
  executionTime: number;
  rowsScanned: number;
  rowsReturned: number;
  indexesUsed: string[];
  recommendations: string[];
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  type: "btree" | "hash" | "gin" | "gist";
  reason: string;
  estimatedImprovement: string;
}

/**
 * Indexing strategies
 */
export const indexingStrategies = {
  /**
   * B-Tree Index (Default, most common)
   * Use for: Equality and range queries
   */
  btree: `-- B-Tree Index (Default)
-- Best for: =, <, >, <=, >=, BETWEEN, IN, ORDER BY

-- Single column index
CREATE INDEX idx_users_email ON users(email);

-- Composite index (column order matters!)
CREATE INDEX idx_posts_user_date ON posts(user_id, created_at DESC);

-- Partial index (smaller, faster)
CREATE INDEX idx_active_users ON users(email) WHERE is_active = true;

-- Expression index
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- Query examples that use B-Tree
SELECT * FROM users WHERE email = 'user@example.com'; -- Uses idx_users_email
SELECT * FROM posts WHERE user_id = 1 ORDER BY created_at DESC; -- Uses idx_posts_user_date
SELECT * FROM users WHERE is_active = true AND email = 'user@example.com'; -- Uses idx_active_users`,

  /**
   * Hash Index
   * Use for: Exact equality matches only (PostgreSQL)
   */
  hash: `-- Hash Index (PostgreSQL only)
-- Best for: = (equality) queries only
-- NOT good for: <, >, BETWEEN, ORDER BY

CREATE INDEX idx_users_id_hash ON users USING hash(id);

-- Query example
SELECT * FROM users WHERE id = 123; -- Can use hash index
SELECT * FROM users WHERE id > 100; -- Cannot use hash index (use B-Tree)`,

  /**
   * GIN Index (Generalized Inverted Index)
   * Use for: Full-text search, arrays, JSONB
   */
  gin: `-- GIN Index (PostgreSQL)
-- Best for: Full-text search, array operations, JSONB queries

-- Full-text search
CREATE INDEX idx_posts_content_fts ON posts USING gin(to_tsvector('english', content));

-- Array operations
CREATE INDEX idx_posts_tags ON posts USING gin(tags);

-- JSONB
CREATE INDEX idx_users_settings ON users USING gin(settings);

-- Query examples
-- Full-text search
SELECT * FROM posts
WHERE to_tsvector('english', content) @@ to_tsquery('database & optimization');

-- Array contains
SELECT * FROM posts WHERE tags @> ARRAY['postgresql', 'performance'];

-- JSONB path
SELECT * FROM users WHERE settings @> '{"theme": "dark"}';`,

  /**
   * GiST Index (Generalized Search Tree)
   * Use for: Geometric data, full-text search, ranges
   */
  gist: `-- GiST Index (PostgreSQL)
-- Best for: Geometric operations, range types, full-text

-- Geometric data
CREATE INDEX idx_locations_point ON locations USING gist(coordinates);

-- Range types
CREATE INDEX idx_events_date_range ON events USING gist(date_range);

-- Full-text (alternative to GIN)
CREATE INDEX idx_posts_content_gist ON posts USING gist(to_tsvector('english', content));

-- Query examples
-- Find nearby points
SELECT * FROM locations
WHERE coordinates <-> point(10, 20) < 5;

-- Overlapping ranges
SELECT * FROM events
WHERE date_range && daterange('2023-01-01', '2023-12-31');`,

  /**
   * BRIN Index (Block Range Index)
   * Use for: Very large tables with natural ordering (time-series)
   */
  brin: `-- BRIN Index (PostgreSQL)
-- Best for: Very large tables (TB+), naturally ordered data
-- Much smaller than B-Tree, but less precise

-- Time-series data
CREATE INDEX idx_logs_created_brin ON logs USING brin(created_at);

-- Naturally ordered IDs
CREATE INDEX idx_events_id_brin ON events USING brin(id);

-- Query example
SELECT * FROM logs
WHERE created_at >= '2023-01-01' AND created_at < '2023-02-01';

-- Benefits:
-- - 1000x smaller than B-Tree for large tables
-- - Much faster to create and update
-- - Good for append-only tables`,

  /**
   * Composite index column order
   */
  compositeOrder: `-- Composite Index Column Order Matters!

-- Rule: Most selective columns first, then by query patterns

-- Good: user_id is selective, created_at for ordering
CREATE INDEX idx_posts_user_date ON posts(user_id, created_at DESC);

-- Queries that can use this index:
SELECT * FROM posts WHERE user_id = 1; -- Uses index
SELECT * FROM posts WHERE user_id = 1 ORDER BY created_at DESC; -- Uses index fully
SELECT * FROM posts WHERE user_id = 1 AND created_at > '2023-01-01'; -- Uses index

-- Queries that CANNOT use this index:
SELECT * FROM posts WHERE created_at > '2023-01-01'; -- Cannot use (wrong order)
SELECT * FROM posts ORDER BY created_at DESC; -- Cannot use (no user_id filter)

-- Solution: Create separate index if needed
CREATE INDEX idx_posts_date ON posts(created_at DESC);`,

  /**
   * Covering indexes (Index-only scans)
   */
  coveringIndex: `-- Covering Index (includes all needed columns)
-- Benefit: Query can be satisfied entirely from index (no table access)

-- Create covering index with INCLUDE (PostgreSQL 11+)
CREATE INDEX idx_users_email_covering ON users(email)
  INCLUDE (name, created_at);

-- Query that uses covering index (index-only scan)
SELECT email, name, created_at FROM users WHERE email = 'user@example.com';
-- No need to access main table, all data is in index

-- Without INCLUDE (older PostgreSQL, MySQL)
CREATE INDEX idx_users_email_name ON users(email, name, created_at);
-- Works, but name and created_at affect index ordering`,
};

/**
 * N+1 Query prevention
 */
export const nPlusOnePreventio = {
  /**
   * Problem: N+1 queries
   */
  problem: `-- Bad: N+1 Query Problem
-- Gets all users (1 query)
SELECT * FROM users;

-- Then for each user, gets their posts (N queries)
-- This happens in application code:
for (const user of users) {
  const posts = await db.query('SELECT * FROM posts WHERE user_id = ?', [user.id]);
}

-- Result: 1 + N queries (if 100 users, then 101 queries!)`,

  /**
   * Solution 1: JOIN
   */
  solutionJoin: `-- Good: Use JOIN (1 query)
SELECT
  u.id,
  u.name,
  u.email,
  json_agg(
    json_build_object(
      'id', p.id,
      'title', p.title,
      'created_at', p.created_at
    )
  ) as posts
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
GROUP BY u.id, u.name, u.email;

-- Result: Only 1 query, returns all users with their posts`,

  /**
   * Solution 2: IN clause
   */
  solutionIn: `-- Good: Use IN clause (2 queries)
-- Step 1: Get all users
SELECT * FROM users;

-- Step 2: Get all posts for these users in ONE query
SELECT * FROM posts WHERE user_id IN (1, 2, 3, 4, 5);

-- Then group posts by user_id in application code
-- Result: Only 2 queries instead of 1 + N`,

  /**
   * Solution 3: Subquery
   */
  solutionSubquery: `-- Good: Use subquery
SELECT
  u.*,
  (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count,
  (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as comments_count
FROM users u;

-- Result: 1 query with correlated subqueries (still more efficient than N+1)`,

  /**
   * Prisma example
   */
  prismaExample: `// Bad: N+1 in Prisma
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { userId: user.id } });
}

// Good: Use include (automatic JOIN)
const users = await prisma.user.findMany({
  include: {
    posts: true,
  },
});`,
};

/**
 * Query optimization patterns
 */
export const queryOptimizationPatterns = {
  /**
   * Use EXPLAIN to analyze queries
   */
  explainAnalyze: `-- EXPLAIN shows query plan
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';

-- EXPLAIN ANALYZE actually runs query and shows real execution time
EXPLAIN ANALYZE
SELECT u.name, COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
GROUP BY u.id, u.name
HAVING COUNT(p.id) > 5;

-- Read output:
-- - Seq Scan = Full table scan (slow)
-- - Index Scan = Using index (fast)
-- - cost=0.00..8.27 = Estimated cost
-- - rows=1 = Estimated rows
-- - actual time=0.123..0.456 = Real execution time`,

  /**
   * Avoid SELECT *
   */
  avoidSelectStar: `-- Bad: SELECT * fetches all columns (wasteful)
SELECT * FROM users;

-- Good: Only select needed columns
SELECT id, email, name FROM users;

-- Benefits:
-- - Less data transferred over network
-- - Less memory used
-- - Can use covering indexes
-- - Clearer what data is actually used`,

  /**
   * Use LIMIT for pagination
   */
  useLimitOffset: `-- Basic pagination
SELECT * FROM posts
ORDER BY created_at DESC
LIMIT 10 OFFSET 20; -- Page 3 (skip 20, take 10)

-- Better: Cursor-based pagination (for large offsets)
-- Instead of OFFSET, use WHERE with last seen ID
SELECT * FROM posts
WHERE id < 12345 -- Last ID from previous page
ORDER BY id DESC
LIMIT 10;

-- Why: OFFSET still scans skipped rows, cursor doesn't`,

  /**
   * Use EXISTS instead of COUNT
   */
  useExists: `-- Bad: Using COUNT when you just need to check existence
SELECT COUNT(*) FROM posts WHERE user_id = 1; -- Counts all rows

-- Good: Use EXISTS (stops at first match)
SELECT EXISTS(SELECT 1 FROM posts WHERE user_id = 1); -- Returns true/false

-- Or with WHERE
SELECT * FROM users u
WHERE EXISTS(SELECT 1 FROM posts WHERE user_id = u.id);`,

  /**
   * Avoid functions on indexed columns
   */
  avoidFunctionsOnColumns: `-- Bad: Function on indexed column prevents index use
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
-- Cannot use index on email column

-- Good Option 1: Use expression index
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
-- Now uses index

-- Good Option 2: Store lowercase in application
SELECT * FROM users WHERE email = 'user@example.com'; -- Already lowercase`,

  /**
   * Use UNION ALL instead of UNION
   */
  useUnionAll: `-- Bad: UNION removes duplicates (expensive)
SELECT id, name FROM users
UNION
SELECT id, name FROM deleted_users;
-- Performs duplicate elimination

-- Good: UNION ALL keeps duplicates (fast)
SELECT id, name FROM users
UNION ALL
SELECT id, name FROM deleted_users;
-- No duplicate check

-- Use UNION ALL unless you specifically need deduplication`,

  /**
   * Batch inserts
   */
  batchInserts: `-- Bad: Multiple single inserts
INSERT INTO users (name, email) VALUES ('User 1', 'user1@example.com');
INSERT INTO users (name, email) VALUES ('User 2', 'user2@example.com');
INSERT INTO users (name, email) VALUES ('User 3', 'user3@example.com');
-- 3 round trips to database

-- Good: Single batch insert
INSERT INTO users (name, email) VALUES
  ('User 1', 'user1@example.com'),
  ('User 2', 'user2@example.com'),
  ('User 3', 'user3@example.com');
-- 1 round trip to database`,

  /**
   * Use appropriate JOIN types
   */
  joinTypes: `-- INNER JOIN: Only matching rows
SELECT * FROM users u
INNER JOIN posts p ON u.id = p.user_id;
-- Only users who have posts

-- LEFT JOIN: All left rows + matching right rows
SELECT * FROM users u
LEFT JOIN posts p ON u.id = p.user_id;
-- All users, with posts if they exist

-- Avoid: CROSS JOIN (Cartesian product)
SELECT * FROM users, posts; -- Dangerous! Creates users × posts rows`,
};

/**
 * Slow query identification
 */
export const slowQueryIdentification = {
  /**
   * Enable slow query log (PostgreSQL)
   */
  postgresql: `-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1 second
SELECT pg_reload_conf();

-- View slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- Reset statistics
SELECT pg_stat_statements_reset();`,

  /**
   * Enable slow query log (MySQL)
   */
  mysql: `-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1; -- Log queries > 1 second
SET GLOBAL log_queries_not_using_indexes = 'ON';

-- View slow query log
-- tail -f /var/log/mysql/mysql-slow.log

-- Analyze slow queries with pt-query-digest
pt-query-digest /var/log/mysql/mysql-slow.log`,

  /**
   * Monitoring with Prisma
   */
  prismaMonitoring: `// Enable query logging in Prisma
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
    { emit: 'stdout', level: 'error' },
  ],
});

// Log slow queries
prisma.$on('query', (e: any) => {
  if (e.duration > 1000) { // > 1 second
    console.warn('Slow query detected:');
    console.warn('Query:', e.query);
    console.warn('Duration:', e.duration + 'ms');
    console.warn('Params:', e.params);
  }
});`,
};

/**
 * Connection pooling
 */
export const connectionPooling = {
  /**
   * PostgreSQL connection pool (pg)
   */
  postgresqlPool: `import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum connections
  min: 5, // Minimum connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout if no connection available
});

// Use pool for queries
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// Monitor pool
pool.on('connect', () => {
  console.log('New client connected to pool');
});

pool.on('error', (err) => {
  console.error('Pool error:', err);
});`,

  /**
   * Prisma connection pool
   */
  prismaPool: `// Prisma Client handles connection pooling automatically
// Configure in DATABASE_URL
// postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10

// Or configure programmatically
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Prisma also uses pgBouncer in production for better pooling
// DATABASE_URL="postgresql://user:pass@pgbouncer:6432/db?pgbouncer=true"`,

  /**
   * PgBouncer (Connection pooler)
   */
  pgBouncer: `# pgbouncer.ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
listen_addr = *
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction # or session/statement
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3

# Benefits:
# - Reduces connection overhead
# - Allows more clients than database connections
# - Connection reuse improves performance`,
};

/**
 * Query caching strategies
 */
export const queryCachingStrategies = {
  /**
   * Application-level caching
   */
  applicationCache: `import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
});

async function getUser(id: number) {
  const cacheKey = \`user:\${id}\`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Cache miss, query database
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);

  // Store in cache (TTL: 5 minutes)
  await redis.setex(cacheKey, 300, JSON.stringify(user));

  return user;
}`,

  /**
   * Query result caching (PostgreSQL)
   */
  postgresqlCaching: `-- Create materialized view for expensive queries
CREATE MATERIALIZED VIEW user_statistics AS
SELECT
  u.id,
  u.name,
  COUNT(DISTINCT p.id) as total_posts,
  COUNT(DISTINCT c.id) as total_comments,
  MAX(p.created_at) as last_post_at
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
LEFT JOIN comments c ON u.id = c.user_id
GROUP BY u.id, u.name;

-- Create index on materialized view
CREATE INDEX idx_user_statistics_id ON user_statistics(id);

-- Refresh materialized view (e.g., nightly cron job)
REFRESH MATERIALIZED VIEW CONCURRENTLY user_statistics;

-- Query is now instant
SELECT * FROM user_statistics WHERE id = 1;`,

  /**
   * Prepared statements
   */
  preparedStatements: `-- Prepared statements are cached by database
-- Benefits: Parse once, execute many times

-- Prepare statement
PREPARE get_user_posts AS
SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2;

-- Execute multiple times (reuses query plan)
EXECUTE get_user_posts(1, 10);
EXECUTE get_user_posts(2, 10);
EXECUTE get_user_posts(3, 10);

-- Deallocate when done
DEALLOCATE get_user_posts;`,
};

/**
 * Performance best practices
 */
export const performanceBestPractices = {
  indexing: [
    "Index foreign keys",
    "Index columns used in WHERE, JOIN, ORDER BY",
    "Use composite indexes for multi-column queries",
    "Use partial indexes for filtered queries",
    "Use expression indexes for function calls",
    "Don't over-index (each index has write overhead)",
    "Monitor index usage and remove unused indexes",
  ],

  queries: [
    "Avoid SELECT *, only select needed columns",
    "Use EXPLAIN ANALYZE to understand query plans",
    "Prevent N+1 queries with JOINs or IN clauses",
    "Use EXISTS instead of COUNT for existence checks",
    "Use LIMIT for pagination",
    "Batch INSERT/UPDATE operations",
    "Use prepared statements for repeated queries",
  ],

  schema: [
    "Normalize to 3NF, denormalize for performance if needed",
    "Use appropriate data types (don't use VARCHAR(255) for everything)",
    "Add constraints (NOT NULL, FOREIGN KEY, CHECK)",
    "Use JSONB for flexible schemas (PostgreSQL)",
    "Partition very large tables (time-series)",
    "Archive old data to separate tables",
  ],

  connections: [
    "Use connection pooling",
    "Set appropriate pool size (10-20 for most apps)",
    "Close connections properly",
    "Use read replicas for read-heavy workloads",
    "Consider PgBouncer for connection pooling",
  ],

  monitoring: [
    "Enable slow query log",
    "Monitor query execution times",
    "Track connection pool usage",
    "Set up alerting for slow queries",
    "Regularly analyze and vacuum tables (PostgreSQL)",
    "Monitor database size and growth",
  ],
};

/**
 * Generate query optimization report
 */
export function generateOptimizationReport(analysis: QueryAnalysis[]): string {
  let report = `# Query Optimization Report\nGenerated: ${new Date().toISOString()}\n\n`;

  report += `## Summary\n`;
  report += `- Total queries analyzed: ${analysis.length}\n`;
  report += `- Slow queries (>1s): ${analysis.filter(q => q.executionTime > 1000).length}\n`;
  report += `- Total execution time: ${analysis.reduce((sum, q) => sum + q.executionTime, 0).toFixed(2)}ms\n\n`;

  report += `## Slow Queries\n\n`;
  analysis
    .filter(q => q.executionTime > 1000)
    .sort((a, b) => b.executionTime - a.executionTime)
    .forEach((query, index) => {
      report += `### ${index + 1}. Query (${query.executionTime.toFixed(2)}ms)\n\`\`\`sql\n${query.query}\n\`\`\`\n\n`;
      report += `- Rows scanned: ${query.rowsScanned}\n`;
      report += `- Rows returned: ${query.rowsReturned}\n`;
      report += `- Indexes used: ${query.indexesUsed.join(", ") || "None"}\n`;
      report += `- Recommendations:\n`;
      query.recommendations.forEach(rec => {
        report += `  - ${rec}\n`;
      });
      report += `\n`;
    });

  return report;
}
