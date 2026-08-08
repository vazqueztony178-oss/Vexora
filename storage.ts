import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { Bookmark, ArrowLeft } from 'lucide-react';
import { PostCard } from '@/components/PostCard';

export function SavedPosts() {
  const { currentUser, posts } = useApp();
  const { navigate } = useRouter();
  if (!currentUser) return null;

  const saved = posts.filter((p) => p.savedBy.includes(currentUser.id));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate({ name: 'home' })} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-app text-muted hover:bg-[var(--vex-surface-2)]">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Bookmark size={22} className="text-brand-600 dark:text-brand-400" />
          <h1 className="font-display text-2xl font-bold text-strong">Publicaciones guardadas</h1>
        </div>
      </div>

      {saved.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <Bookmark size={40} className="text-muted" />
          <h3 className="font-display text-lg font-bold text-strong">No hay publicaciones guardadas</h3>
          <p className="max-w-sm text-sm text-muted">
            Cuando guardes una publicación, aparecerá aquí para que la encuentres fácilmente.
          </p>
          <button onClick={() => navigate({ name: 'home' })} className="btn-primary mt-2 px-5 py-2 text-sm">
            Explorar publicaciones
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {saved.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
