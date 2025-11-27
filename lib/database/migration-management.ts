/**
 * Migration Management - Database migration patterns and strategies
 */

export interface MigrationSpec {
  version: string;
  description: string;
  up: string;
  down: string;
  checksum?: string;
}

export interface MigrationConfig {
  directory: string;
  tableName: string;
  lockTableName: string;
  schema?: string;
}

/**
 * Migration patterns
 */
export const migrationPatterns = {
  /**
   * Basic table creation
   */
  createTable: `-- Migration: Create users table
-- Up
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Down
DROP TABLE IF EXISTS users CASCADE;`,

  /**
   * Add column
   */
  addColumn: `-- Migration: Add avatar_url to users
-- Up
ALTER TABLE users
  ADD COLUMN avatar_url VARCHAR(500);

-- Down
ALTER TABLE users
  DROP COLUMN avatar_url;`,

  /**
   * Rename column
   */
  renameColumn: `-- Migration: Rename name to full_name
-- Up
ALTER TABLE users
  RENAME COLUMN name TO full_name;

-- Down
ALTER TABLE users
  RENAME COLUMN full_name TO name;`,

  /**
   * Change column type
   */
  changeColumnType: `-- Migration: Change user age from INTEGER to SMALLINT
-- Up
ALTER TABLE users
  ALTER COLUMN age TYPE SMALLINT;

-- Down
ALTER TABLE users
  ALTER COLUMN age TYPE INTEGER;`,

  /**
   * Add index
   */
  addIndex: `-- Migration: Add index on created_at
-- Up
CREATE INDEX idx_users_created_at ON users(created_at);

-- Down
DROP INDEX IF EXISTS idx_users_created_at;`,

  /**
   * Add foreign key
   */
  addForeignKey: `-- Migration: Add foreign key from posts to users
-- Up
ALTER TABLE posts
  ADD CONSTRAINT fk_posts_user_id
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Down
ALTER TABLE posts
  DROP CONSTRAINT IF EXISTS fk_posts_user_id;`,

  /**
   * Add check constraint
   */
  addCheckConstraint: `-- Migration: Add check constraint for age
-- Up
ALTER TABLE users
  ADD CONSTRAINT check_age_positive
  CHECK (age >= 0 AND age <= 150);

-- Down
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS check_age_positive;`,
};

/**
 * Zero-downtime migration strategies
 */
