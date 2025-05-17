-- Enable required PostgreSQL extensions

-- pgcrypto provides cryptographic functions like gen_salt() and crypt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Check if the extension was successfully enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) THEN
    RAISE NOTICE 'pgcrypto extension is now enabled.';
  ELSE
    RAISE EXCEPTION 'Failed to enable pgcrypto extension.';
  END IF;
END
$$; 