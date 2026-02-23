-- Author: Rajkumar
-- Date: 2026-02-20
-- Description: Add BaseEntity columns to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS modified_by VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255);

UPDATE users SET modified_at = created_at WHERE modified_at IS NULL;
