import { getSupabase } from '@/lib/supabase';
import type { User, ProfileInfo } from '@/types';

export interface ProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  alt_email: string;
  phone: string;
  bio: string;
  avatar_url: string;
  cover_url: string;
  verified: boolean;
  created_at: string;
  password_hash: string | null;
  password_salt: string | null;
  is_seed: boolean;
  birth_day: number;
  birth_month: number;
  birth_year: number;
  show_birth_date: boolean;
  show_online_status: boolean;
  blocked_users: string[];
  profile_info: ProfileInfo | Record<string, never>;
  pinned_post_id: string | null;
  last_active_at: number | null;
  last_seen_at: number | null;
  updated_at?: string;
}

/** Normalize a string for accent-insensitive, case-insensitive comparison. */
export function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/^@/, '');
}

/** Convert a local User to the full profile row stored in Supabase. */
function toRow(u: User): ProfileRow {
  return {
    id: u.id,
    first_name: u.firstName,
    last_name: u.lastName,
    username: u.username,
    email: u.email,
    alt_email: u.altEmail ?? '',
    phone: u.phone ?? '',
    bio: u.bio ?? '',
    avatar_url: u.avatarUrl ?? '',
    cover_url: u.coverUrl ?? '',
    verified: u.verified,
    created_at: new Date(u.createdAt).toISOString(),
    password_hash: u.passwordHash ?? null,
    password_salt: u.passwordSalt ?? null,
    is_seed: u.isSeed ?? false,
    birth_day: u.birthDay,
    birth_month: u.birthMonth,
    birth_year: u.birthYear,
    show_birth_date: u.showBirthDate,
    show_online_status: u.showOnlineStatus ?? true,
    blocked_users: u.blockedUsers ?? [],
    profile_info: u.profileInfo ?? {},
    pinned_post_id: u.pinnedPostId ?? null,
    last_active_at: u.lastActiveAt ?? null,
    last_seen_at: u.lastSeenAt ?? null,
  };
}

/** Upsert a user's profile into the shared profiles table (fire-and-forget safe). */
export async function syncProfile(user: User): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const row = toRow(user);
  const { error } = await sb.from('profiles').upsert(row, { onConflict: 'id' });
  if (error) console.warn('[profiles] sync failed:', error.message);
}

/** Sync all local non-seed users — used on app load to backfill existing accounts. */
export async function syncAllProfiles(users: User[]): Promise<void> {
  const real = users.filter((u) => !u.isSeed);
  await Promise.all(real.map(syncProfile));
}

/** Fetch all profiles from the shared table. */
export async function fetchAllProfiles(): Promise<ProfileRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[profiles] fetch failed:', error.message);
    return [];
  }
  return (data ?? []) as ProfileRow[];
}

/** Fetch a single profile by id from the shared table. */
export async function fetchProfileById(id: string): Promise<ProfileRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.warn('[profiles] fetch by id failed:', error.message);
    return null;
  }
  return (data as ProfileRow) ?? null;
}

/**
 * Search profiles by name, username, or email with accent-insensitive,
 * case-insensitive partial matching. Returns matched rows excluding the
 * given current user id.
 */
export function searchProfiles(
  profiles: ProfileRow[],
  query: string,
  excludeId?: string,
): ProfileRow[] {
  const q = normalizeSearch(query);
  if (!q) return profiles.filter((p) => p.id !== excludeId);

  return profiles.filter((p) => {
    if (p.id === excludeId) return false;
    const first = normalizeSearch(p.first_name);
    const last = normalizeSearch(p.last_name);
    const full = `${first} ${last}`.trim();
    const username = normalizeSearch(p.username);
    const email = normalizeSearch(p.email);
    const altEmail = normalizeSearch(p.alt_email);

    return (
      first.includes(q) ||
      last.includes(q) ||
      full.includes(q) ||
      username.includes(q) ||
      email.includes(q) ||
      altEmail.includes(q)
    );
  });
}

/** Convert a ProfileRow into a full User object with all fields. */
export function profileToUser(p: ProfileRow): User {
  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    username: p.username,
    email: p.email,
    altEmail: p.alt_email,
    phone: p.phone,
    passwordHash: p.password_hash ?? undefined,
    passwordSalt: p.password_salt ?? undefined,
    isSeed: p.is_seed,
    bio: p.bio,
    avatarUrl: p.avatar_url,
    coverUrl: p.cover_url,
    verified: p.verified,
    birthDay: p.birth_day,
    birthMonth: p.birth_month,
    birthYear: p.birth_year,
    followers: [],
    following: [],
    showBirthDate: p.show_birth_date,
    showOnlineStatus: p.show_online_status,
    createdAt: new Date(p.created_at).getTime(),
    profileInfo: p.profile_info ?? {},
    pinnedPostId: p.pinned_post_id ?? null,
    blockedUsers: p.blocked_users ?? [],
    lastActiveAt: p.last_active_at ?? undefined,
    lastSeenAt: p.last_seen_at ?? undefined,
  };
}
