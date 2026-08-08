import { useRef, useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { Avatar } from '@/components/Avatar';
import { EmojiPicker } from '@/components/EmojiPicker';
import { ReactionPicker, REACTION_MAP } from '@/components/ReactionPicker';
import { ShareModal } from '@/components/ShareModal';
import { EditPostModal } from '@/components/EditPostModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  X, Heart, MessageCircle, Share2, Bookmark, Send, MoreHorizontal,
  Pencil, Trash2, Pin, Eye, Paperclip, Smile, Camera, Film, FileText,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react';
import { fullName, timeAgo, formatFullDate, readFileAsDataURL } from '@/lib/format';
import { privacyOption } from '@/lib/privacy';
import { cn } from '@/lib/cn';
import { uid } from '@/lib/storage';
import type { Post, Attachment, ReactionType, Comment } from '@/types';

interface PostDetailViewProps {
  post: Post;
  onClose: () => void;
}

interface MediaItem { src: string; type: 'image' | 'video'; }

export function PostDetailView({ post, onClose }: PostDetailViewProps) {
  const {
    currentUser, getUserById, toggleLike, toggleReaction, getReactionCounts,
    getUserReaction, incrementViews, addCommentWithAttachment, editComment,
    deleteComment, toggleCommentReaction, toggleSavePost, sharePost,
    deletePost, togglePinPost, updatePost,
  } = useApp();
  const { navigate } = useRouter();

  const author = getUserById(post.userId);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showReactions, setShowReactions] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [comment, setComment] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [commentAttachment, setCommentAttachment] = useState<Attachment | null>(null);
  const [replyTo, setReplyTo] = useState<string | undefined>(undefined);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [commentReactionsOpen, setCommentReactionsOpen] = useState<string | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allMedia: MediaItem[] = [
    ...post.images.map((src) => ({ src, type: 'image' as const })),
    ...post.videos.map((src) => ({ src, type: 'video' as const })),
  ];

  const isMine = currentUser?.id === post.userId;
  const liked = currentUser ? post.likes.includes(currentUser.id) : false;
  const saved = currentUser ? post.savedBy.includes(currentUser.id) : false;
  const priv = privacyOption(post.visibility);
  const reactionCounts = getReactionCounts(post.id);
  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
  const myReaction = currentUser ? getUserReaction(post.id, currentUser.id) : null;
  const isPinned = author?.pinnedPostId === post.id;

  useEffect(() => {
    incrementViews(post.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && mediaIndex > 0) setMediaIndex(mediaIndex - 1);
      if (e.key === 'ArrowRight' && mediaIndex < allMedia.length - 1) setMediaIndex(mediaIndex + 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaIndex, allMedia.length]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
  }, []);

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() && !commentAttachment) return;
    addCommentWithAttachment(post.id, comment, commentAttachment ?? undefined, replyTo);
    setComment('');
    setCommentAttachment(null);
    setReplyTo(undefined);
    setShowEmoji(false);
    scrollToBottom();
  };

  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => setShowReactions(true), 500);
  };
  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handlePhotoAttach = async (files: FileList | null) => {
    if (!files?.[0]) return;
    const dataUrl = await readFileAsDataURL(files[0]);
    setCommentAttachment({ id: uid('att_'), type: 'image', name: files[0].name, dataUrl, size: files[0].size });
  };
  const handleVideoAttach = async (files: FileList | null) => {
    if (!files?.[0]) return;
    const dataUrl = await readFileAsDataURL(files[0]);
    setCommentAttachment({ id: uid('att_'), type: 'video', name: files[0].name, dataUrl, size: files[0].size });
  };
  const handleFileAttach = async (files: FileList | null) => {
    if (!files?.[0]) return;
    const dataUrl = await readFileAsDataURL(files[0]);
    const ext = files[0].name.split('.').pop()?.toLowerCase() ?? '';
    const type = ext === 'pdf' ? 'pdf' : ext === 'doc' || ext === 'docx' ? 'word' : ext === 'xls' || ext === 'xlsx' ? 'excel' : ext === 'ppt' || ext === 'pptx' ? 'powerpoint' : ext === 'zip' || ext === 'rar' ? 'zip' : 'txt';
    setCommentAttachment({ id: uid('att_'), type, name: files[0].name, dataUrl, size: files[0].size });
  };

  const startEditComment = (c: Comment) => {
    setEditingCommentId(c.id);
    setEditCommentText(c.text);
  };
  const saveEditComment = () => {
    if (editingCommentId && editCommentText.trim()) {
      editComment(post.id, editingCommentId, editCommentText.trim());
    }
    setEditingCommentId(null);
    setEditCommentText('');
  };

  const menuItems = isMine
    ? [
        { icon: Pencil, label: 'Editar publicación', onClick: () => { setEditOpen(true); setMenuOpen(false); } },
        { icon: priv.icon, label: 'Cambiar privacidad', onClick: () => { setEditOpen(true); setMenuOpen(false); }, color: priv.color },
        { icon: Pin, label: isPinned ? 'Desfijar del perfil' : 'Fijar al perfil', onClick: () => { togglePinPost(post.id); setMenuOpen(false); } },
        { icon: Bookmark, label: saved ? 'Quitar de guardados' : 'Guardar', onClick: () => { toggleSavePost(post.id); setMenuOpen(false); } },
        { icon: Share2, label: 'Compartir', onClick: () => { setShareOpen(true); setMenuOpen(false); } },
        { icon: Trash2, label: 'Eliminar', onClick: () => { setDeleteConfirm(true); setMenuOpen(false); }, danger: true },
      ]
    : [
        { icon: Bookmark, label: saved ? 'Quitar de guardados' : 'Guardar', onClick: () => { toggleSavePost(post.id); setMenuOpen(false); } },
        { icon: Share2, label: 'Compartir', onClick: () => { setShareOpen(true); setMenuOpen(false); } },
      ];

  if (!author || !currentUser) return null;

  const currentMedia = allMedia[mediaIndex];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--vex-bg)] animate-fade-up" onClick={onClose}>
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-app bg-[var(--vex-surface)] px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-[var(--vex-surface-2)]">
          <X size={20} />
        </button>
        <button onClick={() => { navigate({ name: 'profile', userId: author.id }); onClose(); }} className="flex items-center gap-3">
          <Avatar user={author} size={40} />
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-semibold text-strong">{fullName(author)}</span>
              {author.verified && (
                <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0 text-brand-500" fill="currentColor"><path d="M12 1l2.5 2.5L18 3l1 3.5L22 8l-2 3 2 3-3 1.5L18 19l-3.5-.5L12 21l-2.5-2.5L6 19l-1-3.5L2 14l2-3-2-3 3-1.5L6 3l3.5.5L12 1z" /><path d="M9.5 12.5l1.8 1.8 3.7-3.7" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span>@{author.username}</span>
              <span>·</span>
              <priv.icon size={12} className={priv.color} />
              <span className={priv.color}>{priv.short}</span>
            </div>
          </div>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted sm:block" title={formatFullDate(post.createdAt)}>
            {formatFullDate(post.createdAt)}
          </span>
          <div className="relative">
            <button onClick={() => setMenuOpen((o) => !o)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-[var(--vex-surface-2)]">
              <MoreHorizontal size={20} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-app bg-[var(--vex-surface)] p-1 shadow-card">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                        item.danger ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40' : 'text-app hover:bg-[var(--vex-surface-2)]',
                      )}
                    >
                      <item.icon size={16} className={item.danger ? '' : item.color} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto max-w-2xl px-4 py-5">
          {/* Post text */}
          {post.text && (
            <p className="mb-4 whitespace-pre-wrap text-lg leading-relaxed text-app">{post.text}</p>
          )}

          {/* Media with zoom + swipe */}
          {allMedia.length > 0 && (
            <div className="relative mb-4 overflow-hidden rounded-2xl border border-app bg-black">
              <div className="relative flex items-center justify-center" style={{ minHeight: 300 }}>
                {currentMedia?.type === 'image' ? (
                  <img
                    src={currentMedia.src}
                    alt=""
                    className="max-h-[60vh] w-full object-contain transition-transform duration-200"
                    style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
                    onClick={() => setFullScreen(true)}
                    draggable={false}
                  />
                ) : (
                  <video src={currentMedia?.src} controls className="max-h-[60vh] w-full object-contain" />
                )}
              </div>

              {/* Zoom controls for images */}
              {currentMedia?.type === 'image' && (
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 px-2 py-1 backdrop-blur">
                  <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white hover:bg-white/20">
                    <ZoomOut size={16} />
                  </button>
                  <span className="px-1 text-xs text-white/80">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom((z) => Math.min(4, z + 0.5))} className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white hover:bg-white/20">
                    <ZoomIn size={16} />
                  </button>
                  <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setFullScreen(true); }} className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white hover:bg-white/20">
                    <Maximize2 size={15} />
                  </button>
                </div>
              )}

              {/* Navigation arrows */}
              {allMedia.length > 1 && (
                <>
                  {mediaIndex > 0 && (
                    <button onClick={() => { setMediaIndex(mediaIndex - 1); setZoom(1); }} className="absolute left-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70">
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  {mediaIndex < allMedia.length - 1 && (
                    <button onClick={() => { setMediaIndex(mediaIndex + 1); setZoom(1); }} className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70">
                      <ChevronRight size={20} />
                    </button>
                  )}
                  {/* Dots */}
                  <div className="absolute bottom-3 right-3 flex gap-1">
                    {allMedia.map((_, i) => (
                      <span key={i} className={cn('h-1.5 rounded-full transition-all', i === mediaIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/40')} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Info bar: date, time, relative, views */}
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span title={formatFullDate(post.createdAt)}>{formatFullDate(post.createdAt)}</span>
            <span>·</span>
            <span>{timeAgo(post.createdAt)}</span>
            {(post.views ?? 0) > 0 && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Eye size={13} /> {post.views} vistas</span>
              </>
            )}
            {post.editedAt && <span className="italic">· editado</span>}
          </div>

          {/* Action bar */}
          <div className="mb-3 flex items-center gap-1 border-y border-soft py-2">
            {/* Like / Reactions button */}
            <div className="relative">
              <button
                onClick={() => toggleLike(post.id)}
                onPointerDown={handleLongPressStart}
                onPointerUp={handleLongPressEnd}
                onPointerLeave={handleLongPressEnd}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition',
                  liked || myReaction ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40' : 'text-muted hover:bg-[var(--vex-surface-2)]',
                )}
              >
                {myReaction ? (
                  <span className="text-lg">{REACTION_MAP[myReaction].emoji}</span>
                ) : (
                  <Heart size={18} className={cn(liked && 'fill-current')} />
                )}
                <span>{(post.likes.length + totalReactions) || ''}</span>
              </button>
              {showReactions && (
                <ReactionPicker
                  onSelect={(type) => toggleReaction(post.id, type)}
                  onClose={() => setShowReactions(false)}
                />
              )}
            </div>

            <button
              onClick={() => scrollToBottom()}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted transition hover:bg-[var(--vex-surface-2)]"
            >
              <MessageCircle size={18} /> {post.comments.length || ''}
            </button>
            <button
              onClick={() => { sharePost(post.id); setShareOpen(true); }}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted transition hover:bg-[var(--vex-surface-2)]"
            >
              <Share2 size={18} /> {post.shares || ''}
            </button>
            <button
              onClick={() => toggleSavePost(post.id)}
              className={cn(
                'ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition',
                saved ? 'text-brand-600 dark:text-brand-400' : 'text-muted hover:bg-[var(--vex-surface-2)]',
              )}
            >
              <Bookmark size={18} className={cn(saved && 'fill-current')} />
            </button>
          </div>

          {/* Reaction summary */}
          {totalReactions > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
              <div className="flex -space-x-1">
                {(Object.entries(reactionCounts).filter(([, c]) => c > 0) as [ReactionType, number][]).map(([type]) => (
                  <span key={type} className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--vex-surface)] bg-[var(--vex-surface-2)] text-sm">
                    {REACTION_MAP[type].emoji}
                  </span>
                ))}
              </div>
              <span>{totalReactions} reacciones</span>
            </div>
          )}

          {/* Comments */}
          <div className="space-y-3">
            <h3 className="font-display text-base font-bold text-strong">Comentarios ({post.comments.length})</h3>
            {post.comments.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">Sé el primero en comentar.</p>
            )}
            {post.comments.map((c) => {
              const cu = getUserById(c.userId);
              if (!cu) return null;
              const cReactions = c.reactions ?? [];
              const myCommentReaction = currentUser ? cReactions.find((r) => r.userId === currentUser.id)?.type : null;
              const isCommentMine = c.userId === currentUser.id;
              const replyTarget = c.replyToCommentId ? post.comments.find((rc) => rc.id === c.replyToCommentId) : null;
              return (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar user={cu} size={36} />
                  <div className="min-w-0 flex-1">
                    {replyTarget && (
                      <p className="mb-0.5 pl-1 text-xs text-muted">
                        respondiendo a <span className="font-semibold">{replyTarget.text.slice(0, 30)}{replyTarget.text.length > 30 ? '...' : ''}</span>
                      </p>
                    )}
                    {editingCommentId === c.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editCommentText}
                          onChange={(e) => setEditCommentText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEditComment()}
                          className="input flex-1 rounded-full text-sm"
                          autoFocus
                        />
                        <button onClick={saveEditComment} className="btn-primary h-8 px-3 text-xs">Guardar</button>
                        <button onClick={() => setEditingCommentId(null)} className="btn-ghost h-8 px-3 text-xs">Cancelar</button>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-[var(--vex-surface-2)] px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => navigate({ name: 'profile', userId: cu.id })} className="text-sm font-semibold text-strong hover:underline">
                            {fullName(cu)}
                          </button>
                          {cu.verified && (
                            <svg width="13" height="13" viewBox="0 0 24 24" className="text-brand-500" fill="currentColor"><path d="M12 1l2.5 2.5L18 3l1 3.5L22 8l-2 3 2 3-3 1.5L18 19l-3.5-.5L12 21l-2.5-2.5L6 19l-1-3.5L2 14l2-3-2-3 3-1.5L6 3l3.5.5L12 1z" /><path d="M9.5 12.5l1.8 1.8 3.7-3.7" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          )}
                        </div>
                        <p className="text-sm text-app">{c.text}</p>
                        {c.attachment && (
                          <div className="mt-2 overflow-hidden rounded-xl">
                            {c.attachment.type === 'image' && <img src={c.attachment.dataUrl} alt="" className="max-h-48 w-full object-cover" />}
                            {c.attachment.type === 'video' && <video src={c.attachment.dataUrl} controls className="max-h-48 w-full object-cover" />}
                            {c.attachment.type !== 'image' && c.attachment.type !== 'video' && <a href={c.attachment.dataUrl} download={c.attachment.name} className="inline-flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400"><FileText size={14} /> {c.attachment.name}</a>}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-3 pl-1 text-xs text-muted">
                      <span>{timeAgo(c.createdAt)}{c.editedAt && ' · editado'}</span>
                      <div className="relative">
                        <button
                          onClick={() => setCommentReactionsOpen(commentReactionsOpen === c.id ? null : c.id)}
                          className="font-semibold hover:text-strong"
                        >
                          {myCommentReaction ? `${REACTION_MAP[myCommentReaction].emoji}` : '😀'}
                        </button>
                        {commentReactionsOpen === c.id && (
                          <ReactionPicker
                            onSelect={(type) => toggleCommentReaction(post.id, c.id, type)}
                            onClose={() => setCommentReactionsOpen(null)}
                          />
                        )}
                      </div>
                      <button onClick={() => setReplyTo(c.id)} className="font-semibold hover:text-strong">Responder</button>
                      {isCommentMine && <button onClick={() => startEditComment(c)} className="font-semibold hover:text-strong">Editar</button>}
                      {isCommentMine && <button onClick={() => deleteComment(post.id, c.id)} className="font-semibold text-red-500 hover:text-red-600">Eliminar</button>}
                      {cReactions.length > 0 && (
                        <div className="flex -space-x-0.5">
                          {cReactions.slice(0, 3).map((r, i) => (
                            <span key={i} className="text-xs">{REACTION_MAP[r.type].emoji}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={commentsEndRef} />
          </div>
        </div>
      </div>

      {/* Sticky comment composer */}
      <div className="sticky bottom-0 z-20 border-t border-app bg-[var(--vex-surface)] px-4 py-3" onClick={(e) => e.stopPropagation()}>
        {replyTo && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-[var(--vex-surface-2)] px-3 py-1.5 text-xs text-muted">
            <span>Respondiendo a un comentario</span>
            <button onClick={() => setReplyTo(undefined)} className="font-semibold text-brand-600 dark:text-brand-400">Cancelar</button>
          </div>
        )}
        {commentAttachment && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-[var(--vex-surface-2)] px-3 py-1.5 text-xs">
            <span className="truncate text-muted">
              {commentAttachment.type === 'image' ? '📷 Foto' : commentAttachment.type === 'video' ? '🎥 Video' : '📄 Archivo'} · {commentAttachment.name}
            </span>
            <button onClick={() => setCommentAttachment(null)} className="font-semibold text-red-500">Quitar</button>
          </div>
        )}
        <form onSubmit={submitComment} className="flex items-center gap-1.5">
          <div className="relative flex items-center gap-0.5">
            <button type="button" onClick={() => photoInputRef.current?.click()} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-[var(--vex-surface-2)]" title="Foto">
              <Camera size={18} />
            </button>
            <button type="button" onClick={() => videoInputRef.current?.click()} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-[var(--vex-surface-2)]" title="Video">
              <Film size={18} />
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-[var(--vex-surface-2)]" title="Archivo">
              <FileText size={18} />
            </button>
          </div>
          <div className="relative flex-1">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escribe un comentario..."
              className="input rounded-full py-2 pr-10 text-sm"
            />
            <button type="button" onClick={() => setShowEmoji((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-strong">
              <Smile size={18} />
            </button>
            {showEmoji && (
              <EmojiPicker onPick={(em) => setComment((c) => c + em)} onClose={() => setShowEmoji(false)} />
            )}
          </div>
          <button type="submit" disabled={!comment.trim() && !commentAttachment} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-brand text-white disabled:opacity-40">
            <Send size={16} />
          </button>
        </form>
        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoAttach(e.target.files)} />
        <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleVideoAttach(e.target.files)} />
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFileAttach(e.target.files)} />
      </div>

      {/* Full-screen image viewer */}
      {fullScreen && currentMedia?.type === 'image' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95" onClick={() => setFullScreen(false)}>
          <button className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X size={22} />
          </button>
          <img
            src={currentMedia.src}
            alt=""
            className="max-h-[95vh] max-w-full object-contain"
            style={{ transform: `scale(${zoom})` }}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">
            <button onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(1, z - 0.5)); }} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/20">
              <ZoomOut size={18} />
            </button>
            <span className="px-2 text-sm text-white">{Math.round(zoom * 100)}%</span>
            <button onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(4, z + 0.5)); }} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/20">
              <ZoomIn size={18} />
            </button>
          </div>
        </div>
      )}

      <ShareModal post={post} open={shareOpen} onClose={() => setShareOpen(false)} />
      <EditPostModal post={post} open={editOpen} onClose={() => setEditOpen(false)} />
      <ConfirmDialog
        open={deleteConfirm}
        title="¿Eliminar publicación?"
        message="¿Seguro que deseas eliminar esta publicación? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => { deletePost(post.id); setDeleteConfirm(false); onClose(); }}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}
