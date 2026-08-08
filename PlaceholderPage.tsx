import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { CreatePost } from '@/components/CreatePost';
import { PostCard } from '@/components/PostCard';
import { Avatar } from '@/components/Avatar';
import { fullName } from '@/lib/format';
import { isUserOnline, lastSeenLabel } from '@/lib/status';
import { TrendingUp, Sparkles, UserPlus, Bookmark, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Home() {
  const { visiblePosts, currentUser, users, toggleFollow, posts, getPresenceInfo, getConversation } = useApp();
  const { navigate } = useRouter();
  if (!currentUser) return null;

  const feed = visiblePosts();
  const savedCount = posts.filter((p) => p.savedBy.includes(currentUser.id)).length;

  // Prioritize real (non-seed) users first, then online, then newest, then mutual friends.
  const suggestions = users
    .filter((u) => u.id !== currentUser.id && !currentUser.following.includes(u.id))
    .map((u) => {
      const presence = getPresenceInfo(u.id);
      const online = isUserOnline(u, currentUser.id, presence);
      const mutual = u.followers.filter((f) => currentUser.following.includes(f)).length;
      return { u, real: !u.isSeed, online, mutual, createdAt: u.createdAt };
    })
    .sort((a, b) => {
      if (a.real !== b.real) return a.real ? -1 : 1;
      if (a.online !== b.online) return a.online ? -1 : 1;
      if (b.mutual !== a.mutual) return b.mutual - a.mutual;
      return b.createdAt - a.createdAt;
    })
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <CreatePost />

          {feed.length === 0 ? (
            <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Sparkles size={26} />
              </div>
              <h3 className="font-display text-lg font-bold text-strong">No hay más publicaciones todavía</h3>
              <p className="max-w-sm text-sm text-muted">Sé el primero en compartir algo. Escribe arriba y publica tu primer mensaje, o invita a tus amigos a unirse a Vexora para ver sus publicaciones aquí.</p>
              <button onClick={() => navigate({ name: 'search' })} className="btn-soft mt-2 px-4 py-2 text-sm">
                Busca personas para conectar
              </button>
            </div>
          ) : (
            feed.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-600" />
              <h3 className="font-display font-bold text-strong">Personas a las que seguir</h3>
            </div>
            <div className="mt-4 space-y-3">
              {suggestions.length === 0 ? (
                <p className="text-sm text-muted">Aún no hay más usuarios en Vexora. ¡Invita a tus amigos a unirse para conectar con ellos!</p>
              ) : (
                suggestions.map(({ u, real, online, mutual }) => {
                  const presence = getPresenceInfo(u.id);
                  const lastSeen = lastSeenLabel(u, currentUser.id, presence);
                  const connected = currentUser.following.includes(u.id) && u.followers.includes(currentUser.id);
                  return (
                    <div key={u.id} className="rounded-2xl border border-app bg-[var(--vex-surface-2)] p-3 transition hover:shadow-soft">
                      <div className="flex items-center gap-3">
                        <button onClick={() => navigate({ name: 'profile', userId: u.id })} className="relative">
                          <Avatar user={u} size={42} />
                          {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-[var(--vex-surface-2)]" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => navigate({ name: 'profile', userId: u.id })} className="block truncate text-sm font-semibold text-strong hover:underline">
                              {fullName(u)}
                            </button>
                            {!real && (
                              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                Demo
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted">@{u.username}</p>
                          <p className={cn('truncate text-xs', online ? 'font-medium text-green-600 dark:text-green-500' : 'text-muted')}>
                            {online ? '🟢 Activo ahora' : lastSeen || '⚫ Desconectado'}
                          </p>
                        </div>
                      </div>
                      {mutual > 0 && <p className="mt-2 text-xs text-muted">{mutual} amigo{mutual !== 1 ? 's' : ''} en común</p>}
                      <div className="mt-2 flex gap-2">
                        {connected ? (
                          <button
                            onClick={() => { void getConversation(u.id); navigate({ name: 'messages' }); }}
                            className="btn-soft flex-1 px-3 py-1.5 text-xs"
                          >
                            <MessageCircle size={14} /> Mensaje
                          </button>
                        ) : (
                          <button onClick={() => toggleFollow(u.id)} className="btn-primary flex-1 px-3 py-1.5 text-xs">
                            <UserPlus size={14} /> Conectar
                          </button>
                        )}
                        <button
                          onClick={() => navigate({ name: 'profile', userId: u.id })}
                          className="btn-ghost px-3 py-1.5 text-xs"
                        >
                          Ver perfil
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="gradient-brand p-5 text-white">
              <h3 className="font-display font-bold">Bienvenido a Vexora</h3>
              <p className="mt-1 text-sm text-white/80">Conecta con personas, comparte tus momentos y descubre nuevas ideas.</p>
            </div>
            <div className="p-5 text-sm text-muted">
              <p>Explora el buscador para encontrar usuarios y publicaciones, o entra a tus mensajes para chatear con tus contactos.</p>
            </div>
          </div>

          <button onClick={() => navigate({ name: 'saved' })} className="card flex w-full items-center gap-3 p-4 text-left transition hover:shadow-soft">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
              <Bookmark size={20} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-strong">Publicaciones guardadas</p>
              <p className="text-xs text-muted">{savedCount} guardada{savedCount !== 1 ? 's' : ''}</p>
            </div>
          </button>
        </aside>
      </div>
    </div>
  );
}
