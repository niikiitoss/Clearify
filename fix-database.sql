-- Fix for missing user_limits table
-- Run this in your Supabase SQL Editor

-- Create user_limits table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS user_limits (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    free_rewrites_today INTEGER DEFAULT 0,
    last_reset DATE DEFAULT CURRENT_DATE,
    is_pro BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for user_limits (if they don't exist)
ALTER TABLE user_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own limits" ON user_limits;
DROP POLICY IF EXISTS "Users can insert own limits" ON user_limits;
DROP POLICY IF EXISTS "Users can update own limits" ON user_limits;

CREATE POLICY "Users can view own limits" ON user_limits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own limits" ON user_limits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own limits" ON user_limits
    FOR UPDATE USING (auth.uid() = user_id);

-- Verify user_profiles table exists and has correct RLS policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate user_profiles policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_user_limits_user_id ON user_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
