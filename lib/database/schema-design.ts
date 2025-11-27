/**
 * Schema Design - Database schema patterns and normalization strategies
 */

export type DatabaseType = "postgresql" | "mysql" | "mongodb" | "sqlite";
export type RelationType = "one-to-one" | "one-to-many" | "many-to-many";
export type IndexType = "btree" | "hash" | "gist" | "gin" | "brin";

export interface TableSpec {
  name: string;
  description: string;
  columns: ColumnSpec[];
  indexes: IndexSpec[];
  constraints: ConstraintSpec[];
  relationships: RelationshipSpec[];
}

export interface ColumnSpec {
  name: string;
  type: string;
  nullable: boolean;
  default?: any;
  unique?: boolean;
  description: string;
  validation?: ValidationRule[];
}

export interface IndexSpec {
  name: string;
  columns: string[];
  type: IndexType;
  unique?: boolean;
  where?: string; // Partial index condition
}

export interface ConstraintSpec {
  name: string;
  type: "check" | "unique" | "foreign_key" | "primary_key";
  columns: string[];
  check?: string; // SQL expression for check constraints
  references?: {
    table: string;
    columns: string[];
    onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
    onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
  };
}

export interface RelationshipSpec {
  name: string;
  type: RelationType;
  targetTable: string;
  foreignKey: string;
  targetKey: string;
  onDelete?: "CASCADE" | "SET NULL" | "RESTRICT";
  onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT";
}

export interface ValidationRule {
  type: "regex" | "range" | "length" | "enum";
  value: any;
  message: string;
}

/**
 * Normalization guidelines
 */
export const normalizationForms = {
  /**
   * First Normal Form (1NF)
   * - Atomic values (no arrays in cells)
   * - No repeating groups
   * - Each column has unique name
   */
  "1NF": {
    description: "Eliminate repeating groups and ensure atomic values",
    rules: [
      "Each column must contain atomic (indivisible) values",
      "Each column must contain values of a single type",
      "Each column must have a unique name",
      "Order of rows/columns should not matter",
    ],
    example: `-- Bad (Not 1NF): Multiple phones in one column
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  phones VARCHAR(500) -- '555-1234, 555-5678, 555-9012'
);

-- Good (1NF): Separate table for phones
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100)
);

CREATE TABLE user_phones (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  phone VARCHAR(20)
);`,
  },

  /**
   * Second Normal Form (2NF)
   * - Must be in 1NF
   * - No partial dependencies (all non-key columns depend on entire primary key)
   */
  "2NF": {
    description: "Eliminate partial dependencies on composite keys",
    rules: [
      "Must satisfy 1NF",
      "All non-key attributes must depend on entire primary key",
      "Split tables if partial dependencies exist",
    ],
    example: `-- Bad (Not 2NF): Order items with product info
CREATE TABLE order_items (
  order_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  product_name VARCHAR(100),    -- Depends only on product_id
  product_price DECIMAL(10, 2), -- Depends only on product_id
  PRIMARY KEY (order_id, product_id)
);

-- Good (2NF): Separate product info
CREATE TABLE order_items (
  order_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  PRIMARY KEY (order_id, product_id)
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  price DECIMAL(10, 2)
);`,
  },

  /**
   * Third Normal Form (3NF)
   * - Must be in 2NF
   * - No transitive dependencies (non-key columns don't depend on other non-key columns)
   */
  "3NF": {
    description: "Eliminate transitive dependencies",
    rules: [
      "Must satisfy 2NF",
      "No non-key column depends on another non-key column",
      "All columns depend directly on primary key",
    ],
    example: `-- Bad (Not 3NF): Employee with department info
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  department_id INTEGER,
  department_name VARCHAR(100),    -- Depends on department_id
  department_location VARCHAR(100) -- Depends on department_id
);

-- Good (3NF): Separate department table
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  department_id INTEGER REFERENCES departments(id)
);

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  location VARCHAR(100)
);`,
  },

  /**
   * Boyce-Codd Normal Form (BCNF)
   * - Stricter version of 3NF
   * - Every determinant must be a candidate key
   */
  BCNF: {
    description: "Every determinant is a candidate key",
    rules: [
      "Must satisfy 3NF",
      "For every functional dependency X → Y, X must be a superkey",
      "Eliminates anomalies not covered by 3NF",
    ],
    example: `-- Bad (Not BCNF): Course taught by professor
-- Problem: professor determines department, but professor is not a key
CREATE TABLE course_enrollment (
  student_id INTEGER,
  course_code VARCHAR(10),
  professor VARCHAR(100),
  department VARCHAR(100), -- Determined by professor
  PRIMARY KEY (student_id, course_code)
);

-- Good (BCNF): Separate professor-department relationship
CREATE TABLE course_enrollment (
  student_id INTEGER,
  course_code VARCHAR(10),
  professor_id INTEGER,
  PRIMARY KEY (student_id, course_code)
);

CREATE TABLE professors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  department_id INTEGER REFERENCES departments(id)
);`,
  },
};

