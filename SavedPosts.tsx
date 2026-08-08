import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { Avatar } from '@/components/Avatar';
import { EmojiPicker } from '@/components/EmojiPicker';
import { MessageBubble } from '@/components/MessageBubble';
import { CallOverlay } from '@/components/CallOverlay';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { AudioPlayer } from '@/components/AudioPlayer';
import { listenForIncomingCalls, sendIncomingCallNotification, webrtc } from '@/lib/webrtc';
import { getSupabase } from '@/lib/supabase';
import { dbLogCall, dbUpdateCallStatus, dbCreateNotification } from '@/lib/db';
import {
  Send, MessageCircle, Search, Plus, Users, Phone, Video, Paperclip,
  Smile, X, Check, CheckCheck, Image as ImageIcon, FileText, Trash2, Forward,
  MoreVertical, Camera, Mic, ArrowLeft,
} from 'lucide-react';
import { fullName, timeAgo } from '@/lib/format';
import { cn } from '@/lib/cn';
import { getUserStatus, statusLabel, statusDotClass, lastSeenLabel, isUserOnline } from '@/lib/status';
import { detectAttachmentType, ACCEPTED_FILE_EXTS, formatFileSize, readFileAsDataURL, attachmentLabel } from '@/lib/attachments';
import type { User, Attachment, CallType, Message, CallSignal } from '@/types';

