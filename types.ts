import { getSupabase } from '@/lib/supabase';
import type {
  User, Post, Comment, Notification, Conversation, Message,
  PostReaction, ReactionType, Attachment, MessageReaction,
  ConnectionRequest, PostVisibility, ProfileInfo,
} from '@/types';
import { uid } from '@/lib/storage';
import { profileToUser, type ProfileRow } from '@/lib/profiles';

// ============================================================
// TYPES — database row shapes
// ============================================================

export interface PostRow {
  id: string;
  author_id: string;
  text: string;
  images: string[];
  videos: string[];
  visibility: string;
  except_user_ids: string[];
  allowed_user_ids: string[];
  shares: number;
  views: number;
  pinned: boolean;
  edited_at: string | null;
  created_at: string;
}

export interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  text: string;
  attachment_data: Attachment | null;
  reply_to_comment_id: string | null;
  edited_at: string | null;
  created_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  message_type: string;
  status: string;
  attachment_data: Attachment | null;
  reactions_data: MessageReaction[];
  reply_to_id: string | null;
  forwarded_from_id: string | null;
  delivered_at: string | null;
  read_at: string | null;
  edited_at: string | null;
  deleted: boolean;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  actor_user_id: string;
  type: string;
  reference_id: string | null;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ConversationRow {
  id: string;
  participant_ids: string[];
  created_at: string;
  last_message_at: string | null;
}

export interface FollowRow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface ConnectionRequestRow {
  id: string;
  sender_user_id: string;
  receiver_user_id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
}

export interface CallRow {
  id: string;
  caller_id: string;
  receiver_id: string;
  type: string;
  status: string;
  started_at: string;
  ended_at: string | null;
}

// ============================================================
// CONVERSION HELPERS — DB rows ↔ domain types
// ============================================================

function ts(s: string | null | undefined): number {
  return s ? new Date(s).getTime() : 0;
}

export function postRowToPost(
  row: PostRow,
  likes: string[] = [],
  reactions: PostReaction[] = [],
  comments: Comment[] = [],
  savedBy: string[] = [],
): Post {
  return {
    id: row.id,
    userId: row.author_id,
    text: row.text,
    images: row.images ?? [],
    videos: row.videos ?? [],
    likes,
    comments,
    shares: row.shares,
    createdAt: ts(row.created_at),
    visibility: (row.visibility as PostVisibility) ?? 'public',
    exceptUserIds: row.except_user_ids ?? [],
    allowedUserIds: row.allowed_user_ids ?? [],
    savedBy,
    editedAt: row.edited_at ? ts(row.edited_at) : undefined,
    reactions,
    views: row.views,
  };
}

export function commentRowToComment(
  row: CommentRow,
  likes: string[] = [],
  reactions: PostReaction[] = [],
): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.author_id,
    text: row.text,
    createdAt: ts(row.created_at),
    likes,
    reactions,
    editedAt: row.edited_at ? ts(row.edited_at) : undefined,
    attachment: row.attachment_data ?? undefined,
    replyToCommentId: row.reply_to_comment_id ?? undefined,
  };
}

export function messageRowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    senderId: row.sender_id,
    text: row.text,
    createdAt: ts(row.created_at),
    status: (row.status as 'sent' | 'delivered' | 'read') ?? 'sent',
    readAt: row.read_at ? ts(row.read_at) : undefined,
    editedAt: row.edited_at ? ts(row.edited_at) : undefined,
    deleted: row.deleted,
    replyToId: row.reply_to_id ?? undefined,
    forwardedFromId: row.forwarded_from_id ?? undefined,
    attachment: row.attachment_data ?? undefined,
    reactions: row.reactions_data ?? [],
  };
}

export function notificationRowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as Notification['type'],
    actorId: row.actor_user_id,
    postId: row.reference_id ?? undefined,
    connectionRequestId: row.reference_id ?? undefined,
    text: row.message,
    read: row.is_read,
    createdAt: ts(row.created_at),
  };
}

export function conversationRowToConversation(
  row: ConversationRow,
  messages: Message[] = [],
): Conversation {
  return {
    id: row.id,
    participantIds: row.participant_ids,
    messages,
    createdAt: ts(row.created_at),
    lastReadAt: {},
  };
}

