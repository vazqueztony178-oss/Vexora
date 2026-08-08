export type UserID = string;
export type PostID = string;
export type CommentID = string;

export type UserStatus = 'online' | 'offline' | 'away' | 'typing' | 'recording';

export interface User {
  id: UserID;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  altEmail: string;
  phone: string;
  /** Legacy cleartext password. Only present on records created before password
   *  hashing was introduced; cleared on the first successful sign-in.
   *  Never set on newly registered users. */
  password?: string;
  /** Salted SHA-256 hash of the password, hex encoded. */
  passwordHash?: string;
  /** Random per-user salt, hex encoded. */
  passwordSalt?: string;
  /** True for generated demo accounts. These can never be signed into. */
  isSeed?: boolean;
  birthDay: number;
  birthMonth: number;
  birthYear: number;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  followers: UserID[];
  following: UserID[];
  verified: boolean;
  showBirthDate: boolean;
  showOnlineStatus?: boolean;
  createdAt: number;
  blockedUsers?: UserID[];
  lastActiveAt?: number;
  lastSeenAt?: number;
  profileInfo?: ProfileInfo;
  pinnedPostId?: PostID | null;
}

export interface PresenceInfo {
  isOnline: boolean;
  lastSeenAt: number;
  showOnlineStatus: boolean;
}

export type ConnectionRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface ConnectionRequest {
  id: string;
  fromUserId: UserID;
  toUserId: UserID;
  status: ConnectionRequestStatus;
  createdAt: number;
  respondedAt?: number;
}

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'impersonation' | 'scam' | 'other';

export interface Report {
  id: string;
  reporterId: UserID;
  reportedUserId: UserID;
  reason: ReportReason;
  explanation: string;
  createdAt: number;
  status: 'pending' | 'reviewed' | 'resolved';
}

export interface Comment {
  id: CommentID;
  postId: PostID;
  userId: UserID;
  text: string;
  createdAt: number;
  likes: UserID[];
  reactions?: PostReaction[];
  editedAt?: number;
  attachment?: Attachment;
  replyToCommentId?: CommentID;
}

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' | 'clap' | 'fire' | 'hundred' | 'hug';

export interface PostReaction {
  type: ReactionType;
  userId: UserID;
}

export type AlbumVisibility = 'public' | 'friends' | 'private';

export interface Album {
  id: string;
  userId: UserID;
  name: string;
  description?: string;
  visibility: AlbumVisibility;
  coverUrl?: string;
  postIds: PostID[];
  createdAt: number;
}

export interface ProfileInfo {
  city?: string;
  country?: string;
  language?: string;
  gender?: 'male' | 'female' | 'other' | '';
  relationship?: 'single' | 'in_relationship' | 'married' | 'complicated' | '';
  birthDate?: { day: number; month: number; year: number };
  family?: string;
  work?: string;
  company?: string;
  school?: string;
  university?: string;
  education?: string;
  interests?: string;
  hobbies?: string;
  favoriteMovies?: string;
  favoriteSeries?: string;
  favoriteMusic?: string;
  favoriteBooks?: string;
  website?: string;
  bio?: string;
}

export type VisibilityLevel = 'public' | 'friends' | 'private';
export type InteractionLevel = 'all' | 'friends' | 'none';
export type FollowLevel = 'all' | 'approval';
export type GlassIntensity = 'soft' | 'medium' | 'intense';
export type ThemeMode = 'light' | 'dark' | 'system' | 'glass';

export interface PrivacySettings {
  profileVisibility: VisibilityLevel;
  defaultPostVisibility: VisibilityLevel;
  photosVisibility: VisibilityLevel;
  videosVisibility: VisibilityLevel;
  storiesVisibility: VisibilityLevel;
  friendsVisibility: VisibilityLevel;
  birthDateVisibility: VisibilityLevel;
  locationVisibility: VisibilityLevel;
  familyVisibility: VisibilityLevel;
  personalInfoVisibility: VisibilityLevel;
  whoCanMessage: InteractionLevel;
  whoCanCall: InteractionLevel;
  whoCanComment: InteractionLevel;
  whoCanFollow: FollowLevel;
}