/**
 * Denormalization strategies
 */
export const denormalizationStrategies = {
  /**
   * When to denormalize
   */
  whenToDenormalize: [
    "Heavy read operations with complex joins",
    "Data doesn't change frequently",
    "Performance is critical (real-time dashboards)",
    "Reporting/analytics queries",
    "Avoid N+1 queries in specific use cases",
  ],

  /**
   * Computed columns
   */
  computedColumns: `-- Add computed columns for frequent calculations
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  -- Denormalized: total price (sum of items)
  total_price DECIMAL(10, 2) GENERATED ALWAYS AS (
    (SELECT SUM(quantity * price) FROM order_items WHERE order_id = orders.id)
  ) STORED
);`,

  /**
   * Duplicate data for performance
   */
  duplicateData: `-- Store user name in posts to avoid joins
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  user_name VARCHAR(100), -- Denormalized from users table
  title VARCHAR(200),
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Use trigger to keep it in sync
CREATE OR REPLACE FUNCTION sync_user_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_name = (SELECT name FROM users WHERE id = NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_post_user_name
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_name();`,

  /**
   * Materialized views
   */
  materializedViews: `-- Create materialized view for complex aggregations
CREATE MATERIALIZED VIEW user_statistics AS
SELECT
  u.id,
  u.name,
  COUNT(DISTINCT p.id) as total_posts,
  COUNT(DISTINCT c.id) as total_comments,
  AVG(p.views) as avg_post_views
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
LEFT JOIN comments c ON u.id = c.user_id
GROUP BY u.id, u.name;

-- Create index on materialized view
CREATE INDEX idx_user_stats_id ON user_statistics(id);

-- Refresh periodically (e.g., nightly)
REFRESH MATERIALIZED VIEW CONCURRENTLY user_statistics;`,

  /**
   * Counter caches
   */
  counterCaches: `-- Add counter columns to avoid COUNT queries
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  posts_count INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0
);

-- Update counter with trigger
CREATE OR REPLACE FUNCTION increment_user_posts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_posts_count
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION increment_user_posts();`,
};

/**
 * Data type selection guide
 */
