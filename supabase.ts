import type { User, Post, Notification, Conversation, Report, UserPreferences, ConnectionRequest } from '@/types';

const KEYS = {
  users: 'vexora.users',
  posts: 'vexora.posts',
  session: 'vexora.session',
  rememberedEmail: 'vexora.rememberedEmail',
  notifications: 'vexora.notifications',
  conversations: 'vexora.conversations',
  savedPosts: 'vexora.savedPosts',
  reports: 'vexora.reports',
  connections: 'vexora.connections',
  purgeDone: 'vexora.purgeDone',
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

const VEXORA_OFFICIAL_ID = 'vexora-official';

function createOfficialAccount(): User {
  return {
    id: VEXORA_OFFICIAL_ID,
    firstName: 'Vexora',
    lastName: '',
    username: 'Vexora',
    email: 'official@vexora.app',
    altEmail: 'official@vexora.app',
    phone: '',
    passwordHash: '__official_no_login__',
    passwordSalt: '__official__',
    isSeed: true,
    birthDay: 1,
    birthMonth: 1,
    birthYear: 2025,
    bio: 'Cuenta oficial de Vexora. Bienvenidos a la comunidad.',
    avatarUrl: '/vexora-logo.svg',
    coverUrl: '',
    followers: [],
    following: [],
    verified: true,
    showBirthDate: false,
    createdAt: Date.now(),
  };
}

/**
 * One-time purge: removes all demo/seed users and their content, keeping only
 * real registered users and the official @Vexora account. Runs once per browser.
 */
function purgeDemoData(): void {
  if (localStorage.getItem(KEYS.purgeDone) === '1') return;

  const allUsers = read<User[]>(KEYS.users, []);
  const realUsers = allUsers.filter((u) => !u.isSeed);
  const seedIds = new Set(allUsers.filter((u) => u.isSeed).map((u) => u.id));

  const hasOfficial = realUsers.some((u) => u.id === VEXORA_OFFICIAL_ID);
  const users = hasOfficial ? realUsers : [createOfficialAccount(), ...realUsers];

  const posts = read<Post[]>(KEYS.posts, [])
    .filter((p) => !seedIds.has(p.userId))
    .map((p) => ({
      ...p,
      likes: p.likes.filter((id) => !seedIds.has(id)),
      comments: p.comments.filter((c) => !seedIds.has(c.userId)),
      savedBy: p.savedBy.filter((id) => !seedIds.has(id)),
      reactions: p.reactions?.filter((r) => !seedIds.has(r.userId)),
    }));

  const notifications = read<Notification[]>(KEYS.notifications, [])
    .filter((n) => !seedIds.has(n.actorId) && !seedIds.has(n.userId));

  write(KEYS.users, users);
  write(KEYS.posts, posts);
  write(KEYS.notifications, notifications);
  localStorage.setItem(KEYS.purgeDone, '1');
}

purgeDemoData();

export const storage = {
  getUsers: () => read<User[]>(KEYS.users, []).map((u) => ({ ...u, showBirthDate: u.showBirthDate ?? true })),
  setUsers: (u: User[]) => write(KEYS.users, u),

  getPosts: () => {
    const posts = read<Post[]>(KEYS.posts, []);
    return posts.map(normalizePost);
  },
  setPosts: (p: Post[]) => write(KEYS.posts, p),

  getSession: () => read<{ userId: string | null }>(KEYS.session, { userId: null }),
  setSession: (s: { userId: string | null }) => write(KEYS.session, s),
  getRememberedEmail: () => read<string>(KEYS.rememberedEmail, ''),
  setRememberedEmail: (e: string) => write(KEYS.rememberedEmail, e),

  getNotifications: () => read<Notification[]>(KEYS.notifications, []),
  setNotifications: (n: Notification[]) => write(KEYS.notifications, n),

  getConversations: () => read<Conversation[]>(KEYS.conversations, []),
  setConversations: (c: Conversation[]) => write(KEYS.conversations, c),

  getReports: () => read<Report[]>(KEYS.reports, []),
  setReports: (r: Report[]) => write(KEYS.reports, r),

  getConnectionRequests: () => read<ConnectionRequest[]>(KEYS.connections, []),
  setConnectionRequests: (c: ConnectionRequest[]) => write(KEYS.connections, c),

  getPreferences: (userId: string): UserPreferences | null =>
    read<UserPreferences | null>(`vexora.prefs.${userId}`, null),
  setPreferences: (userId: string, prefs: UserPreferences) =>
    write(`vexora.prefs.${userId}`, prefs),
};

function normalizePost(p: Post): Post {
  return {
    ...p,
    videos: p.videos ?? [],
    visibility: p.visibility ?? 'public',
    exceptUserIds: p.exceptUserIds ?? [],
    allowedUserIds: p.allowedUserIds ?? [],
    savedBy: p.savedBy ?? [],
  };
}

export function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
