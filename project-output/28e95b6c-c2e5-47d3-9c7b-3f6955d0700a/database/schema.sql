-- Database schema for project 28e95b6c-c2e5-47d3-9c7b-3f6955d0700a

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES users(id),
  label TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
