-- Create databases for cargoez-be (run once as postgres).
-- Usage: psql -U postgres -f scripts/create-databases.sql
-- If a database already exists, you will see an error for that line; you can ignore it.

CREATE DATABASE user_service_db;
CREATE DATABASE master_db;
