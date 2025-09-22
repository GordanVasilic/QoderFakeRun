-- Token System Migration
-- Creates tables for token-based GPX download system

-- Token Wallets Table
CREATE TABLE token_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    browser_id UUID UNIQUE NOT NULL,
    balance INTEGER DEFAULT 0 CHECK (balance >= 0),
    email VARCHAR(255),
    recovery_code VARCHAR(32),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchases Table
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_session_id VARCHAR(255) UNIQUE NOT NULL,
    browser_id UUID NOT NULL REFERENCES token_wallets(browser_id),
    tokens_purchased INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    ip_address INET,
    fingerprint_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Download Logs Table
CREATE TABLE download_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    browser_id UUID NOT NULL REFERENCES token_wallets(browser_id),
    route_id VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_token_wallets_browser_id ON token_wallets(browser_id);
CREATE INDEX idx_token_wallets_email ON token_wallets(email) WHERE email IS NOT NULL;
CREATE INDEX idx_purchases_browser_id ON purchases(browser_id);
CREATE INDEX idx_purchases_created_at ON purchases(created_at DESC);
CREATE INDEX idx_download_logs_browser_id ON download_logs(browser_id);
CREATE INDEX idx_download_logs_created_at ON download_logs(created_at DESC);

-- Enable RLS on all tables
ALTER TABLE token_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full access to all tables
CREATE POLICY "Service role full access token_wallets" ON token_wallets
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access purchases" ON purchases
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access download_logs" ON download_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Anonymous users can only read their own wallet balance
CREATE POLICY "Users can read own wallet" ON token_wallets
    FOR SELECT USING (auth.role() = 'anon');

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON token_wallets TO anon;
GRANT ALL PRIVILEGES ON token_wallets TO authenticated;
GRANT ALL PRIVILEGES ON purchases TO authenticated;
GRANT ALL PRIVILEGES ON download_logs TO authenticated;

-- Atomic token redemption function
CREATE OR REPLACE FUNCTION redeem_token(
    p_browser_id UUID,
    p_route_id VARCHAR(255),
    p_ip_address INET,
    p_user_agent TEXT
) RETURNS JSON AS $$
DECLARE
    v_wallet_id UUID;
    v_new_balance INTEGER;
BEGIN
    -- Atomically decrement balance
    UPDATE token_wallets 
    SET balance = balance - 1, 
        updated_at = NOW(),
        last_accessed_at = NOW()
    WHERE browser_id = p_browser_id AND balance > 0
    RETURNING id, balance INTO v_wallet_id, v_new_balance;
    
    -- Check if update was successful
    IF v_wallet_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'insufficient_balance');
    END IF;
    
    -- Log the download
    INSERT INTO download_logs (browser_id, route_id, ip_address, user_agent)
    VALUES (p_browser_id, p_route_id, p_ip_address, p_user_agent);
    
    RETURN json_build_object(
        'success', true, 
        'new_balance', v_new_balance,
        'wallet_id', v_wallet_id
    );
END;
$$ LANGUAGE plpgsql;

-- Fraud detection function
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TABLE(ip_address INET, purchase_count BIGINT, total_amount BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT p.ip_address, COUNT(*) as purchase_count, SUM(p.amount_cents) as total_amount
    FROM purchases p
    WHERE p.created_at > NOW() - INTERVAL '1 hour'
    GROUP BY p.ip_address
    HAVING COUNT(*) > 5 OR SUM(p.amount_cents) > 10000;
END;
$$ LANGUAGE plpgsql;

-- Update trigger for token_wallets
CREATE OR REPLACE FUNCTION update_token_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_token_wallets_updated_at
    BEFORE UPDATE ON token_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_token_wallets_updated_at();