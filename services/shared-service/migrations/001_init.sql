-- Author: Rajkumar
-- Date: 2026-02-19
-- Description: Initial reference data - countries table (shared DB)

CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO countries (code, name) VALUES
  ('US', 'United States'),
  ('IN', 'India'),
  ('GB', 'United Kingdom')
ON CONFLICT (code) DO NOTHING;
