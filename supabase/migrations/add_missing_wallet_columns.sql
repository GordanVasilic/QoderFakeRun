-- Add missing columns to token_wallets table
ALTER TABLE token_wallets 
ADD COLUMN IF NOT EXISTS email_linked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS backup_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_purchase TIMESTAMPTZ;

-- Update existing records to have email_linked = true where email is not null
UPDATE token_wallets 
SET email_linked = TRUE, backup_email = email 
WHERE email IS NOT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_token_wallets_backup_email ON token_wallets(backup_email);
CREATE INDEX IF NOT EXISTS idx_token_wallets_email_linked ON token_wallets(email_linked);