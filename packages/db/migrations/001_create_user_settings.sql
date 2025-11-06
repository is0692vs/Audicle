-- Create user_settings table for storing user preferences
CREATE TABLE IF NOT EXISTS user_settings (
  user_email VARCHAR(255) PRIMARY KEY,
  playback_speed FLOAT DEFAULT 1.0,
  voice_model VARCHAR(100) DEFAULT 'ja-JP-Wavenet-A',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;

-- Create trigger to call the function before each update
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS if needed (adjust based on your security requirements)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Example RLS policy: users can only see their own settings
-- CREATE POLICY "Users can view their own settings" ON user_settings
--   FOR SELECT USING (user_email = current_user_email());