export const zeroDowntimeMigrations = {
  /**
   * Adding a new column with default value
   * Problem: Adding column with DEFAULT locks table in older PostgreSQL
   * Solution: Add column without default, then set default
   */
  addColumnWithDefault: `-- Bad: Locks table in PostgreSQL < 11
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL;

-- Good: Zero-downtime approach
-- Step 1: Add nullable column without default
ALTER TABLE users ADD COLUMN status VARCHAR(20);

-- Step 2: Backfill existing rows (in batches)
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Step 3: Set NOT NULL constraint
ALTER TABLE users ALTER COLUMN status SET NOT NULL;

-- Step 4: Set default for new rows
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active';`,

  /**
   * Renaming a column
   * Problem: Breaking change for running application
   * Solution: Multi-step migration with backward compatibility
   */
  renameColumn: `-- Step 1: Add new column
ALTER TABLE users ADD COLUMN full_name VARCHAR(100);

-- Step 2: Copy data from old to new column
UPDATE users SET full_name = name;

-- Step 3: Create trigger to keep both in sync (deploy app v1.5)
CREATE OR REPLACE FUNCTION sync_user_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL AND NEW.name != OLD.name THEN
    NEW.full_name = NEW.name;
  END IF;
  IF NEW.full_name IS NOT NULL AND NEW.full_name != OLD.full_name THEN
    NEW.name = NEW.full_name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_user_name_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_name();

-- Step 4: Deploy new code using full_name (v2.0)
-- Wait for all old instances to shut down

-- Step 5: Drop old column and trigger
DROP TRIGGER IF EXISTS sync_user_name_trigger ON users;
DROP FUNCTION IF EXISTS sync_user_name();
ALTER TABLE users DROP COLUMN name;`,

  /**
   * Changing column type
   * Problem: Type conversion can lock table
   * Solution: Create new column, migrate data, swap columns
   */
  changeColumnType: `-- Step 1: Add new column with new type
ALTER TABLE users ADD COLUMN user_id_new BIGINT;

-- Step 2: Backfill data (in batches to avoid lock)
DO $$
DECLARE
  batch_size INTEGER := 10000;
  offset_val INTEGER := 0;
  rows_updated INTEGER;
BEGIN
  LOOP
    UPDATE users
    SET user_id_new = user_id::BIGINT
    WHERE id IN (
      SELECT id FROM users
      WHERE user_id_new IS NULL
      LIMIT batch_size
    );

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;

    PERFORM pg_sleep(0.1); -- Pause between batches
  END LOOP;
END $$;

-- Step 3: Create index on new column
CREATE INDEX CONCURRENTLY idx_users_user_id_new ON users(user_id_new);

-- Step 4: Make new column NOT NULL
ALTER TABLE users ALTER COLUMN user_id_new SET NOT NULL;

-- Step 5: Drop old column and rename new one (fast)
BEGIN;
  ALTER TABLE users DROP COLUMN user_id;
  ALTER TABLE users RENAME COLUMN user_id_new TO user_id;
COMMIT;`,

  /**
   * Adding NOT NULL constraint
   * Problem: Full table scan + lock
   * Solution: Add constraint in steps
   */
  addNotNullConstraint: `-- Step 1: Backfill NULL values
UPDATE users SET email = 'unknown@example.com' WHERE email IS NULL;

-- Step 2: Add CHECK constraint (not validated)
ALTER TABLE users ADD CONSTRAINT check_email_not_null CHECK (email IS NOT NULL) NOT VALID;

-- Step 3: Validate constraint (can be done during low traffic)
ALTER TABLE users VALIDATE CONSTRAINT check_email_not_null;

-- Step 4: Add NOT NULL constraint (fast since data is validated)
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Step 5: Drop CHECK constraint
ALTER TABLE users DROP CONSTRAINT check_email_not_null;`,

  /**
   * Dropping a column
   * Problem: Breaks running code that still references it
   * Solution: Multi-step removal
   */
  dropColumn: `-- Step 1: Deploy code that doesn't use the column (v1.5)
-- Step 2: Wait for all old instances to shut down

-- Step 3: Drop the column
ALTER TABLE users DROP COLUMN deprecated_field;

-- Note: In PostgreSQL, DROP COLUMN is fast (just marks column as dropped)
-- Actual space reclamation requires VACUUM FULL (locks table)`,
};

/**
 * Data migration patterns
 */
export const dataMigrationPatterns = {
  /**
   * Batch processing for large tables
   */
  batchProcessing: `-- Migrate large amount of data in batches
DO $$
DECLARE
  batch_size INTEGER := 1000;
  processed INTEGER := 0;
  total_rows INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_rows FROM users WHERE status IS NULL;

  LOOP
    UPDATE users
    SET status = 'active'
    WHERE id IN (
      SELECT id FROM users
      WHERE status IS NULL
      LIMIT batch_size
    );

    GET DIAGNOSTICS processed = ROW_COUNT;
    EXIT WHEN processed = 0;

    RAISE NOTICE 'Processed % rows, % remaining', processed, total_rows;

    -- Small pause to avoid locking
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;`,

  /**
   * Background migration with queue
   */
  backgroundMigration: `-- Create migration tracking table
CREATE TABLE data_migrations (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(100),
  record_id INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Queue records for migration
INSERT INTO data_migrations (table_name, record_id)
SELECT 'users', id FROM users WHERE needs_migration = true;

-- Process migrations in background worker
-- (Run this in a separate worker process)
WITH next_migration AS (
  SELECT id, table_name, record_id
  FROM data_migrations
  WHERE status = 'pending'
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
UPDATE data_migrations dm
SET status = 'completed', completed_at = NOW()
FROM next_migration nm
WHERE dm.id = nm.id
  AND perform_migration(nm.table_name, nm.record_id);`,

  /**
   * Transactional data migration
   */
  transactionalMigration: `-- Migrate data with transaction safety
BEGIN;

-- Create temporary table
CREATE TEMP TABLE user_migration AS
SELECT id, legacy_field, transform_legacy_field(legacy_field) as new_field
FROM users;

-- Update users with transformed data
UPDATE users u
SET new_field = um.new_field
FROM user_migration um
WHERE u.id = um.id;

-- Verify migration
DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM users
  WHERE new_field IS NULL AND legacy_field IS NOT NULL;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % records with NULL new_field', mismatch_count;
  END IF;
END $$;

COMMIT;`,

  /**
   * Rollback-safe migration
   */
  rollbackSafeMigration: `-- Create backup table before migration
CREATE TABLE users_backup AS SELECT * FROM users;

-- Perform migration
UPDATE users SET status = calculate_status();

-- Verify results
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM users
  WHERE status NOT IN ('active', 'inactive', 'pending');

  IF invalid_count > 0 THEN
    -- Rollback: restore from backup
    TRUNCATE users;
    INSERT INTO users SELECT * FROM users_backup;
    RAISE EXCEPTION 'Migration failed, rolled back';
  END IF;
END $$;

-- Drop backup if successful
DROP TABLE users_backup;`,
};