export function connectionRequestRowToConnectionRequest(row: ConnectionRequestRow): ConnectionRequest {
  return {
    id: row.id,
    fromUserId: row.sender_user_id,
    toUserId: row.receiver_user_id,
    status: row.status as 'pending' | 'accepted' | 'rejected',
    createdAt: ts(row.created_at),
    respondedAt: row.responded_at ? ts(row.responded_at) : undefined,
  };
}

// ============================================================
// PROFILES
// ============================================================

export async function dbFetchAllProfiles(): Promise<ProfileRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('profiles').select('*');
  if (error) { console.warn('[db] fetchAllProfiles:', error.message); return []; }
  return (data ?? []) as ProfileRow[];
}

export async function dbFetchProfileById(id: string): Promise<ProfileRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) { console.warn('[db] fetchProfileById:', error.message); return null; }
  return (data as ProfileRow) ?? null;
}

export async function dbUpsertProfile(user: User): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const row = {
    id: user.id,
    first_name: user.firstName,
    last_name: user.lastName,
    username: user.username,
    email: user.email,
    alt_email: user.altEmail,
    phone: user.phone,
    bio: user.bio,
    avatar_url: user.avatarUrl,
    cover_url: user.coverUrl,
    verified: user.verified,
    password_hash: user.passwordHash ?? null,
    password_salt: user.passwordSalt ?? null,
    is_seed: user.isSeed ?? false,
    birth_day: user.birthDay,
    birth_month: user.birthMonth,
    birth_year: user.birthYear,
    show_birth_date: user.showBirthDate,
    show_online_status: user.showOnlineStatus ?? true,
    blocked_users: user.blockedUsers ?? [],
    profile_info: user.profileInfo ?? {},
    pinned_post_id: user.pinnedPostId ?? null,
    last_active_at: user.lastActiveAt ?? null,
    last_seen_at: user.lastSeenAt ?? null,
  };
  const { error } = await sb.from('profiles').upsert(row, { onConflict: 'id' });
  if (error) console.warn('[db] upsertProfile:', error.message);
}

// ============================================================
// FOLLOWS
// ============================================================

export async function dbFetchFollows(userId: string): Promise<{ followers: string[]; following: string[] }> {
  const sb = getSupabase();
  if (!sb) return { followers: [], following: [] };
  const [followingRes, followersRes] = await Promise.all([
    sb.from('follows').select('following_id').eq('follower_id', userId),
    sb.from('follows').select('follower_id').eq('following_id', userId),
  ]);
  if (followingRes.error) console.warn('[db] fetchFollows following:', followingRes.error.message);
  if (followersRes.error) console.warn('[db] fetchFollows followers:', followersRes.error.message);
  return {
    following: (followingRes.data ?? []).map((r: { following_id: string }) => r.following_id),
    followers: (followersRes.data ?? []).map((r: { follower_id: string }) => r.follower_id),
  };
}

export async function dbFollow(followerId: string, followingId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('follows').upsert(
    { id: uid('fl_'), follower_id: followerId, following_id: followingId },
    { onConflict: 'follower_id,following_id' },
  );
  if (error) console.warn('[db] follow:', error.message);
}

export async function dbUnfollow(followerId: string, followingId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  if (error) console.warn('[db] unfollow:', error.message);
}

// ============================================================
// CONNECTION REQUESTS
// ============================================================

