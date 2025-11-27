-- Database schema for project 14b298ae-632a-4222-ae10-fd550e7f94c7

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