export const dataTypeGuide = {
  postgresql: {
    ids: {
      recommended: "SERIAL or BIGSERIAL",
      alternatives: ["UUID", "BIGINT"],
      example: "id SERIAL PRIMARY KEY",
      notes: "Use BIGSERIAL if expecting >2 billion rows. Use UUID for distributed systems.",
    },
    strings: {
      recommended: "VARCHAR(n) or TEXT",
      alternatives: ["CHAR(n)", "TEXT"],
      example: "email VARCHAR(255), bio TEXT",
      notes: "VARCHAR(n) for limited length, TEXT for unlimited. No performance difference in PostgreSQL.",
    },
    numbers: {
      recommended: "INTEGER, BIGINT, NUMERIC",
      alternatives: ["SMALLINT", "DECIMAL", "REAL", "DOUBLE PRECISION"],
      example: "age INTEGER, price NUMERIC(10, 2)",
      notes: "Use NUMERIC for exact decimal math (money). Use INTEGER for whole numbers.",
    },
    booleans: {
      recommended: "BOOLEAN",
      example: "is_active BOOLEAN DEFAULT true",
      notes: "Stores true/false. Use DEFAULT for common values.",
    },
    dates: {
      recommended: "TIMESTAMP or DATE",
      alternatives: ["TIMESTAMPTZ", "TIME", "INTERVAL"],
      example: "created_at TIMESTAMPTZ DEFAULT NOW()",
      notes: "Use TIMESTAMPTZ (with timezone) for user-facing dates. Use TIMESTAMP for internal dates.",
    },
    json: {
      recommended: "JSONB",
      alternatives: ["JSON"],
      example: "settings JSONB",
      notes: "Use JSONB (binary) over JSON. Supports indexing and faster queries.",
    },
    arrays: {
      recommended: "TEXT[] or INTEGER[]",
      example: "tags TEXT[], scores INTEGER[]",
      notes: "Useful for simple lists. Consider separate table for complex relationships.",
    },
    enums: {
      recommended: "CREATE TYPE ... AS ENUM",
      example: `CREATE TYPE user_role AS ENUM ('admin', 'user', 'guest');
role user_role DEFAULT 'user'`,
      notes: "Type-safe enums. Migration requires ALTER TYPE for new values.",
    },
  },

  mysql: {
    ids: {
      recommended: "INT AUTO_INCREMENT or BIGINT",
      alternatives: ["UUID (CHAR(36))"],
      example: "id INT AUTO_INCREMENT PRIMARY KEY",
      notes: "Use BIGINT for large tables. UUID requires CHAR(36) storage.",
    },
    strings: {
      recommended: "VARCHAR(n)",
      alternatives: ["TEXT", "CHAR(n)"],
      example: "email VARCHAR(255), bio TEXT",
      notes: "VARCHAR is efficient. TEXT for large content. CHAR for fixed-length (codes).",
    },
    numbers: {
      recommended: "INT, BIGINT, DECIMAL",
      alternatives: ["TINYINT", "SMALLINT", "FLOAT", "DOUBLE"],
      example: "age INT, price DECIMAL(10, 2)",
      notes: "DECIMAL for exact math. INT for whole numbers. BIGINT for large numbers.",
    },
    booleans: {
      recommended: "BOOLEAN (TINYINT(1))",
      example: "is_active BOOLEAN DEFAULT 1",
      notes: "MySQL stores BOOLEAN as TINYINT(1). 0 = false, 1 = true.",
    },
    dates: {
      recommended: "DATETIME or DATE",
      alternatives: ["TIMESTAMP", "TIME", "YEAR"],
      example: "created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
      notes: "DATETIME for full date+time. TIMESTAMP for auto-updating fields.",
    },
    json: {
      recommended: "JSON",
      example: "settings JSON",
      notes: "MySQL 5.7+ supports JSON type with validation and indexing.",
    },
    enums: {
      recommended: "ENUM",
      example: "role ENUM('admin', 'user', 'guest') DEFAULT 'user'",
      notes: "Efficient storage. Limited to 65,535 values. Consider lookup table for flexibility.",
    },
  },

  mongodb: {
    notes: "MongoDB is schemaless, but validation can be enforced",
    example: `// MongoDB Schema Validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "name", "createdAt"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        name: { bsonType: "string" },
        age: { bsonType: "int", minimum: 0, maximum: 150 },
        isActive: { bsonType: "bool" },
        createdAt: { bsonType: "date" }
      }
    }
  }
})`,
  },
};

/**
 * Relationship patterns
 */