/**
 * Migration testing patterns
 */
export const migrationTestingPatterns = {
  /**
   * Test migration on copy of production data
   */
  testOnProductionCopy: `-- Step 1: Create database copy
CREATE DATABASE test_migration WITH TEMPLATE production_db;

-- Step 2: Connect to test database
\\c test_migration

-- Step 3: Run migration
\\i migrations/001_add_user_status.sql

-- Step 4: Verify data integrity
SELECT
  COUNT(*) as total_users,
  COUNT(status) as users_with_status,
  COUNT(*) - COUNT(status) as users_without_status
FROM users;

-- Step 5: Test rollback
\\i migrations/001_add_user_status_down.sql

-- Step 6: Verify rollback
SELECT COUNT(*) FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'status';`,

  /**
   * Test migration performance
   */
  testPerformance: `-- Measure migration time
\\timing on

BEGIN;

-- Run migration
\\i migrations/001_add_index.sql

-- Measure query performance before/after
EXPLAIN ANALYZE
SELECT * FROM users WHERE created_at > NOW() - INTERVAL '7 days';

ROLLBACK;`,

  /**
   * Verify data consistency
   */
  verifyConsistency: `-- Create verification query
WITH integrity_check AS (
  SELECT
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM users WHERE email IS NOT NULL) as users_with_email,
    (SELECT COUNT(DISTINCT email) FROM users) as unique_emails,
    (SELECT COUNT(*) FROM posts) as total_posts,
    (SELECT COUNT(*) FROM posts WHERE user_id IS NOT NULL) as posts_with_user,
    (SELECT COUNT(*) FROM posts WHERE user_id NOT IN (SELECT id FROM users)) as orphaned_posts
)
SELECT
  total_users,
  users_with_email,
  unique_emails,
  total_posts,
  posts_with_user,
  orphaned_posts,
  CASE
    WHEN orphaned_posts > 0 THEN 'FAILED: Orphaned posts exist'
    WHEN users_with_email < total_users THEN 'WARNING: Some users without email'
    ELSE 'PASSED'
  END as status
FROM integrity_check;`,
};

/**
 * Generate migration file
 */
export function generateMigration(spec: MigrationSpec): string {
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
  const filename = `${timestamp}_${spec.version}_${spec.description.replace(/\s+/g, "_").toLowerCase()}`;

  return `-- Migration: ${spec.description}
-- Version: ${spec.version}
-- Created: ${new Date().toISOString()}

-- Up Migration
${spec.up}

-- Down Migration (Rollback)
${spec.down}
`;
}

/**
 * Prisma migration patterns
 */
export const prismaMigrationPatterns = {
  /**
   * Create migration
   */
  createMigration: `# Create migration from schema changes
npx prisma migrate dev --name add_user_status

# This will:
# 1. Generate SQL migration file
# 2. Apply migration to database
# 3. Regenerate Prisma Client`,

  /**
   * Deploy migration to production
   */
  deployMigration: `# Deploy pending migrations (no prompts)
npx prisma migrate deploy

# Good for CI/CD pipelines
# Only applies migrations, doesn't modify schema`,

  /**
   * Resolve migration issues
   */
  resolveMigration: `# Reset database (development only!)
npx prisma migrate reset

# Mark migration as applied without running it
npx prisma migrate resolve --applied "20230101120000_migration_name"

# Mark migration as rolled back
npx prisma migrate resolve --rolled-back "20230101120000_migration_name"`,

  /**
   * Custom SQL in Prisma migration
   */
  customSQL: `-- migrations/20230101120000_custom/migration.sql

-- Add custom SQL that Prisma can't generate
CREATE INDEX CONCURRENTLY idx_users_email_lower ON users(LOWER(email));

-- Create custom function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();`,
};

