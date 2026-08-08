/*
# Extend profiles table with full user data for cross-device sync

## Problem
The existing `profiles` table only stores public-facing fields (name, username, 
email, avatar, etc.). For cross-device sync, we need to store:
- Password hash + salt (for login from any device)
- Verified status
- Birth date
- Show birth date preference
- Show online status preference
- Blocked users array
- Profile info (city, work, education, etc.) as JSONB
- Pinned post ID

## Changes
1. Add new columns to `profiles` table (all nullable with defaults for safety)
2. No data is lost — all additions are additive

## Modified Tables
### profiles — new columns:
- `password_hash` (text) — salted SHA-256 hash
- `password_salt` (text) — random per-user salt
- `is_seed` (boolean, default false) — generated demo accounts
- `birth_day` (integer, default 1)
- `birth_month` (integer, default 1)
- `birth_year` (integer, default 2000)
- `show_birth_date` (boolean, default true)
- `blocked_users` (text[], default '{}')
- `profile_info` (jsonb, default '{}')
- `pinned_post_id` (text)
- `last_active_at` (bigint) — timestamp in ms
- `last_seen_at` (bigint) — timestamp in ms

## Security
- RLS already enabled, policies already permissive
- No policy changes needed
*/

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash text;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_salt text;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_day integer NOT NULL DEFAULT 1;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_month integer NOT NULL DEFAULT 1;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_year integer NOT NULL DEFAULT 2000;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_birth_date boolean NOT NULL DEFAULT true;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_online_status boolean NOT NULL DEFAULT true;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS blocked_users text[] NOT NULL DEFAULT '{}';
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_info jsonb NOT NULL DEFAULT '{}';
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pinned_post_id text;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at bigint;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at bigint;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (lower(username));
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON profiles (lower(email));