export async function dbFetchConnectionRequests(userId: string): Promise<ConnectionRequest[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('connection_requests')
    .select('*')
    .or(`sender_user_id.eq.${userId},receiver_user_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) { console.warn('[db] fetchConnectionRequests:', error.message); return []; }
  return (data ?? []).map(connectionRequestRowToConnectionRequest);
}

export async function dbSendConnectionRequest(senderId: string, receiverId: string): Promise<ConnectionRequest | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const id = uid('cr_');
  const { data, error } = await sb.from('connection_requests')
    .insert({ id, sender_user_id: senderId, receiver_user_id: receiverId, status: 'pending' })
    .select('*').single();
  if (error) { console.warn('[db] sendConnectionRequest:', error.message); return null; }
  return connectionRequestRowToConnectionRequest(data as ConnectionRequestRow);
}

export async function dbRespondToConnectionRequest(requestId: string, accept: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('connection_requests')
    .update({ status: accept ? 'accepted' : 'rejected', responded_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) console.warn('[db] respondToConnectionRequest:', error.message);
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function dbFetchNotifications(userId: string): Promise<Notification[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) { console.warn('[db] fetchNotifications:', error.message); return []; }
  return (data ?? []).map(notificationRowToNotification);
}

export async function dbCreateNotification(n: {
  userId: string;
  actorId: string;
  type: string;
  referenceId?: string;
  message: string;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('notifications').insert({
    id: uid('n_'),
    user_id: n.userId,
    actor_user_id: n.actorId,
    type: n.type,
    reference_id: n.referenceId ?? null,
    message: n.message,
    is_read: false,
  });
  if (error) console.warn('[db] createNotification:', error.message);
}

export async function dbMarkAllNotificationsRead(userId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) console.warn('[db] markAllNotificationsRead:', error.message);
}

export async function dbMarkNotificationRead(notificationId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);
  if (error) console.warn('[db] markNotificationRead:', error.message);
}

export async function dbUnreadNotificationCount(userId: string): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;
  const { count, error } = await sb.from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) { console.warn('[db] unreadNotificationCount:', error.message); return 0; }
  return count ?? 0;
}

// ============================================================
// POSTS + LIKES + REACTIONS + COMMENTS + SAVED
// ============================================================

export async function dbFetchAllPosts(): Promise<PostRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) { console.warn('[db] fetchAllPosts:', error.message); return []; }
  return (data ?? []) as PostRow[];
}

export async function dbCreatePost(post: Post): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('posts').insert({
    id: post.id,
    author_id: post.userId,
    text: post.text,
    images: post.images,
    videos: post.videos,
    visibility: post.visibility,
    except_user_ids: post.exceptUserIds,
    allowed_user_ids: post.allowedUserIds,
    shares: 0,
    views: 0,
    pinned: false,
  });
  if (error) console.warn('[db] createPost:', error.message);
}

export async function dbUpdatePost(postId: string, patch: Partial<Post>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const update: Record<string, unknown> = { edited_at: new Date().toISOString() };
  if (patch.text !== undefined) update.text = patch.text;
  if (patch.images !== undefined) update.images = patch.images;
  if (patch.videos !== undefined) update.videos = patch.videos;
  if (patch.visibility !== undefined) update.visibility = patch.visibility;
  if (patch.exceptUserIds !== undefined) update.except_user_ids = patch.exceptUserIds;
  if (patch.allowedUserIds !== undefined) update.allowed_user_ids = patch.allowedUserIds;
  const { error } = await sb.from('posts').update(update).eq('id', postId);
  if (error) console.warn('[db] updatePost:', error.message);
}

export async function dbDeletePost(postId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('posts').delete().eq('id', postId);
  if (error) console.warn('[db] deletePost:', error.message);
}

export async function dbSharePost(postId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc('increment_shares', { post_id: postId });
  if (error) {
    // Fallback: read + update
    const { data } = await sb.from('posts').select('shares').eq('id', postId).maybeSingle();
    const shares = (data?.shares as number ?? 0) + 1;
    await sb.from('posts').update({ shares }).eq('id', postId);
  }
}

export async function dbIncrementViews(postId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc('increment_views', { post_id: postId });
  if (error) console.warn('[db] incrementViews:', error.message);
}

// --- LIKES ---
export async function dbFetchPostLikes(postIds: string[]): Promise<Record<string, string[]>> {
  const sb = getSupabase();
  if (!sb || postIds.length === 0) return {};
  const { data, error } = await sb.from('post_likes')
    .select('post_id, user_id')
    .in('post_id', postIds);
  if (error) { console.warn('[db] fetchPostLikes:', error.message); return {}; }
  const map: Record<string, string[]> = {};
  for (const r of (data ?? []) as { post_id: string; user_id: string }[]) {
    (map[r.post_id] ??= []).push(r.user_id);
  }
  return map;
}

export async function dbToggleLike(postId: string, userId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.from('post_likes')
    .select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
  if (data) {
    await sb.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
  } else {
    await sb.from('post_likes').insert({ id: uid('pl_'), post_id: postId, user_id: userId });
  }
}

// --- REACTIONS ---
export async function dbFetchPostReactions(postIds: string[]): Promise<Record<string, PostReaction[]>> {
  const sb = getSupabase();
  if (!sb || postIds.length === 0) return {};
  const { data, error } = await sb.from('post_reactions')
    .select('post_id, user_id, reaction_type')
    .in('post_id', postIds);
  if (error) { console.warn('[db] fetchPostReactions:', error.message); return {}; }
  const map: Record<string, PostReaction[]> = {};
  for (const r of (data ?? []) as { post_id: string; user_id: string; reaction_type: string }[]) {
    (map[r.post_id] ??= []).push({ type: r.reaction_type as ReactionType, userId: r.user_id });
  }
  return map;
}

export async function dbToggleReaction(postId: string, userId: string, type: ReactionType): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.from('post_reactions')
    .select('id, reaction_type').eq('post_id', postId).eq('user_id', userId).maybeSingle();
  if (data) {
    if ((data as { reaction_type: string }).reaction_type === type) {
      await sb.from('post_reactions').delete().eq('post_id', postId).eq('user_id', userId);
    } else {
      await sb.from('post_reactions').update({ reaction_type: type }).eq('post_id', postId).eq('user_id', userId);
    }
  } else {
    await sb.from('post_reactions').insert({ id: uid('pr_'), post_id: postId, user_id: userId, reaction_type: type });
  }
}

// --- SAVED POSTS ---
export async function dbFetchSavedPosts(userId: string): Promise<string[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('saved_posts')
    .select('post_id').eq('user_id', userId);
  if (error) { console.warn('[db] fetchSavedPosts:', error.message); return []; }
  return (data ?? []).map((r: { post_id: string }) => r.post_id);
}

export async function dbToggleSavePost(postId: string, userId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.from('saved_posts')
    .select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
  if (data) {
    await sb.from('saved_posts').delete().eq('post_id', postId).eq('user_id', userId);
  } else {
    await sb.from('saved_posts').insert({ id: uid('sp_'), post_id: postId, user_id: userId });
  }
}

// --- COMMENTS ---
export async function dbFetchComments(postIds: string[]): Promise<Record<string, Comment[]>> {
  const sb = getSupabase();
  if (!sb || postIds.length === 0) return {};
  const { data, error } = await sb.from('comments')
    .select('*')
    .in('post_id', postIds)
    .order('created_at', { ascending: true });
  if (error) { console.warn('[db] fetchComments:', error.message); return {}; }
  const rows = (data ?? []) as CommentRow[];
  // Fetch likes and reactions for all comments
  const commentIds = rows.map((r) => r.id);
  const [likesMap, reactionsMap] = await Promise.all([
    dbFetchCommentLikes(commentIds),
    dbFetchCommentReactions(commentIds),
  ]);
  const map: Record<string, Comment[]> = {};
  for (const r of rows) {
    const c = commentRowToComment(r, likesMap[r.id] ?? [], reactionsMap[r.id] ?? []);
    (map[r.post_id] ??= []).push(c);
  }
  return map;
}

export async function dbCreateComment(comment: Comment): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('comments').insert({
    id: comment.id,
    post_id: comment.postId,
    author_id: comment.userId,
    text: comment.text,
    attachment_data: comment.attachment ?? null,
    reply_to_comment_id: comment.replyToCommentId ?? null,
  });
  if (error) console.warn('[db] createComment:', error.message);
}

export async function dbEditComment(commentId: string, text: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('comments')
    .update({ text, edited_at: new Date().toISOString() })
    .eq('id', commentId);
  if (error) console.warn('[db] editComment:', error.message);
}

export async function dbDeleteComment(commentId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('comments').delete().eq('id', commentId);
  if (error) console.warn('[db] deleteComment:', error.message);
}

// --- COMMENT LIKES ---
export async function dbFetchCommentLikes(commentIds: string[]): Promise<Record<string, string[]>> {
  const sb = getSupabase();
  if (!sb || commentIds.length === 0) return {};
  const { data, error } = await sb.from('comment_likes')
    .select('comment_id, user_id')
    .in('comment_id', commentIds);
  if (error) { console.warn('[db] fetchCommentLikes:', error.message); return {}; }
  const map: Record<string, string[]> = {};
  for (const r of (data ?? []) as { comment_id: string; user_id: string }[]) {
    (map[r.comment_id] ??= []).push(r.user_id);
  }
  return map;
}

// --- COMMENT REACTIONS ---
export async function dbFetchCommentReactions(commentIds: string[]): Promise<Record<string, PostReaction[]>> {
  const sb = getSupabase();
  if (!sb || commentIds.length === 0) return {};
  const { data, error } = await sb.from('comment_reactions')
    .select('comment_id, user_id, reaction_type')
    .in('comment_id', commentIds);
  if (error) { console.warn('[db] fetchCommentReactions:', error.message); return {}; }
  const map: Record<string, PostReaction[]> = {};
  for (const r of (data ?? []) as { comment_id: string; user_id: string; reaction_type: string }[]) {
    (map[r.comment_id] ??= []).push({ type: r.reaction_type as ReactionType, userId: r.user_id });
  }
  return map;
}

export async function dbToggleCommentReaction(commentId: string, userId: string, type: ReactionType): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.from('comment_reactions')
    .select('id, reaction_type').eq('comment_id', commentId).eq('user_id', userId).maybeSingle();
  if (data) {
    if ((data as { reaction_type: string }).reaction_type === type) {
      await sb.from('comment_reactions').delete().eq('comment_id', commentId).eq('user_id', userId);
    } else {
      await sb.from('comment_reactions').update({ reaction_type: type }).eq('comment_id', commentId).eq('user_id', userId);
    }
  } else {
    await sb.from('comment_reactions').insert({ id: uid('cr_'), comment_id: commentId, user_id: userId, reaction_type: type });
  }
}

// ============================================================
// CONVERSATIONS + MESSAGES
// ============================================================

export async function dbGetOrCreateConversation(userA: string, userB: string): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error('No Supabase client');
  
  // Try to find existing conversation with exactly these two participants
  const { data: existing } = await sb.from('conversations')
    .select('id')
    .contains('participant_ids', [userA, userB])
    .maybeSingle();
  
  if (existing) return (existing as { id: string }).id;
  
  // Also check reversed order
  const { data: existing2 } = await sb.from('conversations')
    .select('id')
    .contains('participant_ids', [userB, userA])
    .maybeSingle();
  
  if (existing2) return (existing2 as { id: string }).id;
  
  // Create new
  const id = uid('cv_');
  const { error } = await sb.from('conversations').insert({
    id,
    participant_ids: [userA, userB],
  });
  if (error) {
    console.warn('[db] createConversation:', error.message);
    // Race condition: someone else may have created it. Try fetching again.
    const { data: retry } = await sb.from('conversations')
      .select('id')
      .contains('participant_ids', [userA, userB])
      .maybeSingle();
    if (retry) return (retry as { id: string }).id;
    throw new Error('Failed to create conversation');
  }
  return id;
}

export async function dbFetchConversations(userId: string): Promise<Conversation[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('conversations')
    .select('*')
    .contains('participant_ids', [userId])
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) { console.warn('[db] fetchConversations:', error.message); return []; }
  const rows = (data ?? []) as ConversationRow[];
  const conversations: Conversation[] = [];
  for (const row of rows) {
    const messages = await dbFetchMessages(row.id);
    conversations.push(conversationRowToConversation(row, messages));
  }
  return conversations;
}

export async function dbFetchMessages(conversationId: string): Promise<Message[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) { console.warn('[db] fetchMessages:', error.message); return []; }
  return (data ?? []).map(messageRowToMessage);
}

export async function dbSendMessage(msg: Message, conversationId: string, receiverId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('messages').insert({
    id: msg.id,
    conversation_id: conversationId,
    sender_id: msg.senderId,
    receiver_id: receiverId,
    text: msg.text,
    message_type: msg.attachment?.type === 'audio' ? 'voice' : msg.attachment ? 'file' : 'text',
    status: 'sent',
    attachment_data: msg.attachment ?? null,
    reactions_data: [],
    reply_to_id: msg.replyToId ?? null,
    forwarded_from_id: msg.forwardedFromId ?? null,
  });
  if (error) { console.warn('[db] sendMessage:', error.message); return; }
  // Update conversation's last_message_at
  await sb.from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);
}

export async function dbMarkMessagesDelivered(userId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('messages')
    .update({ status: 'delivered', delivered_at: new Date().toISOString() })
    .eq('receiver_id', userId)
    .eq('status', 'sent');
  if (error) console.warn('[db] markMessagesDelivered:', error.message);
}

export async function dbMarkMessagesRead(conversationId: string, readerId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('messages')
    .update({ status: 'read', read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', readerId)
    .neq('status', 'read');
  if (error) console.warn('[db] markMessagesRead:', error.message);
}

export async function dbEditMessage(messageId: string, text: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('messages')
    .update({ text, edited_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) console.warn('[db] editMessage:', error.message);
}

export async function dbDeleteMessage(messageId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('messages')
    .update({ deleted: true, text: '', attachment_data: null })
    .eq('id', messageId);
  if (error) console.warn('[db] deleteMessage:', error.message);
}

export async function dbToggleMessageReaction(messageId: string, userId: string, emoji: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.from('messages')
    .select('reactions_data').eq('id', messageId).maybeSingle();
  const reactions: MessageReaction[] = (data?.reactions_data as MessageReaction[]) ?? [];
  const existing = reactions.find((r) => r.emoji === emoji && r.userId === userId);
  let next: MessageReaction[];
  if (existing) {
    next = reactions.filter((r) => !(r.emoji === emoji && r.userId === userId));
  } else {
    next = [...reactions, { emoji, userId }];
  }
  await sb.from('messages').update({ reactions_data: next }).eq('id', messageId);
}

// ============================================================
// PRESENCE
// ============================================================

export async function dbUpdatePresence(userId: string, isOnline: boolean, showOnlineStatus: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('presence').upsert({
    user_id: userId,
    is_online: isOnline,
    last_seen_at: new Date().toISOString(),
    show_online_status: showOnlineStatus,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('[db] updatePresence:', error.message);
}

export async function dbFetchAllPresence(): Promise<Record<string, { isOnline: boolean; lastSeenAt: number; showOnlineStatus: boolean }>> {
  const sb = getSupabase();
  if (!sb) return {};
  const { data, error } = await sb.from('presence').select('*');
  if (error) { console.warn('[db] fetchAllPresence:', error.message); return {}; }
  const map: Record<string, { isOnline: boolean; lastSeenAt: number; showOnlineStatus: boolean }> = {};
  for (const r of (data ?? []) as { user_id: string; is_online: boolean; last_seen_at: string; show_online_status: boolean }[]) {
    map[r.user_id] = {
      isOnline: r.is_online,
      lastSeenAt: new Date(r.last_seen_at).getTime(),
      showOnlineStatus: r.show_online_status,
    };
  }
  return map;
}

// ============================================================
// CALLS
// ============================================================

export async function dbLogCall(call: { id: string; callerId: string; receiverId: string; type: string; status: string }): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('calls').insert({
    id: call.id,
    caller_id: call.callerId,
    receiver_id: call.receiverId,
    type: call.type,
    status: call.status,
  });
  if (error) console.warn('[db] logCall:', error.message);
}

export async function dbUpdateCallStatus(callId: string, status: string, endedAt?: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const update: Record<string, unknown> = { status };
  if (endedAt) update.ended_at = new Date().toISOString();
  const { error } = await sb.from('calls').update(update).eq('id', callId);
  if (error) console.warn('[db] updateCallStatus:', error.message);
}

// ============================================================
// USERS — fetch all users with follows merged
// ============================================================

export async function dbFetchAllUsers(): Promise<User[]> {
  const profiles = await dbFetchAllProfiles();
  const users: User[] = [];
  for (const p of profiles) {
    const user = profileToUser(p);
    const { followers, following } = await dbFetchFollows(p.id);
    user.followers = followers;
    user.following = following;
    users.push(user);
  }
  return users;
}

export async function dbFetchUserById(id: string): Promise<User | null> {
  const p = await dbFetchProfileById(id);
  if (!p) return null;
  const user = profileToUser(p);
  const { followers, following } = await dbFetchFollows(id);
  user.followers = followers;
  user.following = following;
  return user;
}
