import { useState, useRef, type FormEvent } from 'react';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/Avatar';
import { ImagePlus, Video, X, Send, Crop } from 'lucide-react';
import { readFileAsDataURL } from '@/lib/format';
import { cn } from '@/lib/cn';
import { ImageEditor } from '@/components/ImageEditor';
import { PrivacySelector } from '@/components/PrivacySelector';
import type { PostVisibility } from '@/types';

export function CreatePost() {
  const { currentUser, createPost, preferences } = useApp();
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const [editingImage, setEditingImage] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<PostVisibility>(preferences.privacy.defaultPostVisibility);
  const [exceptIds, setExceptIds] = useState<string[]>([]);
  const [allowedIds, setAllowedIds] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<string[]>([]);

  if (!currentUser) return null;

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
  const removeVideo = (i: number) => setVideos((prev) => prev.filter((_, idx) => idx !== i));

  const editImage = (i: number) => {
    setEditingImage(i);
  };

  const onImageEdited = (dataUrl: string) => {
    if (editingImage !== null) {
      setImages((prev) => prev.map((img, i) => (i === editingImage ? dataUrl : img)));
    }
    setEditingImage(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() && images.length === 0 && videos.length === 0) return;
    createPost(text, images, videos, visibility, exceptIds, allowedIds);
    setText('');
    setImages([]);
    setVideos([]);
    setVisibility(preferences.privacy.defaultPostVisibility);
    setExceptIds([]);
    setAllowedIds([]);
    setFocused(false);
  };

  return (
    <div className="card p-4">
      <div className="flex gap-3">
        <Avatar user={currentUser} size={44} />
        <form className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            rows={focused ? 3 : 1}
            placeholder={`¿Qué estás pensando, ${currentUser.firstName}?`}
            className="input border-transparent bg-[var(--vex-surface-2)] focus:border-brand-400"
          />

          {images.length > 0 && (
            <div className={cn('mt-3 grid gap-2', images.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
              {images.map((src, i) => (
                <div key={i} className="group relative overflow-hidden rounded-xl">
                  <img src={src} alt="" className="h-40 w-full object-cover" />
                  <div className="absolute right-2 top-2 flex gap-1.5">
                    <button type="button" onClick={() => editImage(i)} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80" title="Editar">
                      <Crop size={14} />
                    </button>
                    <button type="button" onClick={() => removeImage(i)} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80" title="Quitar">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {videos.length > 0 && (
            <div className={cn('mt-3 grid gap-2', videos.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
              {videos.map((src, i) => (
                <div key={i} className="group relative overflow-hidden rounded-xl">
                  <video src={src} className="h-40 w-full object-cover" controls />
                  <button type="button" onClick={() => removeVideo(i)} className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {(focused || text || images.length > 0 || videos.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-soft pt-3">
              <div className="flex items-center gap-1">
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
                <input ref={videoRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => addVideos(e.target.files)} />
                <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40">
                  <ImagePlus size={18} /> Foto
                </button>
                <button type="button" onClick={() => videoRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-grape-500 transition hover:bg-grape-50 dark:hover:bg-grape-950/40">
                  <Video size={18} /> Video
                </button>
                <PrivacySelector
                  value={visibility}
                  exceptUserIds={exceptIds}
                  allowedUserIds={allowedIds}
                  onChange={(v, ex, al) => { setVisibility(v); setExceptIds(ex); setAllowedIds(al); }}
                />
                <span className="text-xs text-muted">{images.length}/4 · {videos.length}/2</span>
              </div>
              <button type="submit" onClick={submit} disabled={!text.trim() && images.length === 0 && videos.length === 0} className="btn-primary px-5 py-2 text-sm">
                <Send size={16} /> Publicar
              </button>
            </div>
          )}
        </form>
      </div>

      {editingImage !== null && (
        <ImageEditor
          src={images[editingImage]}
          onSave={onImageEdited}
          onCancel={() => setEditingImage(null)}
        />
      )}
    </div>
  );
}
