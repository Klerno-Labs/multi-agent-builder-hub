-- Database schema for project e9d8ec09-642f-42ff-b156-d7e43bed1f0d

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