export const relationshipPatterns = {
  /**
   * One-to-One
   */
  oneToOne: `-- One-to-One: User has one Profile
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  avatar_url VARCHAR(500)
);

-- Index for reverse lookup
CREATE INDEX idx_profiles_user_id ON profiles(user_id);`,

  /**
   * One-to-Many
   */
  oneToMany: `-- One-to-Many: User has many Posts
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100)
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200),
  content TEXT
);

-- Index for efficient lookups
CREATE INDEX idx_posts_user_id ON posts(user_id);`,

  /**
   * Many-to-Many
   */
  manyToMany: `-- Many-to-Many: Users can join many Groups, Groups have many Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100)
);

CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100)
);

-- Junction table
CREATE TABLE user_groups (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  role VARCHAR(50) DEFAULT 'member',
  PRIMARY KEY (user_id, group_id)
);

-- Indexes for both directions
CREATE INDEX idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX idx_user_groups_group_id ON user_groups(group_id);`,

  /**
   * Self-referencing (Tree structure)
   */
  selfReferencing: `-- Self-referencing: Comments with nested replies
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for finding children
CREATE INDEX idx_comments_parent_id ON comments(parent_id);

-- Query with recursive CTE to get full thread
WITH RECURSIVE comment_thread AS (
  -- Base case: root comments
  SELECT id, parent_id, content, 0 AS depth
  FROM comments
  WHERE parent_id IS NULL AND post_id = 1

  UNION ALL

  -- Recursive case: child comments
  SELECT c.id, c.parent_id, c.content, ct.depth + 1
  FROM comments c
  INNER JOIN comment_thread ct ON c.parent_id = ct.id
)
SELECT * FROM comment_thread ORDER BY depth, id;`,

  /**
   * Polymorphic associations
   */
  polymorphic: `-- Polymorphic: Comments on Posts or Photos
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200)
);

CREATE TABLE photos (
  id SERIAL PRIMARY KEY,
  url VARCHAR(500)
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  commentable_type VARCHAR(50) NOT NULL, -- 'Post' or 'Photo'
  commentable_id INTEGER NOT NULL,
  content TEXT
);

-- Composite index for polymorphic lookup
CREATE INDEX idx_comments_polymorphic ON comments(commentable_type, commentable_id);

-- Query comments for a post
SELECT * FROM comments WHERE commentable_type = 'Post' AND commentable_id = 1;`,
};

/**
 * Generate Prisma schema
 */
export function generatePrismaSchema(tables: TableSpec[]): string {
  let schema = `// Prisma Schema
// Learn more: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;

  tables.forEach(table => {
    schema += `// ${table.description}\n`;
    schema += `model ${capitalize(table.name)} {\n`;

    // Add columns
    table.columns.forEach(col => {
      const nullable = col.nullable ? "?" : "";
      const unique = col.unique ? " @unique" : "";
      const defaultValue = col.default ? ` @default(${JSON.stringify(col.default)})` : "";

      schema += `  ${col.name} ${col.type}${nullable}${unique}${defaultValue}\n`;
    });

    // Add relationships
    table.relationships.forEach(rel => {
      const optional = rel.onDelete === "SET NULL" ? "?" : "";
      schema += `  ${rel.name} ${capitalize(rel.targetTable)}${optional} @relation(fields: [${rel.foreignKey}], references: [${rel.targetKey}])\n`;
    });

    // Add indexes
    if (table.indexes.length > 0) {
      schema += `\n`;
      table.indexes.forEach(idx => {
        const unique = idx.unique ? "@@unique" : "@@index";
        schema += `  ${unique}([${idx.columns.join(", ")}])\n`;
      });
    }

    schema += `}\n\n`;
  });

  return schema;
}

/**
 * Generate SQL DDL
 */
export function generateSQL(tables: TableSpec[], dbType: DatabaseType = "postgresql"): string {
  let sql = `-- Database Schema\n-- Generated for ${dbType}\n\n`;

  tables.forEach(table => {
    sql += `-- ${table.description}\n`;
    sql += `CREATE TABLE ${table.name} (\n`;

    // Add columns
    const columnDefs = table.columns.map(col => {
      const nullable = col.nullable ? "" : " NOT NULL";
      const unique = col.unique ? " UNIQUE" : "";
      const defaultValue = col.default ? ` DEFAULT ${formatDefault(col.default, col.type)}` : "";

      return `  ${col.name} ${col.type}${nullable}${unique}${defaultValue}`;
    });

    sql += columnDefs.join(",\n");

    // Add primary key
    const pkColumns = table.columns.filter(col => col.name === "id");
    if (pkColumns.length > 0) {
      sql += `,\n  PRIMARY KEY (${pkColumns.map(c => c.name).join(", ")})`;
    }

    sql += `\n);\n\n`;

    // Add indexes
    table.indexes.forEach(idx => {
      const unique = idx.unique ? "UNIQUE " : "";
      const using = idx.type !== "btree" ? ` USING ${idx.type}` : "";
      const where = idx.where ? ` WHERE ${idx.where}` : "";

      sql += `CREATE ${unique}INDEX ${idx.name} ON ${table.name}${using} (${idx.columns.join(", ")})${where};\n`;
    });

    if (table.indexes.length > 0) sql += "\n";

    // Add foreign keys
    table.constraints
      .filter(c => c.type === "foreign_key")
      .forEach(constraint => {
        sql += `ALTER TABLE ${table.name}\n`;
        sql += `  ADD CONSTRAINT ${constraint.name}\n`;
        sql += `  FOREIGN KEY (${constraint.columns.join(", ")})\n`;
        sql += `  REFERENCES ${constraint.references!.table}(${constraint.references!.columns.join(", ")})`;

        if (constraint.references!.onDelete) {
          sql += `\n  ON DELETE ${constraint.references!.onDelete}`;
        }
        if (constraint.references!.onUpdate) {
          sql += `\n  ON UPDATE ${constraint.references!.onUpdate}`;
        }

        sql += ";\n\n";
      });
  });

  return sql;
}

