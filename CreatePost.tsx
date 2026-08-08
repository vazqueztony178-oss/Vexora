import { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { Avatar } from '@/components/Avatar';
import { Heart, MessageCircle, Share2, Send, MoreHorizontal, Pencil, Bookmark, Trash2, Pin } from 'lucide-react';
import { timeAgo, formatFullDate, fullName } from '@/lib/format';
import { cn } from '@/lib/cn';
import { privacyOption } from '@/lib/privacy';
import { ShareModal } from '@/components/ShareModal';
import { EditPostModal } from '@/components/EditPostModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PostDetailView } from '@/components/PostDetailView';
import { ReactionPicker, REACTION_MAP } from '@/components/ReactionPicker';
import type { Post, ReactionType } from '@/types';

export function PostCard({ post }: { post: Post }) {
  const { currentUser, getUserById, toggleLike, addComment, sharePost, toggleSavePost, deletePost, toggleReaction, getReactionCounts, getUserReaction, togglePinPost } = useApp();
  const { navigate } = useRouter();
  const author = getUserById(post.userId);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!author || !currentUser) return null;

  const liked = post.likes.includes(currentUser.id);
  const saved = post.savedBy.includes(currentUser.id);
  const isMine = post.userId === currentUser.id;
  const priv = privacyOption(post.visibility);
  const myReaction = getUserReaction(post.id, currentUser.id);
  const reactionCounts = getReactionCounts(post.id);
  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
  const isPinned = author?.pinnedPostId === post.id;

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    addComment(post.id, comment);
    setComment('');
    setShowComments(true);
  };

  const menuItems: Array<{ icon: typeof Pencil; label: string; onClick: () => void; danger?: boolean; color?: string }> = isMine
    ? [
        { icon: Pin, label: isPinned ? 'Desfijar del perfil' : 'Fijar al perfil', onClick: () => { togglePinPost(post.id); setMenuOpen(false); } },
        { icon: Pencil, label: 'Editar publicación', onClick: () => { setEditOpen(true); setMenuOpen(false); } },
        { icon: priv.icon, label: 'Editar privacidad', onClick: () => { setEditOpen(true); setMenuOpen(false); }, color: priv.color },
        { icon: Bookmark, label: saved ? 'Quitar de guardados' : 'Guardar publicación', onClick: () => { toggleSavePost(post.id); setMenuOpen(false); } },
        { icon: Share2, label: 'Compartir publicación', onClick: () => { setShareOpen(true); setMenuOpen(false); } },
        { icon: Trash2, label: 'Eliminar publicación', onClick: () => { setDeleteConfirm(true); setMenuOpen(false); }, danger: true },
      ]
    : [
        { icon: Bookmark, label: saved ? 'Quitar de guardados' : 'Guardar publicación', onClick: () => { toggleSavePost(post.id); setMenuOpen(false); } },
        { icon: Share2, label: 'Compartir publicación', onClick: () => { setShareOpen(true); setMenuOpen(false); } },
      ];

  const allMedia = [...post.images.map((src) => ({ src, type: 'image' as const })), ...post.videos.map((src) => ({ src, type: 'video' as const }))];

  return (
    <article className="card p-4 animate-fade-up">
      <header className="flex items-start gap-3">
        <button onClick={() => navigate({ name: 'profile', userId: author.id })}>
          <Avatar user={author} size={44} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate({ name: 'profile', userId: author.id })} className="truncate font-semibold text-strong hover:underline">
              {fullName(author)}
            </button>
            {author.verified && (
              <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0 text-brand-500" fill="currentColor"><path d="M12 1l2.5 2.5L18 3l1 3.5L22 8l-2 3 2 3-3 1.5L18 19l-3.5-.5L12 21l-2.5-2.5L6 19l-1-3.5L2 14l2-3-2-3 3-1.5L6 3l3.5.5L12 1z" /><path d="M9.5 12.5l1.8 1.8 3.7-3.7" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
            <span className="truncate text-sm text-muted">@{author.username}</span>
            <priv.icon size={13} className={cn('shrink-0', priv.color)} />
          </div>
          <span className="text-xs text-muted" title={formatFullDate(post.createdAt)}>
            {timeAgo(post.createdAt)}
            {post.editedAt && <span className="italic"> · editado</span>}
          </span>
        </div>

        <div className="relative">
          <button onClick={() => setMenuOpen((o) => !o)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-[var(--vex-surface-2)]">
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-app bg-[var(--vex-surface)] p-1 shadow-card">
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition',
                      item.danger
                        ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
                        : 'text-app hover:bg-[var(--vex-surface-2)]',
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
      </header>

      {post.text && <p className="mt-3 whitespace-pre-wrap leading-relaxed text-app">{post.text}</p>}

      {allMedia.length > 0 && (
        <div className={cn('mt-3 grid gap-1 overflow-hidden rounded-xl', allMedia.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
          {allMedia.map((m, i) => (
            <button key={i} onClick={() => setDetailOpen(true)} className={cn('group relative overflow-hidden', allMedia.length === 1 ? 'max-h-96' : 'h-48')}>
              {m.type === 'image' ? (
                <img src={m.src} alt="" className={cn('w-full object-cover transition group-hover:scale-105', allMedia.length === 1 ? 'max-h-96' : 'h-48')} />
              ) : (
                <video src={m.src} className={cn('w-full object-cover', allMedia.length === 1 ? 'max-h-96' : 'h-48')} onClick={(e) => e.stopPropagation()} />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1 border-t border-soft pt-3">
        <div className="relative">
          <button
            onClick={() => toggleLike(post.id)}
            onPointerDown={() => { longPressTimer.current = setTimeout(() => setShowReactions(true), 500); }}
            onPointerUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
            onPointerLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition',
              liked || myReaction ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40' : 'text-muted hover:bg-[var(--vex-surface-2)]',
            )}
          >
            {myReaction ? <span className="text-lg">{REACTION_MAP[myReaction].emoji}</span> : <Heart size={18} className={cn(liked && 'fill-current')} />}
            {(post.likes.length + totalReactions) || ''}
          </button>
          {showReactions && (
            <ReactionPicker
              onSelect={(type: ReactionType) => toggleReaction(post.id, type)}
              onClose={() => setShowReactions(false)}
            />
          )}
        </div>
        <button
          onClick={() => setDetailOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted transition hover:bg-[var(--vex-surface-2)]"
        >
          <MessageCircle size={18} /> {post.comments.length || ''}
        </button>
        <button
          onClick={() => setShareOpen(true)}
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

      {showComments && (
        <div className="mt-3 space-y-3 border-t border-soft pt-3">
          {post.comments.map((c) => {
            const cu = getUserById(c.userId);
            if (!cu) return null;
            return (
              <div key={c.id} className="flex gap-2.5">
                <Avatar user={cu} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="rounded-2xl bg-[var(--vex-surface-2)] px-3 py-2">
                    <button onClick={() => navigate({ name: 'profile', userId: cu.id })} className="text-sm font-semibold text-strong hover:underline">
                      {fullName(cu)}
                    </button>
                    <p className="text-sm text-app">{c.text}</p>
                  </div>
                  <p className="mt-0.5 pl-3 text-xs text-muted">{timeAgo(c.createdAt)}</p>
                </div>
              </div>
            );
          })}
          <form onSubmit={submitComment} className="flex items-center gap-2">
            <Avatar user={currentUser} size={32} />
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escribe un comentario..."
              className="input flex-1 rounded-full"
            />
            <button type="submit" disabled={!comment.trim()} className="inline-flex h-9 w-9 items-center justify-center rounded-full gradient-brand text-white disabled:opacity-40">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <ShareModal post={post} open={shareOpen} onClose={() => setShareOpen(false)} />
      <EditPostModal post={post} open={editOpen} onClose={() => setEditOpen(false)} />
      {detailOpen && <PostDetailView post={post} onClose={() => setDetailOpen(false)} />}
      <ConfirmDialog
        open={deleteConfirm}
        title="¿Eliminar publicación?"
        message="¿Seguro que deseas eliminar esta publicación? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => { deletePost(post.id); setDeleteConfirm(false); }}
        onCancel={() => setDeleteConfirm(false)}
      />
    </article>
  );
}