/**
 * Migration best practices
 */
export const migrationBestPractices = {
  general: [
    "Never modify existing migration files",
    "Always provide rollback (down) migrations",
    "Test migrations on copy of production data",
    "Make migrations reversible when possible",
    "Keep migrations small and focused",
    "Add migrations to version control",
  ],

  production: [
    "Run migrations during low-traffic periods",
    "Use zero-downtime strategies for large tables",
    "Take database backup before major migrations",
    "Monitor database performance during migration",
    "Have rollback plan ready",
    "Test migration on staging first",
  ],

  performance: [
    "Use CREATE INDEX CONCURRENTLY (PostgreSQL)",
    "Process large data changes in batches",
    "Add NOT NULL constraint in steps (CHECK → VALIDATE → NOT NULL)",
    "Use ALGORITHM=INPLACE for MySQL ALTER TABLE",
    "Avoid full table locks during business hours",
  ],

  safety: [
    "Always use transactions for data migrations",
    "Verify data integrity after migration",
    "Keep audit trail of what changed",
    "Test rollback before deploying",
    "Have monitoring and alerting in place",
  ],

  naming: [
    "Use timestamp prefix: 20230101120000_description.sql",
    "Use descriptive names: add_user_email_index",
    "Use snake_case for consistency",
    "Include action: create_users_table, add_status_column",
  ],
};

/**
 * Migration rollback strategies
 */
export const rollbackStrategies = {
  /**
   * Immediate rollback
   */
  immediate: `-- If migration fails, rollback immediately
BEGIN;

-- Run migration
\\i migrations/001_up.sql

-- If error occurs, rollback
ROLLBACK;

-- Otherwise commit
COMMIT;`,

  /**
   * Delayed rollback (with verification)
   */
  delayed: `-- Apply migration
BEGIN;
\\i migrations/001_up.sql

-- Wait for application to verify
-- (Give app 5-10 minutes to detect issues)

-- If issues found, rollback
\\i migrations/001_down.sql
ROLLBACK;

-- Otherwise commit
COMMIT;`,

  /**
   * Versioned rollback
   */
  versioned: `-- Track migration version
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apply migration
BEGIN;

INSERT INTO schema_migrations (version) VALUES ('20230101120000');
\\i migrations/20230101120000_up.sql

COMMIT;

-- Rollback to specific version
BEGIN;

\\i migrations/20230101120000_down.sql
DELETE FROM schema_migrations WHERE version = '20230101120000';

COMMIT;`,

  /**
   * Point-in-time recovery
   */
  pointInTimeRecovery: `-- For PostgreSQL with WAL archiving
-- Restore database to point before migration

# Stop PostgreSQL
sudo systemctl stop postgresql

# Restore base backup
pg_basebackup -D /var/lib/postgresql/data -Ft -z -P

# Configure recovery
cat > /var/lib/postgresql/data/recovery.conf <<EOF
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2023-01-01 11:55:00'
EOF

# Start PostgreSQL (will recover to specified time)
sudo systemctl start postgresql`,
};

/**
 * Generate rollback script
 */
export function generateRollbackScript(migrations: MigrationSpec[]): string {
  let script = `#!/bin/bash
# Rollback Script
# Generated: ${new Date().toISOString()}

set -e

echo "Starting rollback..."

`;

  // Rollback migrations in reverse order
  migrations.reverse().forEach((migration, index) => {
    script += `
echo "Rolling back migration ${index + 1}/${migrations.length}: ${migration.description}"
psql $DATABASE_URL <<EOF
BEGIN;
${migration.down}
DELETE FROM schema_migrations WHERE version = '${migration.version}';
COMMIT;
EOF
`;
  });

  script += `
echo "Rollback complete!"
`;

  return script;
}
