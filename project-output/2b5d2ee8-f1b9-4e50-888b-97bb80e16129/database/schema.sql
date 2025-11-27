-- Database schema for project 2b5d2ee8-f1b9-4e50-888b-97bb80e16129

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
