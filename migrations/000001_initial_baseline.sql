-- migrate:up
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- migrate:down
-- Extensions are intentionally retained because later migrations may share them.