export function Messages() {
  const {
    currentUser, conversations, getConversation, getConversationById,
    sendMessage, editMessage, deleteMessage, toggleMessageReaction, forwardMessage,
    markConversationRead, setTyping, setRecording, sendVoiceNote,
    totalUnreadMessages, unreadCountForConversation,
    getUserById, users, getPresenceInfo,
  } = useApp();
  const { navigate } = useRouter();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [searchMessages, setSearchMessages] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [call, setCall] = useState<{ user: User; type: CallType; isIncoming: boolean; signal?: CallSignal } | null>(null);
  const [view, setView] = useState<'conversations' | 'friends'>('conversations');
  const [isRecording, setIsRecording] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasTypingRef = useRef(false);

  const myConvs = useMemo(
    () => conversations.filter((c) => currentUser && c.participantIds.includes(currentUser.id)),
    [conversations, currentUser],
  );

  const active = myConvs.find((c) => c.id === activeId);
  const otherId = active?.participantIds.find((id) => id !== currentUser?.id);
  const other = otherId ? getUserById(otherId) : null;

  const filteredConvs = useMemo(() => {
    if (!search.trim()) return myConvs;
    const q = search.toLowerCase();
    return myConvs.filter((c) => {
      const oid = c.participantIds.find((id) => id !== currentUser?.id);
      const u = oid ? getUserById(oid) : null;
      if (!u) return false;
      return fullName(u).toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
    });
  }, [myConvs, search, currentUser, getUserById]);

  const filteredMessages = useMemo(() => {
    if (!active || !messageSearchQuery.trim()) return active?.messages ?? [];
    const q = messageSearchQuery.toLowerCase();
    return active.messages.filter((m) => m.text.toLowerCase().includes(q));
  }, [active, messageSearchQuery]);

  // Incoming call listener
  useEffect(() => {
    if (!currentUser) return;
    let unsub: (() => void) | null = null;
    try {
      unsub = listenForIncomingCalls(currentUser.id, (signal) => {
        const caller = getUserById(signal.fromUserId);
        if (!caller) return;
        // Log incoming call in DB
        void dbLogCall({ id: signal.callId, callerId: signal.fromUserId, receiverId: currentUser.id, type: signal.callType, status: 'ringing' });
        setCall({ user: caller, type: signal.callType, isIncoming: true, signal });
      });
    } catch (err) {
      console.warn('[Messages] Incoming call listener failed:', err);
    }
    return () => { if (unsub) unsub(); };
  }, [currentUser, getUserById]);

  // Typing indicator listener — receives broadcast from the other user
  const [typingPeers, setTypingPeers] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!currentUser) return;
    const sb = getSupabase();
    if (!sb) return;
    const ch = sb.channel(`typing:${currentUser.id}`, { config: { broadcast: { self: false } } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ch.on('broadcast', { event: 'typing' }, (payload: any) => {
      const { userId, isTyping } = payload as { userId: string; isTyping: boolean };
      setTypingPeers((prev) => ({ ...prev, [userId]: isTyping }));
      if (isTyping) {
        setTimeout(() => setTypingPeers((prev) => ({ ...prev, [userId]: false })), 4000);
      }
    });
    ch.subscribe();
    return () => { try { sb.removeChannel(ch); } catch { /* */ } };
  }, [currentUser]);

  const updateLastSeen = useCallback((_userId: string) => {}, []);
  void updateLastSeen;

  const myFriends = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.following
      .map((id) => getUserById(id))
      .filter((u): u is User => !!u);
  }, [currentUser, getUserById]);

  // Auto-scroll to latest message on new message / conversation open
  useEffect(() => {
    if (!activeId) return;
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ block: 'end' });
    });
  }, [activeId]);

  useEffect(() => {
    if (!active || active.messages.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (isNearBottom) {
      requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  }, [active?.messages.length]);

  useEffect(() => {
    if (activeId) markConversationRead(activeId);
  }, [activeId, active?.messages.length, markConversationRead]);

  useEffect(() => {
    if (editingMsg) {
      setText(editingMsg.text);
      setReplyTo(null);
    }
  }, [editingMsg]);

  if (!currentUser) return null;

  const startOutgoingCall = async (type: CallType) => {
    if (!other) return;
    try {
      const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      webrtc.subscribe(currentUser.id);
      await sendIncomingCallNotification({
        type: 'call-start',
        fromUserId: currentUser.id,
        toUserId: other.id,
        callId,
        callType: type,
      });
      // Log outgoing call in DB
      void dbLogCall({ id: callId, callerId: currentUser.id, receiverId: other.id, type, status: 'calling' });
      // Create missed call notification (will be updated if answered)
      void dbCreateNotification({
        userId: other.id,
        actorId: currentUser.id,
        type: 'missed_call',
        referenceId: callId,
        message: type === 'video' ? 'videollamada entrante' : 'llamada entrante',
      });
    } catch (err) {
      console.warn('[Messages] Outgoing call notification failed:', err);
    }
    setCall({ user: other, type, isIncoming: false });
  };

  const handleVoiceNoteSend = (blob: Blob, url: string, duration: number) => {
    if (!activeId) return;
    sendVoiceNote(activeId, url, duration, replyTo?.id);
    setReplyTo(null);
    setIsRecording(false);
  };

  const handleRecordingStateChange = (recording: boolean) => {
    setIsRecording(recording);
    if (activeId) setRecording(activeId, recording);
  };

  const openConversation = async (otherUserId: string) => {
    const conv = await getConversation(otherUserId);
    setActiveId(conv.id);
    setSearch('');
    setView('conversations');
  };

  const handleTextChange = (value: string) => {
    setText(value);
    if (!activeId) return;
    if (!wasTypingRef.current) {
      setTyping(activeId, true);
      wasTypingRef.current = true;
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setTyping(activeId, false);
      wasTypingRef.current = false;
    }, 2500);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId) return;
    if (editingMsg) {
      editMessage(activeId, editingMsg.id, text);
      setEditingMsg(null);
    } else if (text.trim() || pendingAttachment) {
      sendMessage(activeId, text, replyTo?.id, pendingAttachment ?? undefined);
      setReplyTo(null);
    }
    setText('');
    setPendingAttachment(null);
    if (wasTypingRef.current) {
      setTyping(activeId, false);
      wasTypingRef.current = false;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = detectAttachmentType(file);
    if (!type) return;
    const dataUrl = await readFileAsDataURL(file);
    setPendingAttachment({
      id: `att_${Date.now()}`,
      type,
      name: file.name,
      dataUrl,
      size: file.size,
    });
    setShowAttach(false);
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    const type = detectAttachmentType(file) ?? 'image';
    setPendingAttachment({
      id: `att_${Date.now()}`,
      type,
      name: file.name,
      dataUrl,
      size: file.size,
    });
    setShowAttach(false);
  };

  const handleAudioFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    setPendingAttachment({
      id: `att_${Date.now()}`,
      type: 'audio',
      name: file.name,
      dataUrl,
      size: file.size,
    });
    setShowAttach(false);
  };

  const handleCopy = (msg: Message) => {
    if (msg.text) navigator.clipboard?.writeText(msg.text);
  };

  const handleForward = (targetConvIds: string[]) => {
    if (forwardMsg) {
      forwardMessage(forwardMsg.id, targetConvIds);
      setForwardMsg(null);
    }
  };

  const insertEmoji = (emoji: string) => {
    setText((t) => t + emoji);
  };

  const otherPresence = other ? getPresenceInfo(other.id) : null;
  const isOnlineReal = isUserOnline(other, currentUser.id, otherPresence);
  const status = getUserStatus(other, currentUser.id, otherPresence);
  const isOtherRecording = false;
  const isOtherTyping = other ? (typingPeers[other.id] ?? false) : false;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden md:h-[calc(100vh-4rem)] md:px-4 md:py-6">
      <div className="mx-auto flex w-full max-w-6xl overflow-hidden border-app bg-[var(--vex-surface)] md:rounded-2xl md:border">
        {/* ==================== LEFT SIDEBAR ==================== */}
        <aside className={cn(
          'flex w-full shrink-0 flex-col border-r border-soft md:w-[320px] md:shrink-0',
          activeId && 'hidden md:flex',
        )}>
          {/* Sidebar header */}
          <div className="shrink-0 border-b border-soft p-4">
            <h2 className="mb-3 font-display text-lg font-bold text-strong">Mensajes</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conversación..."
                className="input py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => navigate({ name: 'search' })}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--vex-surface-2)] py-2 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/30"
              >
                <Plus size={14} /> Nueva
              </button>
              <button
                onClick={() => setView(view === 'friends' ? 'conversations' : 'friends')}
                className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition', view === 'friends' ? 'gradient-brand text-white' : 'bg-[var(--vex-surface-2)] text-app hover:bg-[var(--vex-border)]')}
              >
                <Users size={14} /> Amistades
              </button>
            </div>
          </div>

          {/* Conversation list — scrollable */}
          <div className="flex-1 overflow-y-auto p-2" style={{ WebkitOverflowScrolling: 'touch' }}>
            {view === 'friends' ? (
              myFriends.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted">
                  <Users size={28} className="mx-auto mb-2 text-muted" />
                  Aún no sigues a nadie.
                </div>
              ) : (
                myFriends.map((u) => {
                  const fStatus = getUserStatus(u, currentUser.id, getPresenceInfo(u.id));
                  return (
                    <button
                      key={u.id}
                      onClick={() => openConversation(u.id)}
                      className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-[var(--vex-surface-2)]"
                    >
                      <div className="relative">
                        <Avatar user={u} size={40} />
                        <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--vex-surface)]', statusDotClass(fStatus))} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-strong">{fullName(u)}</p>
                        <p className="truncate text-xs text-muted">@{u.username} · {statusLabel(fStatus)}</p>
                      </div>
                    </button>
                  );
                })
              )
            ) : filteredConvs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted">
                <MessageCircle size={32} className="mx-auto mb-2 text-muted" />
                {search ? 'Sin resultados.' : 'Aún no tienes conversaciones.'}
              </div>
            ) : (
              filteredConvs.map((c) => {
                const oid = c.participantIds.find((id) => id !== currentUser.id)!;
                const u = getUserById(oid);
                if (!u) return null;
                const last = c.messages[c.messages.length - 1];
                const unread = unreadCountForConversation(c.id);
                const cStatus = getUserStatus(u, currentUser.id, getPresenceInfo(u.id));
                const cOnline = isUserOnline(u, currentUser.id, getPresenceInfo(u.id));
                const isTyping = typingPeers[u.id] ?? false;

                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition',
                      activeId === c.id ? 'bg-brand-50 dark:bg-brand-900/30' : 'hover:bg-[var(--vex-surface-2)]',
                    )}
                  >
                    <div className="relative">
                      <Avatar user={u} size={44} />
                      <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--vex-surface)]', statusDotClass(isTyping ? 'typing' : cStatus))} />
                      {!cOnline && !isTyping && cStatus !== 'online' && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--vex-surface)] bg-[var(--vex-border)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-sm font-semibold text-strong">{fullName(u)}</p>
                        {last && <span className="shrink-0 text-[10px] text-muted" style={{ whiteSpace: 'nowrap' }}>{formatListTime(last.createdAt)}</span>}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <p className={cn('truncate text-xs', unread > 0 ? 'font-semibold text-app' : 'text-muted')}>
                          {isTyping ? 'Escribiendo...' : last ? (last.deleted ? 'Mensaje eliminado' : last.text || attachmentLabel(last.attachment?.type ?? 'image')) : 'Inicia la conversación'}
                        </p>
                        {unread > 0 && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ==================== MAIN CHAT ==================== */}
        <main className={cn(
          'flex min-w-0 flex-1 flex-col',
          !activeId && 'hidden md:flex',
        )}>
          {!active || !other ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted">
              <MessageCircle size={40} className="text-muted" />
              <p>Selecciona una conversación para empezar a chatear.</p>
            </div>
          ) : (
            <>
              {/* ===== HEADER (fixed top) ===== */}
              <div className="relative flex shrink-0 items-center gap-3 border-b border-soft p-3">
                <button onClick={() => setActiveId(null)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-[var(--vex-surface-2)] md:hidden">
                  <ArrowLeft size={20} />
                </button>
                <div className="relative shrink-0">
                  <Avatar user={other} size={42} />
                  <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--vex-surface)]', statusDotClass(isOtherTyping ? 'typing' : isOtherRecording ? 'recording' : isOnlineReal ? 'online' : 'offline'))} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-strong">{fullName(other)}</p>
                  <p className="truncate text-[11px] font-medium text-muted">@{other.username}</p>
                  <p className={cn('truncate text-xs', isOtherTyping ? 'text-green-500' : isOtherRecording ? 'text-red-500' : isOnlineReal ? 'text-green-500' : 'text-muted')} style={{ whiteSpace: 'nowrap' }}>
                    {isOtherTyping ? `${fullName(other)} está escribiendo...` : isOtherRecording ? 'Grabando audio...' : isOnlineReal ? 'En línea' : lastSeenLabel(other, currentUser.id, otherPresence)}
                  </p>
                </div>
                <button onClick={() => setSearchMessages(true)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-[var(--vex-surface-2)] hover:text-brand-500">
                  <Search size={17} />
                </button>
                <button onClick={() => startOutgoingCall('audio')} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-[var(--vex-surface-2)] hover:text-brand-500">
                  <Phone size={18} />
                </button>
                <button onClick={() => startOutgoingCall('video')} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-[var(--vex-surface-2)] hover:text-brand-500">
                  <Video size={18} />
                </button>
                <button onClick={() => setShowMoreMenu((v) => !v)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-[var(--vex-surface-2)] hover:text-app">
                  <MoreVertical size={18} />
                </button>

                {showMoreMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                    <div className="absolute right-3 top-14 z-50 w-48 animate-scale-in overflow-hidden rounded-xl border border-app bg-[var(--vex-surface)] py-1 shadow-card">
                      <button onClick={() => { setSearchMessages(true); setShowMoreMenu(false); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-app transition hover:bg-[var(--vex-surface-2)]">
                        <Search size={15} /> Buscar mensajes
                      </button>
                      <button onClick={() => { navigate({ name: 'profile', userId: other.id }); setShowMoreMenu(false); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-app transition hover:bg-[var(--vex-surface-2)]">
                        <MessageCircle size={15} /> Ver perfil
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* ===== MESSAGE SEARCH BAR (optional, below header) ===== */}
              {searchMessages && (
                <div className="flex shrink-0 items-center gap-2 border-b border-soft bg-[var(--vex-surface-2)] px-3 py-2">
                  <Search size={15} className="text-muted" />
                  <input
                    autoFocus
                    value={messageSearchQuery}
                    onChange={(e) => setMessageSearchQuery(e.target.value)}
                    placeholder="Buscar en esta conversación..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
                  />
                  <button onClick={() => { setSearchMessages(false); setMessageSearchQuery(''); }} className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-[var(--vex-border)]">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* ===== MESSAGE LIST (scrollable, flex column) ===== */}
              <div
                ref={scrollRef}
                className="flex flex-1 flex-col overflow-y-auto px-3 py-4 md:px-6"
                style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
              >
                {active.messages.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted">
                    <MessageCircle size={36} className="text-muted" />
                    <p className="text-sm">Aún no hay mensajes. ¡Saluda!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {filteredMessages.map((m) => {
                      const mine = m.senderId === currentUser.id;
                      const replyToMsg = m.replyToId ? active.messages.find((rm) => rm.id === m.replyToId) : null;
                      const forwardedFrom = m.forwardedFromId ? getUserById(m.forwardedFromId) : null;
                      return (
                        <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                          <MessageBubble
                            message={m}
                            mine={mine}
                            sender={mine ? currentUser : other}
                            replyTo={replyToMsg}
                            forwardedFrom={forwardedFrom}
                            onReply={() => setReplyTo(m)}
                            onForward={() => setForwardMsg(m)}
                            onCopy={() => handleCopy(m)}
                            onDelete={() => deleteMessage(active.id, m.id)}
                            onEdit={() => setEditingMsg(m)}
                            onReact={(emoji) => toggleMessageReaction(active.id, m.id, emoji)}
                            onPreviewAttachment={(a) => setPreviewAttachment(a)}
                          />
                        </div>
                      );
                    })}
                    <div ref={endRef} />
                  </div>
                )}
              </div>

              {/* ===== REPLY / EDIT PREVIEW (above composer) ===== */}
              {(replyTo || editingMsg) && (
                <div className="flex shrink-0 items-center gap-2 border-t border-soft bg-[var(--vex-surface-2)] px-4 py-2">
                  <div className="min-w-0 flex-1 border-l-2 border-brand-400 pl-2">
                    <p className="text-[10px] font-semibold uppercase text-brand-500">
                      {editingMsg ? 'Editando mensaje' : 'Respondiendo a'}
                    </p>
                    <p className="truncate text-xs text-muted">{editingMsg?.text || replyTo?.text || 'Archivo adjunto'}</p>
                  </div>
                  <button
                    onClick={() => { setReplyTo(null); setEditingMsg(null); setText(''); }}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-[var(--vex-border)]"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* ===== PENDING ATTACHMENT PREVIEW (above composer) ===== */}
              {pendingAttachment && (
                <div className="flex shrink-0 items-center gap-2 border-t border-soft bg-[var(--vex-surface-2)] px-4 py-2">
                  <div className="relative shrink-0">
                    {pendingAttachment.type === 'image' ? (
                      <img src={pendingAttachment.dataUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--vex-surface)]">
                        <FileText size={20} className="text-brand-500" />
                      </div>
                    )}
                    <button
                      onClick={() => setPendingAttachment(null)}
                      className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                    >
                      <X size={11} />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-strong">{pendingAttachment.name}</p>
                    <p className="text-[10px] text-muted" style={{ whiteSpace: 'nowrap' }}>{attachmentLabel(pendingAttachment.type)} · {formatFileSize(pendingAttachment.size)}</p>
                  </div>
                </div>
              )}

              {/* ===== COMPOSER (fixed bottom) ===== */}
              <div className="flex shrink-0 items-end gap-2 border-t border-soft bg-[var(--vex-surface)] p-2.5 md:p-3">
                {showEmoji && !isRecording && <EmojiPicker onPick={insertEmoji} onClose={() => setShowEmoji(false)} />}

                {!isRecording && (
                  <button
                    onClick={() => { setShowAttach((v) => !v); setShowEmoji(false); }}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-[var(--vex-surface-2)] hover:text-brand-500"
                  >
                    <Paperclip size={20} />
                  </button>
                )}

                {!isRecording && (
                  <div className="relative flex-1">
                    <textarea
                      value={text}
                      onChange={(e) => handleTextChange(e.target.value)}
                      onFocus={() => { setTimeout(() => endRef.current?.scrollIntoView({ block: 'end' }), 300); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(e as unknown as React.FormEvent); } }}
                      placeholder={editingMsg ? 'Editar mensaje...' : 'Escribe un mensaje...'}
                      rows={1}
                      className="input max-h-24 min-h-10 resize-none rounded-2xl py-2.5 pr-10 text-sm"
                    />
                    <button
                      onClick={() => { setShowEmoji((v) => !v); setShowAttach(false); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition hover:text-brand-500"
                    >
                      <Smile size={18} />
                    </button>
                  </div>
                )}

                {isRecording && (
                  <VoiceRecorder onSend={handleVoiceNoteSend} onRecordingStateChange={handleRecordingStateChange} />
                )}

                {!isRecording && text.trim() === '' && !pendingAttachment && (
                  <VoiceRecorder onSend={handleVoiceNoteSend} onRecordingStateChange={handleRecordingStateChange} />
                )}

                {!isRecording && (text.trim() !== '' || pendingAttachment) && (
                  <button
                    onClick={submit}
                    disabled={!text.trim() && !pendingAttachment}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-brand text-white disabled:opacity-40"
                  >
                    <Send size={18} />
                  </button>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {call && (
        <CallOverlay
          user={call.user}
          type={call.type}
          myUserId={currentUser.id}
          isIncoming={call.isIncoming}
          onClose={() => {
            if (call.signal?.callId) void dbUpdateCallStatus(call.signal.callId, 'ended', true);
            setCall(null);
          }}
        />
      )}

      {previewAttachment && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" onClick={() => setPreviewAttachment(null)}>
          <button className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:bg-white/10">
            <X size={22} />
          </button>
          {previewAttachment.type === 'image' ? (
            <img src={previewAttachment.dataUrl} alt={previewAttachment.name} className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain" />
          ) : previewAttachment.type === 'video' ? (
            <video src={previewAttachment.dataUrl} controls className="max-h-[85vh] max-w-[90vw] rounded-lg" />
          ) : previewAttachment.type === 'audio' ? (
            <div className="w-full max-w-md rounded-2xl bg-[var(--vex-surface)] p-6">
              <p className="mb-3 font-semibold text-white">{previewAttachment.name}</p>
              <AudioPlayer src={previewAttachment.dataUrl} duration={0} mine={false} />
            </div>
          ) : (
            <div className="text-center text-white">
              <FileText size={48} className="mx-auto mb-3 text-white/60" />
              <p className="font-semibold">{previewAttachment.name}</p>
              <a href={previewAttachment.dataUrl} download={previewAttachment.name} className="mt-3 inline-block rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
                Descargar
              </a>
            </div>
          )}
        </div>
      )}

      {forwardMsg && (
        <ForwardDialog
          conversations={myConvs}
          currentConvId={activeId}
          getUser={getUserById}
          onCancel={() => setForwardMsg(null)}
          onSend={handleForward}
        />
      )}
    </div>
  );
}

function ForwardDialog({
  conversations,
  currentConvId,
  getUser,
  onCancel,
  onSend,
}: {
  conversations: Array<{ id: string; participantIds: string[] }>;
  currentConvId: string | null;
  getUser: (id: string) => User | undefined;
  onCancel: () => void;
  onSend: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--vex-overlay)] p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm animate-scale-in rounded-2xl border border-app bg-[var(--vex-surface)] shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-soft p-4">
          <h2 className="font-display text-lg font-bold text-strong">Reenviar a...</h2>
          <button onClick={onCancel} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-[var(--vex-surface-2)]">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {conversations.filter((c) => c.id !== currentConvId).map((c) => {
            const oid = c.participantIds.find((id) => id !== c.participantIds[0]);
            const u = oid ? getUser(oid) : null;
            if (!u) return null;
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className={cn('flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition', selected.has(c.id) ? 'bg-brand-50 dark:bg-brand-900/30' : 'hover:bg-[var(--vex-surface-2)]')}
              >
                <Avatar user={u} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-strong">{fullName(u)}</p>
                  <p className="truncate text-xs text-muted">@{u.username}</p>
                </div>
                <div className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full border-2 transition', selected.has(c.id) ? 'border-brand-500 bg-brand-500' : 'border-[var(--vex-border)]')}>
                  {selected.has(c.id) && <Check size={12} className="text-white" />}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-soft p-4">
          <button onClick={onCancel} className="btn-ghost px-4 py-2 text-sm">Cancelar</button>
          <button
            onClick={() => onSend([...selected])}
            disabled={selected.size === 0}
            className="inline-flex items-center gap-1.5 rounded-xl gradient-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Forward size={15} /> Reenviar ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}

function formatListTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  if (diff < 2 * day) return 'Ayer';
  if (diff < 7 * day) return new Date(ts).toLocaleDateString('es', { weekday: 'short' });
  return new Date(ts).toLocaleDateString('es', { day: '2-digit', month: '2-digit' });
}
