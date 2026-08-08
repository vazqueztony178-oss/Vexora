import { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/Avatar';
import { ImagePlus, Video, X, Save, ArrowLeft, ArrowRight, Trash2, Crop } from 'lucide-react';
import { fullName } from '@/lib/format';
import { readFileAsDataURL } from '@/lib/format';
import { cn } from '@/lib/cn';
import { ImageEditor } from '@/components/ImageEditor';
import { PrivacySelector } from '@/components/PrivacySelector';
import type { Post, PostVisibility } from '@/types';

interface EditPostModalProps {
  post: Post;
  open: boolean;
  onClose: () => void;
}

export function EditPostModal({ post, open, onClose }: EditPostModalProps) {
  const { currentUser, updatePost } = useApp();
  const [text, setText] = useState(post.text);
  const [images, setImages] = useState<string[]>(post.images);
  const [videos, setVideos] = useState<string[]>(post.videos);
  const [visibility, setVisibility] = useState<PostVisibility>(post.visibility);
  const [exceptIds, setExceptIds] = useState<string[]>(post.exceptUserIds);
  const [allowedIds, setAllowedIds] = useState<string[]>(post.allowedUserIds);
  const [editingImage, setEditingImage] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  if (!open || !currentUser) return null;

  const addImages = async (files: FileList | null) => {
    if (!files) return;
    const next = [...images];
    for (const file of Array.from(files)) {
      if (next.length >= 4) break;
      const url = await readFileAsDataURL(file);
      next.push(url);
    }
    setImages(next);
  };

  const addVideos = async (files: FileList | null) => {
    if (!files) return;
    const next = [...videos];
    for (const file of Array.from(files)) {
      if (next.length >= 2) break;
      const url = await readFileAsDataURL(file);
      next.push(url);
    }
    setVideos(next);
  };

  const removeImage = (i: number) => setImages((prev) => prev.filter((_, idx) => idx !== i));
  const moveImage = (i: number, dir: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const removeVideo = (i: number) => setVideos((prev) => prev.filter((_, idx) => idx !== i));

  const onImageEdited = (dataUrl: string) => {
    if (editingImage !== null) {
      setImages((prev) => prev.map((img, i) => (i === editingImage ? dataUrl : img)));
    }
    setEditingImage(null);
  };

  const save = () => {
    updatePost(post.id, { text: text.trim(), images, videos, visibility, exceptUserIds: exceptIds, allowedUserIds: allowedIds });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[55] flex items-center justify-center bg-[var(--vex-overlay)] p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-app bg-[var(--vex-surface)] shadow-card" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-soft p-4">
            <h2 className="font-display text-lg font-bold text-strong">Editar publicación</h2>
            <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-[var(--vex-surface-2)]">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex gap-3">
              <Avatar user={currentUser} size={44} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-strong">{fullName(currentUser)}</span>
                  <PrivacySelector
                    value={visibility}
                    exceptUserIds={exceptIds}
                    allowedUserIds={allowedIds}
                    onChange={(v, ex, al) => { setVisibility(v); setExceptIds(ex); setAllowedIds(al); }}
                  />
                </div>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  placeholder="¿Qué estás pensando?"
                  className="input mt-2 border-transparent bg-[var(--vex-surface-2)] focus:border-brand-400"
                />
              </div>
            </div>

            {images.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Fotos · arrastra para reordenar</p>
                <div className="grid grid-cols-2 gap-2">
                  {images.map((src, i) => (
                    <div key={i} className="group relative overflow-hidden rounded-xl">
                      <img src={src} alt="" className="h-36 w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 opacity-0 transition group-hover:opacity-100">
                        <button onClick={() => setEditingImage(i)} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-brand-600" title="Editar">
                          <Crop size={15} />
                        </button>
                        <button onClick={() => moveImage(i, -1)} disabled={i === 0} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 disabled:opacity-40" title="Mover izquierda">
                          <ArrowLeft size={15} />
                        </button>
                        <button onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 disabled:opacity-40" title="Mover derecha">
                          <ArrowRight size={15} />
                        </button>
                        <button onClick={() => removeImage(i)} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600" title="Eliminar">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {videos.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Videos</p>
                <div className="grid grid-cols-2 gap-2">
                  {videos.map((src, i) => (
                    <div key={i} className="group relative overflow-hidden rounded-xl">
                      <video src={src} className="h-36 w-full object-cover" controls />
                      <button onClick={() => removeVideo(i)} className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-100 transition hover:bg-black/80">
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
              <input ref={videoRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => addVideos(e.target.files)} />
              <button onClick={() => fileRef.current?.click()} className="btn-ghost px-3 py-2 text-sm">
                <ImagePlus size={16} /> Agregar foto
              </button>
              <button onClick={() => videoRef.current?.click()} className="btn-ghost px-3 py-2 text-sm">
                <Video size={16} /> Agregar video
              </button>
              <span className="ml-auto text-xs text-muted">{images.length}/4 fotos · {videos.length}/2 videos</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-soft p-4">
            <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancelar</button>
            <button onClick={save} disabled={!text.trim() && images.length === 0 && videos.length === 0} className="btn-primary px-5 py-2 text-sm">
              <Save size={16} /> Guardar cambios
            </button>
          </div>
        </div>
      </div>

      {editingImage !== null && (
        <ImageEditor
          src={images[editingImage]}
          onSave={onImageEdited}
          onCancel={() => setEditingImage(null)}
        />
      )}
    </>
  );
}
