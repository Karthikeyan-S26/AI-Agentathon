-- Create message_logs table for tracking WhatsApp message delivery history
-- This enables inactive account detection by analyzing delivery patterns

CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Phone number information
  phone_number TEXT NOT NULL,
  country_code TEXT,
  
  -- Message details
  message_id TEXT UNIQUE, -- External message ID (e.g., from Twilio/WhatsApp)
  message_type TEXT CHECK (message_type IN ('text', 'template', 'media', 'interactive')),
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'undelivered')),
  
  -- Timestamps
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  failed_at TIMESTAMP,
  
  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  error_type TEXT CHECK (error_type IN ('rate_limit', 'banned', 'blocked', 'deleted', 'network', 'other')),
  
  -- Metadata
  sender_id TEXT, -- Your business number/ID
  campaign_id UUID, -- Optional: link to marketing campaign
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_logs_phone ON message_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_message_logs_status ON message_logs(status);
CREATE INDEX IF NOT EXISTS idx_message_logs_created ON message_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_logs_phone_status ON message_logs(phone_number, status);
CREATE INDEX IF NOT EXISTS idx_message_logs_error_code ON message_logs(error_code) WHERE error_code IS NOT NULL;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on row update
CREATE TRIGGER update_message_logs_updated_at
    BEFORE UPDATE ON message_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own message logs
CREATE POLICY "Users can view own message logs"
    ON message_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Service role can do anything (for API calls)
CREATE POLICY "Service role has full access"
    ON message_logs
    FOR ALL
    USING (auth.role() = 'service_role');

-- Helpful view for inactivity analysis
CREATE OR REPLACE VIEW whatsapp_inactivity_summary AS
SELECT 
    phone_number,
    COUNT(*) as total_messages,
    SUM(CASE WHEN status = 'delivered' OR status = 'read' THEN 1 ELSE 0 END) as delivered_messages,
    SUM(CASE WHEN status = 'failed' OR status = 'undelivered' THEN 1 ELSE 0 END) as failed_messages,
    MAX(CASE WHEN status = 'delivered' OR status = 'read' THEN delivered_at END) as last_successful_delivery,
    MAX(sent_at) as last_attempt,
    ROUND(
        100.0 * SUM(CASE WHEN status = 'failed' OR status = 'undelivered' THEN 1 ELSE 0 END) / COUNT(*),
        2
    ) as failure_rate_percent,
    EXTRACT(EPOCH FROM (NOW() - MAX(CASE WHEN status = 'delivered' OR status = 'read' THEN delivered_at END))) / 86400 as days_since_last_success
FROM message_logs
GROUP BY phone_number;

-- Grant access to the view
GRANT SELECT ON whatsapp_inactivity_summary TO authenticated, service_role;

-- Comments for documentation
COMMENT ON TABLE message_logs IS 'Tracks WhatsApp message delivery history for inactivity detection';
COMMENT ON COLUMN message_logs.status IS 'Current message status: queued, sent, delivered, read, failed, undelivered';
COMMENT ON COLUMN message_logs.error_code IS 'Error code from WhatsApp API (e.g., 131026 for banned account)';
COMMENT ON VIEW whatsapp_inactivity_summary IS 'Aggregated view for analyzing inactive WhatsApp accounts';