/**
 * Schema validation
 */
export function validateSchema(tables: TableSpec[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  tables.forEach(table => {
    // Check for primary key
    const hasPK = table.columns.some(col => col.name === "id");
    if (!hasPK) {
      errors.push(`Table "${table.name}" has no primary key`);
    }

    // Check for created_at/updated_at
    const hasTimestamps = table.columns.some(col => col.name === "created_at" || col.name === "updated_at");
    if (!hasTimestamps) {
      warnings.push(`Table "${table.name}" missing timestamps (created_at, updated_at)`);
    }

    // Check foreign key indexes
    table.relationships.forEach(rel => {
      const hasIndex = table.indexes.some(idx => idx.columns.includes(rel.foreignKey));
      if (!hasIndex) {
        warnings.push(`Foreign key "${rel.foreignKey}" in "${table.name}" should have an index`);
      }
    });

    // Check for proper data types
    table.columns.forEach(col => {
      if (col.name.includes("email") && !col.type.toLowerCase().includes("varchar")) {
        warnings.push(`Column "${col.name}" in "${table.name}" should use VARCHAR type`);
      }

      if (col.name.includes("password") && col.type.toLowerCase().includes("varchar")) {
        warnings.push(`Column "${col.name}" in "${table.name}" stores hashed password - ensure it's long enough (60+ chars for bcrypt)`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Helper functions
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDefault(value: any, type: string): string {
  if (value === null) return "NULL";
  if (typeof value === "string") {
    if (value.toUpperCase() === "NOW()") return "NOW()";
    return `'${value}'`;
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

/**
 * Schema design best practices
 */
export const schemaDesignBestPractices = {
  naming: [
    "Use snake_case for table and column names",
    "Use plural for table names (users, posts, comments)",
    "Use descriptive names (avoid abbreviations)",
    "Prefix boolean columns with is_, has_, or can_",
    "Use consistent naming across tables",
  ],

  primaryKeys: [
    "Always use a primary key",
    "Use auto-incrementing integers (SERIAL) for most cases",
    "Use UUIDs for distributed systems or public APIs",
    "Name primary key column 'id' for consistency",
    "Consider BIGSERIAL for tables expecting >2B rows",
  ],

  foreignKeys: [
    "Always create foreign key constraints",
    "Name foreign keys with _id suffix (user_id, post_id)",
    "Add indexes on all foreign key columns",
    "Define ON DELETE and ON UPDATE behavior",
    "Use CASCADE for dependent data, RESTRICT for important relationships",
  ],

  indexes: [
    "Index all foreign keys",
    "Index columns used in WHERE clauses",
    "Index columns used in JOIN conditions",
    "Index columns used in ORDER BY",
    "Use composite indexes for multi-column queries",
    "Don't over-index (each index has write overhead)",
  ],

  timestamps: [
    "Add created_at and updated_at to all tables",
    "Use TIMESTAMPTZ (with timezone) in PostgreSQL",
    "Set created_at with DEFAULT NOW()",
    "Update updated_at with trigger or ORM",
  ],

  nullability: [
    "Make columns NOT NULL by default",
    "Only allow NULL when absence of value is meaningful",
    "Avoid NULL in boolean columns (use FALSE as default)",
    "Consider default values instead of NULL",
  ],

  dataTypes: [
    "Choose smallest appropriate data type",
    "Use NUMERIC/DECIMAL for money (never FLOAT)",
    "Use VARCHAR with length limit for bounded strings",
    "Use TEXT for unbounded strings",
    "Use JSONB for flexible schemas in PostgreSQL",
  ],
};
