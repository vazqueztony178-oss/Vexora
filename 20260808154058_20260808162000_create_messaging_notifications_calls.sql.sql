import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  User, Post, Notification, Conversation, Comment, Message,
  PostVisibility, Report, ReportReason, Attachment, MessageReaction,
  PresenceInfo, PostReaction, ReactionType, Album, AlbumVisibility,
  ProfileInfo, PrivacySettings, AppearanceSettings, UserPreferences,
  VisibilityLevel, InteractionLevel, FollowLevel, GlassIntensity, ThemeMode,
  ConnectionRequest,
} from '@/types';
import { DEFAULT_PRIVACY, DEFAULT_APPEARANCE } from '@/types';
import { storage, uid } from '@/lib/storage';
import { usePresence } from '@/hooks/usePresence';
import { generateSalt, hashPassword, digestsMatch } from '@/lib/crypto';
import { getSupabase } from '@/lib/supabase';
import { syncProfile, fetchAllProfiles, fetchProfileById, profileToUser } from '@/lib/profiles';
import * as db from '@/lib/db';

interface AppState {
  currentUser: User | null;
  users: User[];
  posts: Post[];
  notifications: Notification[];
  conversations: Conversation[];
  loading: boolean;

  register: (data: Omit<User, 'id' | 'followers' | 'following' | 'verified' | 'createdAt' | 'bio' | 'avatarUrl' | 'coverUrl'> & { password: string }) => Promise<{ ok: boolean; error?: string; pendingUserId?: string }>;
  verifyCode: (pendingUserId: string, code: string) => { ok: boolean; error?: string };
  resendCode: (pendingUserId: string) => string;
  login: (identifier: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  requestPasswordReset: (identifier: string) => { ok: boolean; error?: string; code?: string; userId?: string };
  verifyResetCode: (userId: string, code: string) => { ok: boolean; error?: string };
  resetPassword: (userId: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  updateProfile: (patch: Partial<User>) => void;
  toggleFollow: (targetId: string) => void;

  connectionRequests: ConnectionRequest[];
  sendConnectionRequest: (targetId: string) => void;
  respondToConnectionRequest: (requestId: string, accept: boolean) => void;
  getConnectionStatus: (otherUserId: string) => 'none' | 'pending_sent' | 'pending_received' | 'connected';

  createPost: (text: string, images: string[], videos: string[], visibility: PostVisibility, exceptUserIds?: string[], allowedUserIds?: string[]) => void;
  updatePost: (postId: string, patch: Partial<Pick<Post, 'text' | 'images' | 'videos' | 'visibility' | 'exceptUserIds' | 'allowedUserIds'>>) => void;
  deletePost: (postId: string) => void;
  toggleLike: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  sharePost: (postId: string) => void;
  toggleSavePost: (postId: string) => void;
  toggleReaction: (postId: string, type: ReactionType) => void;
  getReactionCounts: (postId: string) => Record<ReactionType, number>;
  getUserReaction: (postId: string, userId: string) => ReactionType | null;
  incrementViews: (postId: string) => void;
  editComment: (postId: string, commentId: string, text: string) => void;
  deleteComment: (postId: string, commentId: string) => void;
  toggleCommentReaction: (postId: string, commentId: string, type: ReactionType) => void;
  replyToComment: (postId: string, text: string, replyToCommentId?: string) => void;
  addCommentWithAttachment: (postId: string, text: string, attachment?: Attachment, replyToCommentId?: string) => void;
  togglePinPost: (postId: string) => void;
  canViewPost: (post: Post, viewerId?: string) => boolean;
  visiblePosts: (viewerId?: string) => Post[];

  albums: Album[];
  createAlbum: (name: string, description: string, visibility: AlbumVisibility, coverUrl?: string, postIds?: string[]) => void;
  updateAlbum: (albumId: string, patch: Partial<Pick<Album, 'name' | 'description' | 'visibility' | 'coverUrl' | 'postIds'>>) => void;
  deleteAlbum: (albumId: string) => void;
  addPostToAlbum: (albumId: string, postId: string) => void;
  removePostFromAlbum: (albumId: string, postId: string) => void;

  markNotificationsRead: () => void;
  markNotificationRead: (notificationId: string) => void;
  unreadNotificationCount: number;

  getConversation: (otherUserId: string) => Promise<Conversation>;
  getConversationById: (id: string) => Conversation | undefined;
  sendMessage: (conversationId: string, text: string, replyToId?: string, attachment?: Attachment) => void;
  editMessage: (conversationId: string, messageId: string, text: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  toggleMessageReaction: (conversationId: string, messageId: string, emoji: string) => void;
  forwardMessage: (messageId: string, toConversationIds: string[]) => void;
  markConversationRead: (conversationId: string) => void;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  setRecording: (conversationId: string, isRecording: boolean) => void;
  sendVoiceNote: (conversationId: string, audioUrl: string, duration: number, replyToId?: string) => void;
  totalUnreadMessages: () => number;
  unreadCountForConversation: (conversationId: string) => number;

  reports: Report[];
  blockUser: (targetId: string) => void;
  unblockUser: (targetId: string) => void;
  isBlocked: (targetId: string) => boolean;
  reportUser: (targetId: string, reason: ReportReason, explanation: string) => void;
  updateProfileInfo: (patch: Partial<ProfileInfo>) => void;

  getUserByUsername: (username: string) => User | undefined;
  getUserById: (id: string) => User | undefined;
  getPresenceInfo: (userId: string) => PresenceInfo | null;
  updateShowOnlineStatus: (show: boolean) => void;
  preferences: UserPreferences;
  updatePrivacy: (key: keyof PrivacySettings, value: VisibilityLevel | InteractionLevel | FollowLevel) => void;
  updateAppearance: (key: keyof AppearanceSettings, value: ThemeMode | GlassIntensity) => void;
}

const AppContext = createContext<AppState | null>(null);

const pendingCodes: Record<string, string> = {};
const pendingResets: Record<string, string> = {};

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [session, setSession] = useState(() => storage.getSession());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [albums, setAlbums] = useState<Album[]>(() => {
    try { return JSON.parse(localStorage.getItem('vexora.albums') ?? '[]'); } catch { return []; }
  });
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const stored = storage.getPreferences(session.userId ?? '');
    return stored ?? { privacy: { ...DEFAULT_PRIVACY }, appearance: { ...DEFAULT_APPEARANCE } };
  });
  const [loading, setLoading] = useState(true);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Ref mirror of conversations for use inside realtime callbacks (which capture stale closures)
  const conversationsRef = useRef<Conversation[]>([]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const currentUser = useMemo(
    () => users.find((u) => u.id === session.userId) ?? null,
    [users, session],
  );

  const showOnlineStatus = currentUser?.showOnlineStatus ?? true;
  const { getPresence, updateShowOnlineStatus: setPresenceOnlineStatus } = usePresence(currentUser?.id ?? null, showOnlineStatus);

  // ============================================================
  // INITIAL LOAD — fetch all data from Supabase
  // ============================================================
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [dbUsers, dbPosts, dbConns] = await Promise.all([
        db.dbFetchAllUsers(),
        db.dbFetchAllPosts(),
        session.userId ? db.dbFetchConnectionRequests(session.userId) : Promise.resolve([]),
      ]);
      if (cancelled) return;
      setUsers(dbUsers);
      setConnectionRequests(dbConns);

      // Hydrate posts with likes, reactions, comments, saved
      if (dbPosts.length > 0) {
        const postIds = dbPosts.map((p) => p.id);
        const [likesMap, reactionsMap, commentsMap] = await Promise.all([
          db.dbFetchPostLikes(postIds),
          db.dbFetchPostReactions(postIds),
          db.dbFetchComments(postIds),
        ]);
        if (cancelled) return;
        const savedIds = session.userId ? await db.dbFetchSavedPosts(session.userId) : [];
        const savedSet = new Set(savedIds);
        const fullPosts = dbPosts.map((row) =>
          db.postRowToPost(
            row,
            likesMap[row.id] ?? [],
            reactionsMap[row.id] ?? [],
            commentsMap[row.id] ?? [],
            (likesMap[row.id] ?? []).filter(() => false), // savedBy computed below
          ),
        );
        // Add savedBy info
        const fullPostsWithSaved = fullPosts.map((p) => ({
          ...p,
          savedBy: savedSet.has(p.id) ? [session.userId!] : [],
        }));
        setPosts(fullPostsWithSaved);
      }

      // Load conversations + messages
      if (session.userId) {
        const dbConvs = await db.dbFetchConversations(session.userId);
        if (cancelled) return;
        setConversations(dbConvs);

        const dbNotifs = await db.dbFetchNotifications(session.userId);
        if (cancelled) return;
        setNotifications(dbNotifs);

        const unread = await db.dbUnreadNotificationCount(session.userId);
        if (cancelled) return;
        setUnreadNotificationCount(unread);

        // Mark incoming messages as delivered
        await db.dbMarkMessagesDelivered(session.userId);
      }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session.userId]);

  // ============================================================
  // REALTIME SUBSCRIPTIONS
  // ============================================================
  const realtimeSetupRef = useRef(false);
  useEffect(() => {
    if (!session.userId || realtimeSetupRef.current) return;
    const sb = getSupabaseClient();
    if (!sb) return;
    realtimeSetupRef.current = true;

    // Posts changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sb.channel('rt-posts')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload: any) => {
        const row = payload.new as db.PostRow;
        // Fetch likes/reactions/comments for this new post
        const [likes, reactions, comments] = await Promise.all([
          db.dbFetchPostLikes([row.id]),
          db.dbFetchPostReactions([row.id]),
          db.dbFetchComments([row.id]),
        ]);
        const post = db.postRowToPost(row, likes[row.id] ?? [], reactions[row.id] ?? [], comments[row.id] ?? []);
        setPosts((prev) => prev.some((p) => p.id === row.id) ? prev : [post, ...prev]);
      })
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload: any) => {
        const row = payload.new as db.PostRow;
        setPosts((prev) => prev.map((p) => p.id === row.id ? {
          ...p,
          text: row.text,
          images: row.images ?? [],
          videos: row.videos ?? [],
          visibility: (row.visibility as PostVisibility) ?? 'public',
          exceptUserIds: row.except_user_ids ?? [],
          allowedUserIds: row.allowed_user_ids ?? [],
          shares: row.shares,
          views: row.views,
          editedAt: row.edited_at ? new Date(row.edited_at).getTime() : undefined,
        } : p));
      })
      .on('postgres_changes' as any, { event: 'DELETE', schema: 'public', table: 'posts' }, (payload: any) => {
        const oldRow = payload.old as { id: string };
        setPosts((prev) => prev.filter((p) => p.id !== oldRow.id));
      })
      .subscribe();

    // Post likes changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sb.channel('rt-likes')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'post_likes' }, async (payload: any) => {
        const row = payload.new as { post_id: string; user_id: string } | null;
        const oldRow = payload.old as { post_id: string; user_id: string } | null;
        const target = row ?? oldRow;
        if (!target) return;
        // Refetch likes for this post
        const likesMap = await db.dbFetchPostLikes([target.post_id]);
        setPosts((prev) => prev.map((p) => p.id === target.post_id ? { ...p, likes: likesMap[p.id] ?? [] } : p));
      })
      .subscribe();

    // Post reactions changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sb.channel('rt-reactions')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'post_reactions' }, async (payload: any) => {
        const row = payload.new as { post_id: string; user_id: string } | null;
        const oldRow = payload.old as { post_id: string; user_id: string } | null;
        const target = row ?? oldRow;
        if (!target) return;
        const reactionsMap = await db.dbFetchPostReactions([target.post_id]);
        setPosts((prev) => prev.map((p) => p.id === target.post_id ? { ...p, reactions: reactionsMap[p.id] ?? [] } : p));
      })
      .subscribe();

    // Comments changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sb.channel('rt-comments')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'comments' }, async (payload: any) => {
        const row = payload.new as db.CommentRow;
        // Check if comment already exists
        setPosts((prev) => {
          const post = prev.find((p) => p.id === row.post_id);
          if (!post) return prev;
          if (post.comments.some((c) => c.id === row.id)) return prev;
          const newComment = db.commentRowToComment(row);
          return prev.map((p) => p.id === row.post_id ? { ...p, comments: [...p.comments, newComment] } : p);
        });
      })
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'comments' }, (payload: any) => {
        const row = payload.new as db.CommentRow;
        setPosts((prev) => prev.map((p) => p.id === row.post_id ? {
          ...p,
          comments: p.comments.map((c) => c.id === row.id ? {
            ...c,
            text: row.text,
            editedAt: row.edited_at ? new Date(row.edited_at).getTime() : undefined,
          } : c),
        } : p));
      })
      .on('postgres_changes' as any, { event: 'DELETE', schema: 'public', table: 'comments' }, (payload: any) => {
        const oldRow = payload.old as { id: string };
        setPosts((prev) => prev.map((p) => ({
          ...p,
          comments: p.comments.filter((c) => c.id !== oldRow.id),
        })));
      })
      .subscribe();

    // Messages changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sb.channel('rt-messages')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload: any) => {
        const row = payload.new as db.MessageRow;
        const msg = db.messageRowToMessage(row);
        // Skip our own messages — already added optimistically
        if (row.sender_id === session.userId) return;
        const existing = conversationsRef.current.find((c) => c.id === row.conversation_id);
        if (existing) {
          if (existing.messages.some((m) => m.id === row.id)) return;
          setConversations((prev) => prev.map((c) => c.id === row.conversation_id ? { ...c, messages: [...c.messages, msg] } : c));
        } else {
          // Conversation not in local state — fetch it from DB
          const { data: convRow } = await sb.from('conversations').select('*').eq('id', row.conversation_id).maybeSingle();
          if (!convRow) return;
          const convRowTyped = convRow as db.ConversationRow;
          if (!convRowTyped.participant_ids.includes(session.userId)) return;
          const messages = await db.dbFetchMessages(row.conversation_id);
          const newConv = db.conversationRowToConversation(convRowTyped, messages);
          setConversations((prev) => prev.some((c) => c.id === newConv.id) ? prev : [...prev, newConv]);
        }
        // If we're the receiver, mark as delivered
        if (row.receiver_id === session.userId) {
          db.dbMarkMessagesDelivered(session.userId);
        }
      })
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload: any) => {
        const row = payload.new as db.MessageRow;
        setConversations((prev) => prev.map((c) => c.id === row.conversation_id ? {
          ...c,
          messages: c.messages.map((m) => m.id === row.id ? db.messageRowToMessage(row) : m),
        } : c));
      })
      .subscribe();

    // Notifications changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sb.channel('rt-notifications')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: any) => {
        const row = payload.new as db.NotificationRow;
        if (row.user_id !== session.userId) return;
        const n = db.notificationRowToNotification(row);
        setNotifications((prev) => [n, ...prev]);
        setUnreadNotificationCount((prev) => prev + 1);
      })
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'notifications' }, (payload: any) => {
        const row = payload.new as db.NotificationRow;
        if (row.user_id !== session.userId) return;
        setNotifications((prev) => prev.map((n) => n.id === row.id ? db.notificationRowToNotification(row) : n));
        // Recount unread
        db.dbUnreadNotificationCount(session.userId).then(setUnreadNotificationCount);
      })
      .subscribe();

    // Connection requests changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sb.channel('rt-connections')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'connection_requests' }, async (payload: any) => {
        const row = payload.new as db.ConnectionRequestRow | null;
        const oldRow = payload.old as db.ConnectionRequestRow | null;
        const target = row ?? oldRow;
        if (!target) return;
        if (target.sender_user_id !== session.userId && target.receiver_user_id !== session.userId) return;
        const conns = await db.dbFetchConnectionRequests(session.userId);
        setConnectionRequests(conns);
        // If accepted, refresh follows for both users
        if (row?.status === 'accepted') {
          const updatedUsers = await db.dbFetchAllUsers();
          setUsers(updatedUsers);
        }
      })
      .subscribe();

    // Follows changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sb.channel('rt-follows')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'follows' }, async () => {
        // Refetch all users to update follower/following counts
        const updatedUsers = await db.dbFetchAllUsers();
        setUsers(updatedUsers);
      })
      .subscribe();

    // Conversation last_message_at changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sb.channel('rt-conversations')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'conversations' }, async (payload: any) => {
        const row = payload.new as db.ConversationRow;
        if (!row.participant_ids.includes(session.userId)) return;
        if (conversationsRef.current.some((c) => c.id === row.id)) return;
        const messages = await db.dbFetchMessages(row.id);
        const conv = db.conversationRowToConversation(row, messages);
        setConversations((prev) => prev.some((c) => c.id === conv.id) ? prev : [...prev, conv]);
      })
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'conversations' }, (payload: any) => {
        const row = payload.new as db.ConversationRow;
        if (!row.participant_ids.includes(session.userId)) return;
        setConversations((prev) => prev.map((c) => c.id === row.id ? { ...c, createdAt: new Date(row.created_at).getTime() } : c));
      })
      .subscribe();

    return () => {
      realtimeSetupRef.current = false;
      try { sb.removeChannel(sb.channel('rt-posts')); } catch { /* */ }
      try { sb.removeChannel(sb.channel('rt-likes')); } catch { /**/ }
      try { sb.removeChannel(sb.channel('rt-reactions')); } catch { /**/ }
      try { sb.removeChannel(sb.channel('rt-comments')); } catch { /**/ }
      try { sb.removeChannel(sb.channel('rt-messages')); } catch { /**/ }
      try { sb.removeChannel(sb.channel('rt-notifications')); } catch { /**/ }
      try { sb.removeChannel(sb.channel('rt-connections')); } catch { /**/ }
      try { sb.removeChannel(sb.channel('rt-follows')); } catch { /**/ }
      try { sb.removeChannel(sb.channel('rt-conversations')); } catch { /**/ }
    };
  }, [session.userId]);

  // ============================================================
  // PERSIST PREFERENCES (localStorage OK for UI prefs)
  // ============================================================
  useEffect(() => {
    if (currentUser) storage.setPreferences(currentUser.id, preferences);
  }, [preferences, currentUser]);

  useEffect(() => storage.setSession(session), [session]);

  // ============================================================
  // PRESENCE
  // ============================================================
  const getPresenceInfo = useCallback((userId: string) => getPresence(userId), [getPresence]);

  const updateShowOnlineStatus = useCallback((show: boolean) => {
    if (!currentUser) return;
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, showOnlineStatus: show } : u)));
    setPresenceOnlineStatus(show);
  }, [currentUser, setPresenceOnlineStatus]);

  const updatePrivacy = useCallback((key: keyof PrivacySettings, value: VisibilityLevel | InteractionLevel | FollowLevel) => {
    setPreferences((prev) => ({ ...prev, privacy: { ...prev.privacy, [key]: value } }));
  }, []);

  const updateAppearance = useCallback((key: keyof AppearanceSettings, value: ThemeMode | GlassIntensity) => {
    setPreferences((prev) => ({ ...prev, appearance: { ...prev.appearance, [key]: value } }));
  }, []);

  // ============================================================
  // AUTH
  // ============================================================
  const register: AppState['register'] = async (data) => {
    const allProfiles = await fetchAllProfiles();
    const exists = allProfiles.some((u) => u.username.toLowerCase() === data.username.toLowerCase());
    if (exists) return { ok: false, error: 'Ese nombre de usuario ya está en uso.' };

    const email = data.email.trim().toLowerCase();
    const altEmail = data.altEmail.trim().toLowerCase();
    if (altEmail && altEmail === email) {
      return { ok: false, error: 'El correo alternativo debe ser distinto del principal.' };
    }
    const taken = (addr: string) =>
      !!addr && allProfiles.some((u) => u.email.trim().toLowerCase() === addr || u.alt_email.trim().toLowerCase() === addr);
    if (taken(email) || taken(altEmail)) {
      return { ok: false, error: 'No pudimos crear la cuenta con esos datos. Revisa los correos e inténtalo de nuevo.' };
    }

    const { password, ...rest } = data;
    const passwordSalt = generateSalt();
    const passwordHash = await hashPassword(password, passwordSalt);

    const newUser: User = {
      ...rest,
      passwordSalt,
      passwordHash,
      id: uid('u_'),
      followers: [],
      following: [],
      verified: false,
      bio: '',
      avatarUrl: '',
      coverUrl: '',
      showBirthDate: true,
      createdAt: Date.now(),
    };
    setUsers((prev) => [...prev, newUser]);
    await syncProfile(newUser);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    pendingCodes[newUser.id] = code;
    return { ok: true, pendingUserId: newUser.id };
  };

  const verifyCode: AppState['verifyCode'] = (pendingUserId, code) => {
    const expected = pendingCodes[pendingUserId];
    if (!expected) return { ok: false, error: 'Solicita un nuevo código.' };
    if (code !== expected) return { ok: false, error: 'El código no es correcto.' };
    delete pendingCodes[pendingUserId];
    setUsers((prev) => prev.map((u) => (u.id === pendingUserId ? { ...u, verified: true } : u)));
    // Update verified in DB
    const user = users.find((u) => u.id === pendingUserId);
    if (user) void syncProfile({ ...user, verified: true });
    setSession({ userId: pendingUserId });
    return { ok: true };
  };

  const resendCode: AppState['resendCode'] = (pendingUserId) => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    pendingCodes[pendingUserId] = code;
    return code;
  };

  const login: AppState['login'] = async (identifier, password) => {
    const id = identifier.trim().toLowerCase();
    const GENERIC_FAILURE = { ok: false as const, error: 'Los datos de acceso no son correctos.' };

    // Fetch all profiles from DB for login
    const allProfiles = await fetchAllProfiles();
    const profile =
      allProfiles.find((u) => u.email.trim().toLowerCase() === id || u.username.trim().toLowerCase() === id) ??
      allProfiles.find((u) => u.alt_email.trim().toLowerCase() === id);

    if (!profile) return GENERIC_FAILURE;
    if (profile.is_seed) return GENERIC_FAILURE;

    let ok = false;
    if (profile.password_hash && profile.password_salt) {
      ok = digestsMatch(await hashPassword(password, profile.password_salt), profile.password_hash);
    }
    if (!ok) return GENERIC_FAILURE;

    if (!profile.verified) {
      pendingCodes[profile.id] = String(Math.floor(100000 + Math.random() * 900000));
      return { ok: false, error: 'Tu cuenta aún no está verificada.' };
    }
    setSession({ userId: profile.id });
    return { ok: true };
  };

  const logout = () => setSession({ userId: null });

  const requestPasswordReset: AppState['requestPasswordReset'] = (identifier) => {
    const id = identifier.trim().toLowerCase();
    const user = users.find((u) => u.email.trim().toLowerCase() === id || u.username.trim().toLowerCase() === id) ??
      users.find((u) => u.altEmail.trim().toLowerCase() === id);
    if (!user || user.isSeed) return { ok: false, error: 'No encontramos una cuenta con ese dato.' };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    pendingResets[user.id] = code;
    return { ok: true, code, userId: user.id };
  };

  const verifyResetCode: AppState['verifyResetCode'] = (userId, code) => {
    const expected = pendingResets[userId];
    if (!expected) return { ok: false, error: 'Solicita un nuevo código.' };
    if (code !== expected) return { ok: false, error: 'El código no es correcto.' };
    return { ok: true };
  };

  const resetPassword: AppState['resetPassword'] = async (userId, newPassword) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: 'La cuenta ya no existe.' };
    const passwordSalt = generateSalt();
    const passwordHash = await hashPassword(newPassword, passwordSalt);
    const updated = { ...user, passwordSalt, passwordHash, password: undefined };
    setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    await syncProfile(updated);
    delete pendingResets[userId];
    setSession({ userId: null });
    return { ok: true };
  };

  // ============================================================
  // PROFILE
  // ============================================================
  const updateProfile: AppState['updateProfile'] = (patch) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...patch };
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updated : u)));
    void syncProfile(updated);
  };

  const updateProfileInfo: AppState['updateProfileInfo'] = (patch) => {
    if (!currentUser) return;
    const updated = { ...currentUser, profileInfo: { ...(currentUser.profileInfo ?? {}), ...patch } };
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updated : u)));
    void syncProfile(updated);
  };

  const getUserById = useCallback((id: string) => users.find((u) => u.id === id), [users]);
  const getUserByUsername = useCallback((username: string) => users.find((u) => u.username.toLowerCase() === username.toLowerCase()), [users]);

  // ============================================================
  // FOLLOWS
  // ============================================================
  const toggleFollow: AppState['toggleFollow'] = (targetId) => {
    if (!currentUser || targetId === currentUser.id) return;
    const isFollowing = currentUser.following.includes(targetId);
    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === currentUser.id) {
          const following = isFollowing ? u.following.filter((id) => id !== targetId) : [...u.following, targetId];
          return { ...u, following };
        }
        if (u.id === targetId) {
          const followers = isFollowing ? u.followers.filter((id) => id !== currentUser.id) : [...u.followers, currentUser.id];
          return { ...u, followers };
        }
        return u;
      }),
    );
    // DB write
    if (isFollowing) void db.dbUnfollow(currentUser.id, targetId);
    else {
      void db.dbFollow(currentUser.id, targetId);
      // Create notification
      void db.dbCreateNotification({
        userId: targetId,
        actorId: currentUser.id,
        type: 'follow',
        message: 'empezó a seguirte',
      });
    }
  };

  // ============================================================
  // CONNECTION REQUESTS
  // ============================================================
  const sendConnectionRequest: AppState['sendConnectionRequest'] = (targetId) => {
    if (!currentUser || targetId === currentUser.id) return;
    const existing = connectionRequests.find(
      (r) =>
        ((r.fromUserId === currentUser.id && r.toUserId === targetId) ||
          (r.fromUserId === targetId && r.toUserId === currentUser.id)) &&
        r.status === 'pending',
    );
    if (existing) return;

    void (async () => {
      const req = await db.dbSendConnectionRequest(currentUser.id, targetId);
      if (req) {
        setConnectionRequests((prev) => [req, ...prev]);
        void db.dbCreateNotification({
          userId: targetId,
          actorId: currentUser.id,
          type: 'connection_request',
          referenceId: req.id,
          message: 'quiere conectar contigo',
        });
      }
    })();
  };

  const respondToConnectionRequest: AppState['respondToConnectionRequest'] = (requestId, accept) => {
    if (!currentUser) return;
    const req = connectionRequests.find((r) => r.id === requestId);
    if (!req || req.toUserId !== currentUser.id || req.status !== 'pending') return;

    void (async () => {
      await db.dbRespondToConnectionRequest(requestId, accept);
      setConnectionRequests((prev) => prev.map((r) =>
        r.id === requestId ? { ...r, status: accept ? 'accepted' : 'rejected', respondedAt: Date.now() } : r,
      ));

      if (accept) {
        // Create mutual follows
        await db.dbFollow(currentUser.id, req.fromUserId);
        await db.dbFollow(req.fromUserId, currentUser.id);
        // Create notification for the sender
        void db.dbCreateNotification({
          userId: req.fromUserId,
          actorId: currentUser.id,
          type: 'connection_accepted',
          referenceId: req.id,
          message: 'aceptó tu solicitud de conexión',
        });
        // Refresh users to update follower/following counts
        const updatedUsers = await db.dbFetchAllUsers();
        setUsers(updatedUsers);
      }
    })();
  };

  const getConnectionStatus: AppState['getConnectionStatus'] = (otherUserId) => {
    if (!currentUser || otherUserId === currentUser.id) return 'connected';
    const isFollowing = currentUser.following.includes(otherUserId);
    const other = users.find((u) => u.id === otherUserId);
    const isFollowedBy = other?.followers.includes(currentUser.id);
    if (isFollowing && isFollowedBy) return 'connected';

    const pending = connectionRequests.find(
      (r) =>
        r.status === 'pending' &&
        ((r.fromUserId === currentUser.id && r.toUserId === otherUserId) ||
          (r.fromUserId === otherUserId && r.toUserId === currentUser.id)),
    );
    if (!pending) return 'none';
    return pending.fromUserId === currentUser.id ? 'pending_sent' : 'pending_received';
  };

  // ============================================================
  // POSTS
  // ============================================================
  const createPost: AppState['createPost'] = (text, images, videos, visibility, exceptUserIds = [], allowedUserIds = []) => {
    if (!currentUser || (!text.trim() && images.length === 0 && videos.length === 0)) return;
    const post: Post = {
      id: uid('p_'),
      userId: currentUser.id,
      text: text.trim(),
      images,
      videos,
      likes: [],
      comments: [],
      shares: 0,
      createdAt: Date.now(),
      visibility,
      exceptUserIds,
      allowedUserIds,
      savedBy: [],
    };
    setPosts((prev) => [post, ...prev]);
    void db.dbCreatePost(post);
  };

  const updatePost: AppState['updatePost'] = (postId, patch) => {
    if (!currentUser) return;
    setPosts((prev) => prev.map((p) => p.id === postId && p.userId === currentUser.id ? { ...p, ...patch, editedAt: Date.now() } : p));
    void db.dbUpdatePost(postId, patch);
  };

  const deletePost: AppState['deletePost'] = (postId) => {
    if (!currentUser) return;
    setPosts((prev) => prev.filter((p) => !(p.id === postId && p.userId === currentUser.id)));
    void db.dbDeletePost(postId);
  };

  const toggleSavePost: AppState['toggleSavePost'] = (postId) => {
    if (!currentUser) return;
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      const saved = p.savedBy.includes(currentUser.id);
      const savedBy = saved ? p.savedBy.filter((id) => id !== currentUser.id) : [...p.savedBy, currentUser.id];
      return { ...p, savedBy };
    }));
    void db.dbToggleSavePost(postId, currentUser.id);
  };

  const canViewPost: AppState['canViewPost'] = (post, viewerId) => {
    const vid = viewerId ?? currentUser?.id;
    if (!vid) return post.visibility === 'public';
    if (post.userId === vid) return true;
    switch (post.visibility) {
      case 'public': return true;
      case 'private': return false;
      case 'friends': {
        const author = users.find((u) => u.id === post.userId);
        return !!author?.followers.includes(vid);
      }
      case 'friends_except': {
        const author = users.find((u) => u.id === post.userId);
        return !!author?.followers.includes(vid) && !post.exceptUserIds.includes(vid);
      }
      case 'custom': return post.allowedUserIds.includes(vid);
      default: return false;
    }
  };

  const visiblePosts: AppState['visiblePosts'] = (viewerId) => {
    const vid = viewerId ?? currentUser?.id;
    return posts.filter((p) => canViewPost(p, vid));
  };

  const toggleReaction: AppState['toggleReaction'] = (postId, type) => {
    if (!currentUser) return;
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      const reactions = p.reactions ?? [];
      const existing = reactions.find((r) => r.userId === currentUser.id);
      if (existing && existing.type === type) {
        return { ...p, reactions: reactions.filter((r) => r.userId !== currentUser.id) };
      }
      const next = existing
        ? reactions.map((r) => (r.userId === currentUser.id ? { ...r, type } : r))
        : [...reactions, { type, userId: currentUser.id }];
      return { ...p, reactions: next };
    }));
    void db.dbToggleReaction(postId, currentUser.id, type);
    // Create notification for post owner
    const post = posts.find((p) => p.id === postId);
    if (post && post.userId !== currentUser.id) {
      void db.dbCreateNotification({
        userId: post.userId,
        actorId: currentUser.id,
        type: 'reaction',
        referenceId: postId,
        message: 'reaccionó a tu publicación',
      });
    }
  };

  const getReactionCounts: AppState['getReactionCounts'] = (postId) => {
    const post = posts.find((p) => p.id === postId);
    const counts: Record<ReactionType, number> = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0, clap: 0, fire: 0, hundred: 0, hug: 0 };
    for (const r of post?.reactions ?? []) counts[r.type]++;
    return counts;
  };

  const getUserReaction: AppState['getUserReaction'] = (postId, userId) => {
    const post = posts.find((p) => p.id === postId);
    return post?.reactions?.find((r) => r.userId === userId)?.type ?? null;
  };

  const incrementViews: AppState['incrementViews'] = (postId) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, views: (p.views ?? 0) + 1 } : p)));
    void db.dbIncrementViews(postId);
  };

  const editComment: AppState['editComment'] = (postId, commentId, text) => {
    if (!currentUser || !text.trim()) return;
    setPosts((prev) => prev.map((p) =>
      p.id !== postId ? p : { ...p, comments: p.comments.map((c) => (c.id === commentId && c.userId === currentUser.id ? { ...c, text: text.trim(), editedAt: Date.now() } : c)) },
    ));
    void db.dbEditComment(commentId, text.trim());
  };

  const deleteComment: AppState['deleteComment'] = (postId, commentId) => {
    if (!currentUser) return;
    setPosts((prev) => prev.map((p) =>
      p.id !== postId ? p : { ...p, comments: p.comments.filter((c) => !(c.id === commentId && c.userId === currentUser.id)) },
    ));
    void db.dbDeleteComment(commentId);
  };

  const toggleCommentReaction: AppState['toggleCommentReaction'] = (postId, commentId, type) => {
    if (!currentUser) return;
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      return {
        ...p,
        comments: p.comments.map((c) => {
          if (c.id !== commentId) return c;
          const reactions = c.reactions ?? [];
          const existing = reactions.find((r) => r.userId === currentUser.id);
          if (existing && existing.type === type) {
            return { ...c, reactions: reactions.filter((r) => r.userId !== currentUser.id) };
          }
          const next = existing
            ? reactions.map((r) => (r.userId === currentUser.id ? { ...r, type } : r))
            : [...reactions, { type, userId: currentUser.id }];
          return { ...c, reactions: next };
        }),
      };
    }));
    void db.dbToggleCommentReaction(commentId, currentUser.id, type);
  };

  const replyToComment: AppState['replyToComment'] = (postId, text, replyToCommentId) => {
    addCommentWithAttachment(postId, text, undefined, replyToCommentId);
  };

  const addCommentWithAttachment: AppState['addCommentWithAttachment'] = (postId, text, attachment, replyToCommentId) => {
    if (!currentUser || (!text.trim() && !attachment)) return;
    const comment: Comment = {
      id: uid('c_'),
      postId,
      userId: currentUser.id,
      text: text.trim(),
      createdAt: Date.now(),
      likes: [],
      attachment,
      replyToCommentId,
    };
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments: [...p.comments, comment] } : p));
    void db.dbCreateComment(comment);
    // Notify post owner
    const post = posts.find((p) => p.id === postId);
    if (post && post.userId !== currentUser.id) {
      void db.dbCreateNotification({
        userId: post.userId,
        actorId: currentUser.id,
        type: 'comment',
        referenceId: postId,
        message: 'comentó tu publicación',
      });
    }
  };

  const togglePinPost: AppState['togglePinPost'] = (postId) => {
    if (!currentUser) return;
    const updated = { ...currentUser, pinnedPostId: currentUser.pinnedPostId === postId ? null : postId };
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updated : u)));
    void syncProfile(updated);
  };

  // ============================================================
  // ALBUMS (stays in localStorage — not part of realtime requirements)
  // ============================================================
  const createAlbum: AppState['createAlbum'] = (name, description, visibility, coverUrl, postIds) => {
    if (!currentUser || !name.trim()) return;
    const album: Album = { id: uid('al_'), userId: currentUser.id, name: name.trim(), description: description.trim() || undefined, visibility, coverUrl, postIds: postIds ?? [], createdAt: Date.now() };
    setAlbums((prev) => { const next = [album, ...prev]; localStorage.setItem('vexora.albums', JSON.stringify(next)); return next; });
  };

  const updateAlbum: AppState['updateAlbum'] = (albumId, patch) => {
    setAlbums((prev) => { const next = prev.map((a) => (a.id === albumId && a.userId === currentUser?.id ? { ...a, ...patch } : a)); localStorage.setItem('vexora.albums', JSON.stringify(next)); return next; });
  };

  const deleteAlbum: AppState['deleteAlbum'] = (albumId) => {
    setAlbums((prev) => { const next = prev.filter((a) => !(a.id === albumId && a.userId === currentUser?.id)); localStorage.setItem('vexora.albums', JSON.stringify(next)); return next; });
  };

  const addPostToAlbum: AppState['addPostToAlbum'] = (albumId, postId) => {
    setAlbums((prev) => { const next = prev.map((a) => (a.id === albumId && !a.postIds.includes(postId) ? { ...a, postIds: [...a.postIds, postId] } : a)); localStorage.setItem('vexora.albums', JSON.stringify(next)); return next; });
  };

  const removePostFromAlbum: AppState['removePostFromAlbum'] = (albumId, postId) => {
    setAlbums((prev) => { const next = prev.map((a) => (a.id === albumId ? { ...a, postIds: a.postIds.filter((id) => id !== postId) } : a)); localStorage.setItem('vexora.albums', JSON.stringify(next)); return next; });
  };

  // ============================================================
  // LIKES
  // ============================================================
  const toggleLike: AppState['toggleLike'] = (postId) => {
    if (!currentUser) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const liked = post.likes.includes(currentUser.id);
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      const likes = liked ? p.likes.filter((id) => id !== currentUser.id) : [...p.likes, currentUser.id];
      return { ...p, likes };
    }));
    void db.dbToggleLike(postId, currentUser.id);
    if (!liked && post.userId !== currentUser.id) {
      void db.dbCreateNotification({
        userId: post.userId,
        actorId: currentUser.id,
        type: 'like',
        referenceId: postId,
        message: 'le gustó tu publicación',
      });
    }
  };

  const addComment: AppState['addComment'] = (postId, text) => {
    addCommentWithAttachment(postId, text);
  };

  const sharePost: AppState['sharePost'] = (postId) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, shares: p.shares + 1 } : p)));
    void db.dbSharePost(postId);
  };

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  const markNotificationsRead = () => {
    if (!currentUser) return;
    setNotifications((prev) => prev.map((n) => (n.userId === currentUser.id ? { ...n, read: true } : n)));
    setUnreadNotificationCount(0);
    void db.dbMarkAllNotificationsRead(currentUser.id);
  };

  const markNotificationRead = (notificationId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
    void db.dbMarkNotificationRead(notificationId);
    if (currentUser) db.dbUnreadNotificationCount(currentUser.id).then(setUnreadNotificationCount);
  };

  // ============================================================
  // MESSAGING
  // ============================================================
  const getConversation: AppState['getConversation'] = async (otherUserId) => {
    if (!currentUser) throw new Error('no session');
    // Check local state first
    const existing = conversationsRef.current.find(
      (c) => c.participantIds.length === 2 && c.participantIds.includes(currentUser.id) && c.participantIds.includes(otherUserId),
    );
    if (existing) return existing;
    // Create or fetch from DB — this is the real shared conversation
    const dbId = await db.dbGetOrCreateConversation(currentUser.id, otherUserId);
    // Check if it arrived in local state while we were waiting
    const already = conversationsRef.current.find((c) => c.id === dbId);
    if (already) return already;
    // Fetch messages and add to state
    const messages = await db.dbFetchMessages(dbId);
    const conv: Conversation = {
      id: dbId,
      participantIds: [currentUser.id, otherUserId],
      messages,
      createdAt: Date.now(),
      lastReadAt: { [currentUser.id]: Date.now() },
    };
    setConversations((prev) => prev.some((c) => c.id === dbId) ? prev : [...prev, conv]);
    return conv;
  };

  const getConversationById: AppState['getConversationById'] = (id) => conversations.find((c) => c.id === id);

  const sendMessage: AppState['sendMessage'] = (conversationId, text, replyToId, attachment) => {
    if (!currentUser) return;
    if (!text.trim() && !attachment) return;
    const conv = conversations.find((c) => c.id === conversationId);
    const receiverId = conv?.participantIds.find((id) => id !== currentUser.id);
    if (!receiverId) return;

    const msg: Message = {
      id: uid('m_'),
      senderId: currentUser.id,
      text: text.trim(),
      createdAt: Date.now(),
      status: 'sent',
      replyToId,
      attachment,
    };
    setConversations((prev) => prev.map((c) => c.id === conversationId ? { ...c, messages: [...c.messages, msg] } : c));
    void db.dbSendMessage(msg, conversationId, receiverId);
    // Create notification for the receiver
    void db.dbCreateNotification({
      userId: receiverId,
      actorId: currentUser.id,
      type: 'message',
      referenceId: conversationId,
      message: 'te envió un mensaje',
    });
  };

  const editMessage: AppState['editMessage'] = (conversationId, messageId, text) => {
    if (!currentUser || !text.trim()) return;
    setConversations((prev) => prev.map((c) =>
      c.id === conversationId ? { ...c, messages: c.messages.map((m) => (m.id === messageId && m.senderId === currentUser.id ? { ...m, text: text.trim(), editedAt: Date.now() } : m)) } : c,
    ));
    void db.dbEditMessage(messageId, text.trim());
  };

  const deleteMessage: AppState['deleteMessage'] = (conversationId, messageId) => {
    if (!currentUser) return;
    setConversations((prev) => prev.map((c) =>
      c.id === conversationId ? { ...c, messages: c.messages.map((m) => (m.id === messageId && m.senderId === currentUser.id ? { ...m, deleted: true, text: '', attachment: undefined } : m)) } : c,
    ));
    void db.dbDeleteMessage(messageId);
  };

  const toggleMessageReaction: AppState['toggleMessageReaction'] = (conversationId, messageId, emoji) => {
    if (!currentUser) return;
    setConversations((prev) => prev.map((c) => {
      if (c.id !== conversationId) return c;
      return {
        ...c,
        messages: c.messages.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = m.reactions ?? [];
          const existing = reactions.find((r) => r.emoji === emoji && r.userId === currentUser.id);
          if (existing) {
            return { ...m, reactions: reactions.filter((r) => !(r.emoji === emoji && r.userId === currentUser.id)) };
          }
          return { ...m, reactions: [...reactions, { emoji, userId: currentUser.id }] };
        }),
      };
    }));
    void db.dbToggleMessageReaction(messageId, currentUser.id, emoji);
  };

  const forwardMessage: AppState['forwardMessage'] = (messageId, toConversationIds) => {
    if (!currentUser) return;
    const sourceConv = conversations.find((c) => c.messages.some((m) => m.id === messageId));
    const sourceMsg = sourceConv?.messages.find((m) => m.id === messageId);
    if (!sourceMsg) return;
    toConversationIds.forEach((convId) => {
      const conv = conversations.find((c) => c.id === convId);
      const receiverId = conv?.participantIds.find((id) => id !== currentUser.id);
      if (!receiverId) return;
      const msg: Message = {
        id: uid('m_'),
        senderId: currentUser.id,
        text: sourceMsg.text,
        createdAt: Date.now(),
        status: 'sent',
        forwardedFromId: sourceMsg.senderId,
        attachment: sourceMsg.attachment,
      };
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, msg] } : c)));
      void db.dbSendMessage(msg, convId, receiverId);
    });
  };

  const markConversationRead: AppState['markConversationRead'] = (conversationId) => {
    if (!currentUser) return;
    const now = Date.now();
    setConversations((prev) => prev.map((c) => {
      if (c.id !== conversationId) return c;
      const lastReadAt = { ...(c.lastReadAt ?? {}), [currentUser.id]: now };
      const messages = c.messages.map((m) => {
        if (m.senderId !== currentUser.id && m.status !== 'read') {
          return { ...m, status: 'read' as const, readAt: now };
        }
        return m;
      });
      return { ...c, lastReadAt, messages };
    }));
    void db.dbMarkMessagesRead(conversationId, currentUser.id);
  };

  const setTyping: AppState['setTyping'] = (conversationId, isTyping) => {
    if (!currentUser) return;
    const sb = getSupabaseClient();
    if (!sb) return;
    const conv = conversationsRef.current.find((c) => c.id === conversationId);
    const otherId = conv?.participantIds.find((id) => id !== currentUser.id);
    if (!otherId) return;
    const channel = sb.channel(`typing:${otherId}`);
    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: currentUser.id, conversationId, isTyping },
        });
      }
    });
  };

  const setRecording: AppState['setRecording'] = () => {
    // No-op for now — recording indicator is local only
  };

  const sendVoiceNote: AppState['sendVoiceNote'] = (conversationId, audioUrl, duration, replyToId) => {
    if (!currentUser) return;
    const conv = conversations.find((c) => c.id === conversationId);
    const receiverId = conv?.participantIds.find((id) => id !== currentUser.id);
    if (!receiverId) return;
    const msg: Message = {
      id: uid('m_'),
      senderId: currentUser.id,
      text: '',
      createdAt: Date.now(),
      status: 'sent',
      replyToId,
      attachment: {
        id: `att_${Date.now()}`,
        type: 'audio',
        name: `voice-${Date.now()}.webm`,
        dataUrl: audioUrl,
        size: 0,
        duration,
      },
    };
    setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages, msg] } : c)));
    void db.dbSendMessage(msg, conversationId, receiverId);
    void db.dbCreateNotification({
      userId: receiverId,
      actorId: currentUser.id,
      type: 'message',
      referenceId: conversationId,
      message: 'te envió un mensaje',
    });
  };

  const unreadCountForConversation: AppState['unreadCountForConversation'] = (conversationId) => {
    if (!currentUser) return 0;
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return 0;
    return conv.messages.filter((m) => m.senderId !== currentUser.id && m.status !== 'read' && !m.deleted).length;
  };

  const totalUnreadMessages: AppState['totalUnreadMessages'] = () => {
    if (!currentUser) return 0;
    return conversations
      .filter((c) => c.participantIds.includes(currentUser.id))
      .reduce((sum, c) => sum + unreadCountForConversation(c.id), 0);
  };

  // ============================================================
  // BLOCKS + REPORTS
  // ============================================================
  const blockUser: AppState['blockUser'] = (targetId) => {
    if (!currentUser || targetId === currentUser.id) return;
    const updated = {
      ...currentUser,
      blockedUsers: [...(currentUser.blockedUsers ?? []), targetId],
      following: currentUser.following.filter((id) => id !== targetId),
    };
    setUsers((prev) => prev.map((u) => {
      if (u.id === currentUser.id) return updated;
      if (u.id === targetId) return { ...u, followers: u.followers.filter((id) => id !== currentUser.id) };
      return u;
    }));
    void syncProfile(updated);
    void db.dbUnfollow(currentUser.id, targetId);
  };

  const unblockUser: AppState['unblockUser'] = (targetId) => {
    if (!currentUser) return;
    const updated = { ...currentUser, blockedUsers: (currentUser.blockedUsers ?? []).filter((id) => id !== targetId) };
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updated : u)));
    void syncProfile(updated);
  };

  const isBlocked: AppState['isBlocked'] = (targetId) => {
    if (!currentUser) return false;
    return (currentUser.blockedUsers ?? []).includes(targetId);
  };

  const reportUser: AppState['reportUser'] = (targetId, reason, explanation) => {
    if (!currentUser) return;
    const report: Report = {
      id: uid('r_'),
      reporterId: currentUser.id,
      reportedUserId: targetId,
      reason,
      explanation: explanation.trim(),
      createdAt: Date.now(),
      status: 'pending',
    };
    setReports((prev) => [report, ...prev]);
  };

  // ============================================================
  // VALUE
  // ============================================================
  const value: AppState = {
    currentUser,
    users,
    posts,
    notifications,
    conversations,
    loading,
    register,
    verifyCode,
    resendCode,
    login,
    logout,
    requestPasswordReset,
    verifyResetCode,
    resetPassword,
    updateProfile,
    toggleFollow,
    connectionRequests,
    sendConnectionRequest,
    respondToConnectionRequest,
    getConnectionStatus,
    createPost,
    updatePost,
    deletePost,
    toggleLike,
    addComment,
    sharePost,
    toggleSavePost,
    canViewPost,
    visiblePosts,
    toggleReaction,
    getReactionCounts,
    getUserReaction,
    incrementViews,
    editComment,
    deleteComment,
    toggleCommentReaction,
    replyToComment,
    addCommentWithAttachment,
    togglePinPost,
    albums,
    createAlbum,
    updateAlbum,
    deleteAlbum,
    addPostToAlbum,
    removePostFromAlbum,
    updateProfileInfo,
    markNotificationsRead,
    markNotificationRead,
    unreadNotificationCount,
    getConversation,
    getConversationById,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleMessageReaction,
    forwardMessage,
    markConversationRead,
    setTyping,
    setRecording,
    sendVoiceNote,
    totalUnreadMessages,
    unreadCountForConversation,
    reports,
    blockUser,
    unblockUser,
    isBlocked,
    reportUser,
    getUserByUsername,
    getUserById,
    getPresenceInfo,
    updateShowOnlineStatus,
    preferences,
    updatePrivacy,
    updateAppearance,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// Helper to get Supabase client without importing in every function
function getSupabaseClient() {
  return getSupabase();
}
