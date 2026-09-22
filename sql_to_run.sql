ALTER TABLE incidents ADD COLUMN IF NOT EXISTS occurrence_scope TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS occurrence_scope TEXT;