export interface AppearanceSettings {
  themeMode: ThemeMode;
  glassIntensity: GlassIntensity;
}

export interface UserPreferences {
  privacy: PrivacySettings;
  appearance: AppearanceSettings;
}

export const DEFAULT_PRIVACY: PrivacySettings = {
  profileVisibility: 'public',
  defaultPostVisibility: 'public',
  photosVisibility: 'public',
  videosVisibility: 'public',
  storiesVisibility: 'friends',
  friendsVisibility: 'public',
  birthDateVisibility: 'public',
  locationVisibility: 'public',
  familyVisibility: 'public',
  personalInfoVisibility: 'public',
  whoCanMessage: 'all',
  whoCanCall: 'all',
  whoCanComment: 'all',
  whoCanFollow: 'all',
};

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  themeMode: 'system',
  glassIntensity: 'medium',
};

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  messages: boolean;
  calls: boolean;
  comments: boolean;
  tags: boolean;
}

export interface SecuritySettings {
  recoveryEmail?: string;
  recoveryPhone?: string;
  twoFactorEnabled: boolean;
  activeSessions: Array<{ id: string; device: string; location: string; lastActive: number; current: boolean }>;
}

export type PostVisibility = 'public' | 'friends' | 'private' | 'friends_except' | 'custom';

export interface Post {
  id: PostID;
  userId: UserID;
  text: string;
  images: string[];
  videos: string[];
  likes: UserID[];
  comments: Comment[];
  shares: number;
  createdAt: number;
  visibility: PostVisibility;
  exceptUserIds: UserID[];
  allowedUserIds: UserID[];
  savedBy: UserID[];
  editedAt?: number;
  reactions?: PostReaction[];
  views?: number;
}

export interface Notification {
  id: string;
  userId: UserID;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'connection_request' | 'connection_accepted' | 'reaction' | 'share' | 'message' | 'reply' | 'tag' | 'missed_call';
  actorId: UserID;
  postId?: PostID;
  connectionRequestId?: string;
  text: string;
  read: boolean;
  createdAt: number;
}

export interface Conversation {
  id: string;
  participantIds: UserID[];
  messages: Message[];
  createdAt: number;
  typingUserIds?: UserID[];
  lastReadAt?: Record<UserID, number>;
}

export type MessageStatus = 'sent' | 'delivered' | 'read';

export type AttachmentType = 'image' | 'video' | 'audio' | 'pdf' | 'word' | 'excel' | 'powerpoint' | 'txt' | 'zip';

export interface Attachment {
  id: string;
  type: AttachmentType;
  name: string;
  dataUrl: string;
  size: number;
  duration?: number;
}

export interface MessageReaction {
  emoji: string;
  userId: UserID;
}

export interface Message {
  id: string;
  senderId: UserID;
  text: string;
  createdAt: number;
  status?: MessageStatus;
  readAt?: number;
  editedAt?: number;
  deleted?: boolean;
  replyToId?: string;
  forwardedFromId?: UserID;
  attachment?: Attachment;
  reactions?: MessageReaction[];
}

export type Session = { userId: UserID | null };

export type CallType = 'audio' | 'video';
export type CallStatus = 'calling' | 'ringing' | 'connecting' | 'in_call' | 'ended' | 'declined' | 'missed' | 'unanswered';

export interface CallState {
  id: string;
  type: CallType;
  otherUserId: UserID;
  status: CallStatus;
  startedAt: number;
  isIncoming: boolean;
}

export type CallSignalType =
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'call-start'
  | 'call-accept'
  | 'call-reject'
  | 'call-end'
  | 'call-unanswered'
  | 'media-state';

export interface CallSignal {
  type: CallSignalType;
  fromUserId: UserID;
  toUserId: UserID;
  callId: string;
  callType: CallType;
  sdp?: string;
  candidate?: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null };
  mediaState?: { muted: boolean; cameraOff: boolean };
}
