-- Database schema for project 1535425e-096b-4888-8af6-b434d909581d

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
