/*
# Create user_presence table for real-time online status

## Purpose
Stores per-user online/offline state and last-seen timestamps so that the chat
header and conversation list can show accurate, real-time presence information
that syncs across all users via Supabase Realtime.

## New Tables
- `user_presence`
  - `user_id` (uuid, primary key) — the user whose presence this row represents
  - `is_online` (boolean, default false) — whether the user currently has Vexora open
  - `last_seen_at` (timestamptz) — when the user was last active
  - `show_online_status` (boolean, default true) — privacy toggle: if false, other users see offline
  - `updated_at` (timestamptz) — when this row was last modified

## Security
- RLS enabled.
- Anyone (anon + authenticated) can SELECT, since presence is shared across users.
- INSERT/UPDATE are also open to anon + authenticated because the app uses the anon
  key and presence is intentionally public/shared data.
*/

CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY,
  is_online boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz DEFAULT now(),
  show_online_status boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presence_read_all" ON user_presence;
CREATE POLICY "presence_read_all"
ON user_presence FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "presence_insert_all" ON user_presence;
CREATE POLICY "presence_insert_all"
ON user_presence FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "presence_update_all" ON user_presence;
CREATE POLICY "presence_update_all"
ON user_presence FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "presence_delete_all" ON user_presence;
CREATE POLICY "presence_delete_all"
ON user_presence FOR DELETE
TO anon, authenticated USING (true);
