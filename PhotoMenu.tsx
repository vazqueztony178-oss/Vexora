import { useState, useEffect, useRef } from 'react';
import {
  X, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  Pencil, Trash2, Link as LinkIcon, Flag, ZoomIn, ZoomOut, Maximize2,
  Calendar, User as UserIcon, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatFullDate, timeAgo, fullName } from '@/lib/format';
import type { Post, User } from '@/types';

interface PhotoViewerProps {
  src: string;
  open: boolean;
  onClose: () => void;
  label?: string;
  post?: Post;
  author?: User;
  liked?: boolean;
  saved?: boolean;
  onLike?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onComment?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
}

export function PhotoViewer({
  src, open, onClose, label, post, author,
  liked, saved, onLike, onSave, onShare, onComment, onEdit, onDelete, onReport,
}: PhotoViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fullScreen, setFullScreen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (fullScreen) setFullScreen(false); else onClose(); }
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(4, z + 0.5));
      if (e.key === '-') setZoom((z) => Math.max(1, z - 0.5));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, fullScreen]);

  useEffect(() => { if (!open) { setZoom(1); setPan({ x: 0, y: 0 }); setFullScreen(false); } }, [open]);

  if (!open) return null;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(src).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const moreItems = [
    ...(onEdit ? [{ icon: Pencil, label: 'Editar', onClick: () => { onEdit(); onClose(); } }] : []),
    ...(onDelete ? [{ icon: Trash2, label: 'Eliminar', onClick: () => { onDelete(); onClose(); }, danger: true }] : []),
    { icon: LinkIcon, label: copied ? 'Enlace copiado' : 'Copiar enlace', onClick: handleCopyLink },
    ...(onReport ? [{ icon: Flag, label: 'Reportar', onClick: () => { onReport(); onClose(); }, danger: true }] : []),
  ];

  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-black/95 backdrop-blur-md" onClick={onClose} ref={ref}>
      {/* Top bar */}
      <div className="flex items-center gap-3 p-4" onClick={(e) => e.stopPropagation()}>
        {author && (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
              {author.avatarUrl ? (
                <img src={author.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-white">{author.firstName[0]}{author.lastName[0]}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{fullName(author)}</p>
              {post && <p className="truncate text-xs text-white/60">{formatFullDate(post.createdAt)}</p>}
            </div>
          </div>
        )}
        {!author && label && <span className="flex-1 truncate text-sm font-semibold text-white/80">{label}</span>}
        <button onClick={onClose} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
          <X size={22} />
        </button>
      </div>

      {/* Image area */}
      <div className="flex flex-1 items-center justify-center overflow-hidden px-4" onClick={(e) => e.stopPropagation()}>
        <img
          src={src}
          alt=""
          className="max-h-full max-w-full rounded-xl object-contain transition-transform duration-200"
          style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, cursor: zoom > 1 ? 'grab' : 'pointer' }}
          onClick={() => setFullScreen(true)}
          draggable={false}
        />
      </div>

      {/* Metadata */}
      {post && (
        <div className="mx-auto max-w-2xl px-4 pb-2" onClick={(e) => e.stopPropagation()}>
          {(post.text || post.createdAt) && (
            <div className="rounded-xl bg-white/5 p-3 backdrop-blur">
              {post.text && <p className="mb-2 text-sm leading-relaxed text-white/90">{post.text}</p>}
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
                <span className="inline-flex items-center gap-1"><Calendar size={12} /> {formatFullDate(post.createdAt)}</span>
                {author && <span className="inline-flex items-center gap-1"><UserIcon size={12} /> @{author.username}</span>}
                <span>{timeAgo(post.createdAt)}</span>
                {post.views != null && post.views > 0 && <span>{post.views} vistas</span>}
                {post.shares > 0 && <span>{post.shares} compartidos</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-2 px-4 pb-2" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
          <ZoomOut size={18} />
        </button>
        <span className="min-w-12 text-center text-xs font-semibold text-white/70">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(4, z + 0.5))} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
          <ZoomIn size={18} />
        </button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setFullScreen(true); }} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
          <Maximize2 size={17} />
        </button>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 px-4 py-3" onClick={(e) => e.stopPropagation()}>
        {onLike && (
          <button onClick={onLike} className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition', liked ? 'text-red-500' : 'text-white/70 hover:bg-white/10')}>
            <Heart size={20} className={cn(liked && 'fill-current')} /> Reacciones
          </button>
        )}
        {onComment && (
          <button onClick={onComment} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10">
            <MessageCircle size={20} /> Comentarios
          </button>
        )}
        {onShare && (
          <button onClick={onShare} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10">
            <Share2 size={20} /> Compartir
          </button>
        )}
        {onSave && (
          <button onClick={onSave} className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition', saved ? 'text-brand-400' : 'text-white/70 hover:bg-white/10')}>
            <Bookmark size={20} className={cn(saved && 'fill-current')} /> Guardar
          </button>
        )}
        <div className="relative ml-auto">
          <button onClick={() => setShowMore((v) => !v)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10">
            <MoreHorizontal size={22} />
          </button>
          {showMore && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMore(false)} />
              <div className="absolute bottom-12 right-0 z-20 w-48 animate-scale-in overflow-hidden rounded-xl border border-white/10 bg-[var(--vex-surface)] py-1 shadow-card">
                {moreItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { item.onClick(); setShowMore(false); }}
                    className={cn('flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition hover:bg-[var(--vex-surface-2)]', item.danger ? 'text-red-500' : 'text-app')}
                  >
                    <item.icon size={16} /> {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full-screen zoom view */}
      {fullScreen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black" onClick={() => setFullScreen(false)}>
          <img
            src={src}
            alt=""
            className="max-h-[95vh] max-w-full object-contain"
            style={{ transform: `scale(${zoom})` }}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/20">
              <ZoomOut size={18} />
            </button>
            <span className="px-2 text-sm text-white">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(4, z + 0.5))} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/20">
              <ZoomIn size={18} />
            </button>
            <button onClick={() => setFullScreen(false)} className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/20">
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
