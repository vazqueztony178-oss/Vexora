import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { fetchProfileById, profileToUser } from '@/lib/profiles';
import { Loader2, AlertCircle } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { PostCard } from '@/components/PostCard';
import { CreatePost } from '@/components/CreatePost';
import { ImageEditor } from '@/components/ImageEditor';
import { PhotoViewer } from '@/components/PhotoViewer';
import { PhotoMenu } from '@/components/PhotoMenu';
import { FollowingMenu } from '@/components/FollowingMenu';
import { Camera, Check, Pencil, UserPlus, UserCheck, Calendar, X, ImageIcon, Video, Grid3x3, Ban, BookMarked, FolderPlus, MapPin, Globe, Heart, Briefcase, GraduationCap, Star, Music, Gamepad2, Users as UsersIcon, Save, Trash2, Plus, Film, BookOpen } from 'lucide-react';
import { fullName, formatBirthDate, readFileAsDataURL, avatarGradient } from '@/lib/format';
import { cn } from '@/lib/cn';
import { privacyOption } from '@/lib/privacy';
import { safeExternalUrl } from '@/lib/url';
import type { User, ReportReason, AlbumVisibility, ProfileInfo } from '@/types';

type PhotoTarget = 'avatar' | 'cover';

export function Profile({ userId }: { userId?: string }) {
  const { currentUser, getUserById, posts, toggleFollow, updateProfile, getConversation, blockUser, isBlocked, reportUser, albums, createAlbum, deleteAlbum, updateProfileInfo } = useApp();
  const { navigate } = useRouter();

  const localUser = userId ? getUserById(userId) : currentUser;
  const [remoteUser, setRemoteUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => !!userId && !localUser);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setRemoteUser(null);
    setNotFound(false);
    if (!userId) { setLoading(false); return; }
    if (localUser) { setLoading(false); return; }
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const row = await fetchProfileById(userId);
        if (cancelled) return;
        if (row) {
          setRemoteUser(profileToUser(row));
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('[Profile] Failed to fetch profile:', err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, localUser]);

  const profileUser = localUser ?? remoteUser;
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<'publicaciones' | 'fotos' | 'videos' | 'albumes' | 'guardados'>('publicaciones');
  const [photoTarget, setPhotoTarget] = useState<PhotoTarget | null>(null);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ src: string; label: string } | null>(null);
  const [albumModal, setAlbumModal] = useState(false);
  const [infoModal, setInfoModal] = useState(false);

  if (!currentUser) return null;
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted">
          <Loader2 size={32} className="animate-spin" />
          <p className="text-sm">Cargando perfil...</p>
        </div>
      </div>
    );
  }
  if (notFound || !profileUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="card p-10">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-950/40">
            <AlertCircle size={26} />
          </div>
          <h2 className="font-display text-lg font-bold text-strong">Usuario no encontrado</h2>
          <p className="mt-2 text-sm text-muted">Este perfil no existe o ya no está disponible.</p>
          <button onClick={() => navigate({ name: 'search' })} className="btn-primary mt-5 px-5 py-2.5 text-sm">
            Volver a búsqueda
          </button>
        </div>
      </div>
    );
  }

  const isMe = profileUser.id === currentUser.id;
  const isFollowing = currentUser.following.includes(profileUser.id);
  const blocked = isBlocked(profileUser.id);
  const userPosts = posts.filter((p) => p.userId === profileUser.id && !blocked);
  const photos = userPosts.flatMap((p) => p.images);
  const videos = userPosts.flatMap((p) => p.videos);
  const userAlbums = albums.filter((a) => a.userId === profileUser.id);
  const mySavedPosts = isMe ? posts.filter((p) => p.savedBy.includes(currentUser.id)) : [];
  const info = profileUser.profileInfo ?? {};
  const pinnedPost = profileUser?.pinnedPostId ? userPosts.find((p) => p.id === profileUser.pinnedPostId) : null;

  const handleChangePhoto = async (file: File, target: PhotoTarget) => {
    const url = await readFileAsDataURL(file);
    setPendingSrc(url);
    setPhotoTarget(target);
  };

  const handleEditPhoto = (target: PhotoTarget) => {
    const src = target === 'avatar' ? profileUser.avatarUrl : profileUser.coverUrl;
    if (!src) return;
    setPendingSrc(src);
    setPhotoTarget(target);
  };

  const handleRemovePhoto = (target: PhotoTarget) => {
    updateProfile({ [target === 'avatar' ? 'avatarUrl' : 'coverUrl']: '' });
  };

  const handleEditorSave = (dataUrl: string) => {
    if (photoTarget === 'avatar') updateProfile({ avatarUrl: dataUrl });
    else if (photoTarget === 'cover') updateProfile({ coverUrl: dataUrl });
    setPhotoTarget(null);
    setPendingSrc(null);
  };

  const handleEditorCancel = () => {
    setPhotoTarget(null);
    setPendingSrc(null);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-10">
      <div className="card overflow-hidden">
        {/* Cover */}
        <div className="relative h-44 sm:h-56" style={{ background: profileUser.coverUrl ? undefined : avatarGradient(profileUser.username) }}>
          {profileUser.coverUrl && <img src={profileUser.coverUrl} alt="" className="h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          {isMe && (
            <div className="absolute right-4 top-4">
              <PhotoMenu
                hasImage={!!profileUser.coverUrl}
                onView={() => profileUser.coverUrl && setViewer({ src: profileUser.coverUrl, label: 'Portada' })}
                onChange={(file) => handleChangePhoto(file, 'cover')}
                onEdit={() => handleEditPhoto('cover')}
                onRemove={() => handleRemovePhoto('cover')}
                trigger={
                  <button className="inline-flex items-center gap-1.5 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/70">
                    <Camera size={14} /> Portada
                  </button>
                }
              />
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <div className="-mt-12 flex items-end justify-between">
            <div className="relative">
              <div className="rounded-full ring-4 ring-white">
                <Avatar user={profileUser} size={96} />
              </div>
              {isMe && (
                <div className="absolute bottom-1 right-1">
                  <PhotoMenu
                    hasImage={!!profileUser.avatarUrl}
                    onView={() => profileUser.avatarUrl && setViewer({ src: profileUser.avatarUrl, label: 'Foto de perfil' })}
                    onChange={(file) => handleChangePhoto(file, 'avatar')}
                    onEdit={() => handleEditPhoto('avatar')}
                    onRemove={() => handleRemovePhoto('avatar')}
                    align="left"
                    trigger={
                      <button className="inline-flex h-8 w-8 items-center justify-center rounded-full gradient-brand text-white shadow-soft transition hover:scale-105">
                        <Camera size={15} />
                      </button>
                    }
                  />
                </div>
              )}
            </div>

            <div className="mb-1 flex gap-2">
              {isMe ? (
                <button onClick={() => setEditing(true)} className="btn-ghost px-4 py-2 text-sm">
                  <Pencil size={15} /> Editar perfil
                </button>
              ) : blocked ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-app bg-[var(--vex-surface)] px-4 py-2 text-sm font-semibold text-muted">
                  <Ban size={15} /> Bloqueado
                </span>
              ) : isFollowing ? (
                <FollowingMenu
                  onMessage={() => { void getConversation(profileUser.id); navigate({ name: 'messages' }); }}
                  onViewFriendship={() => {}}
                  onUnfollow={() => toggleFollow(profileUser.id)}
                  onReport={(reason, explanation) => reportUser(profileUser.id, reason, explanation)}
                  onBlock={() => blockUser(profileUser.id)}
                />
              ) : (
                <button
                  onClick={() => toggleFollow(profileUser.id)}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  <UserPlus size={15} /> Seguir
                </button>
              )}
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display text-2xl font-bold text-strong">{fullName(profileUser)}</h1>
              {profileUser.verified && (
                <svg width="18" height="18" viewBox="0 0 24 24" className="text-brand-500" fill="currentColor"><path d="M12 1l2.5 2.5L18 3l1 3.5L22 8l-2 3 2 3-3 1.5L18 19l-3.5-.5L12 21l-2.5-2.5L6 19l-1-3.5L2 14l2-3-2-3 3-1.5L6 3l3.5.5L12 1z"/><path d="M9.5 12.5l1.8 1.8 3.7-3.7" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </div>
            <p className="text-sm text-muted">@{profileUser.username}</p>
            {profileUser.bio && <p className="mt-2 max-w-xl leading-relaxed text-app">{profileUser.bio}</p>}
            {profileUser.showBirthDate && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted">
                <Calendar size={14} /> Nació el {formatBirthDate(profileUser.birthDay, profileUser.birthMonth, profileUser.birthYear)}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm sm:gap-6">
            <div>
              <span className="font-bold text-strong">{profileUser.following.length}</span>{' '}
              <span className="text-muted">Siguiendo</span>
            </div>
            <div>
              <span className="font-bold text-strong">{profileUser.followers.length}</span>{' '}
              <span className="text-muted">Seguidores</span>
            </div>
            <div>
              <span className="font-bold text-strong">{userPosts.length}</span>{' '}
              <span className="text-muted">Publicaciones</span>
            </div>
            <div>
              <span className="font-bold text-strong">{photos.length}</span>{' '}
              <span className="text-muted">Fotos</span>
            </div>
            <div>
              <span className="font-bold text-strong">{videos.length}</span>{' '}
              <span className="text-muted">Videos</span>
            </div>
          </div>

          {/* Profile info chips */}
          {(info.city || info.country || info.work || info.education || info.relationship || info.interests || info.favoriteMusic || info.hobbies || info.gender || info.language || info.school || info.university || info.company || info.favoriteMovies || info.favoriteSeries || info.favoriteBooks || info.website) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {info.city && <InfoChip icon={MapPin} text={info.city} />}
              {info.country && <InfoChip icon={Globe} text={info.country} />}
              {info.language && <InfoChip icon={Globe} text={info.language} />}
              {info.gender && <InfoChip icon={UsersIcon} text={info.gender === 'male' ? 'Hombre' : info.gender === 'female' ? 'Mujer' : 'Otro'} />}
              {info.relationship && <InfoChip icon={Heart} text={info.relationship === 'single' ? 'Soltero' : info.relationship === 'in_relationship' ? 'En relación' : info.relationship === 'married' ? 'Casado' : 'Complicado'} />}
              {info.work && <InfoChip icon={Briefcase} text={info.work} />}
              {info.company && <InfoChip icon={Briefcase} text={info.company} />}
              {info.school && <InfoChip icon={GraduationCap} text={info.school} />}
              {info.university && <InfoChip icon={GraduationCap} text={info.university} />}
              {info.education && <InfoChip icon={GraduationCap} text={info.education} />}
              {info.interests && <InfoChip icon={Star} text={info.interests} />}
              {info.hobbies && <InfoChip icon={Gamepad2} text={info.hobbies} />}
              {info.favoriteMovies && <InfoChip icon={Film} text={info.favoriteMovies} />}
              {info.favoriteSeries && <InfoChip icon={Film} text={info.favoriteSeries} />}
              {info.favoriteMusic && <InfoChip icon={Music} text={info.favoriteMusic} />}
              {info.favoriteBooks && <InfoChip icon={BookOpen} text={info.favoriteBooks} />}
              {info.website && (() => {
                // Only link out to real web addresses; anything else (javascript:,
                // data:, ...) is shown as inert text so it cannot run on click.
                const href = safeExternalUrl(info.website);
                const chip = <InfoChip icon={Globe} text={info.website} />;
                return href ? <a href={href} target="_blank" rel="noopener noreferrer">{chip}</a> : chip;
              })()}
            </div>
          )}

          {isMe && (
            <button onClick={() => setInfoModal(true)} className="btn-ghost mt-3 px-3 py-1.5 text-xs">
              <Pencil size={13} /> Editar información
            </button>
          )}
        </div>
      </div>

      {/* Create post on own profile */}
      {isMe && (
        <div className="mt-5">
          <CreatePost />
        </div>
      )}

      {/* Tabs */}
      <div className="mt-5 flex gap-1 border-b border-app sm:gap-2">
        {([
          { key: 'publicaciones', label: 'Publicaciones', icon: Grid3x3 },
          { key: 'fotos', label: 'Fotos', icon: ImageIcon },
          { key: 'videos', label: 'Videos', icon: Video },
          { key: 'albumes', label: 'Álbumes', icon: BookMarked },
          ...(isMe ? [{ key: 'guardados' as const, label: 'Guardados', icon: Save }] : []),
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'relative inline-flex items-center gap-1.5 px-3 py-3 text-sm font-semibold capitalize transition sm:px-4',
              tab === t.key ? 'text-brand-600 dark:text-brand-400' : 'text-muted hover:text-strong',
            )}
          >
            <t.icon size={16} /> {t.label}
            {tab === t.key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full gradient-brand" />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-5 space-y-5">
        {tab === 'publicaciones' && (
          userPosts.length === 0 ? (
            <div className="card p-10 text-center text-muted">Aún no hay publicaciones.</div>
          ) : (
            userPosts.map((p) => <PostCard key={p.id} post={p} />)
          )
        )}

        {tab === 'fotos' && (
          photos.length === 0 ? (
            <div className="card p-10 text-center text-muted">No hay fotos todavía.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((src, i) => (
                <button key={i} onClick={() => setViewer({ src, label: 'Foto' })} className="group overflow-hidden rounded-xl">
                  <img src={src} alt="" className="h-44 w-full object-cover transition group-hover:scale-105" />
                </button>
              ))}
            </div>
          )
        )}

        {tab === 'videos' && (
          videos.length === 0 ? (
            <div className="card p-10 text-center text-muted">No hay videos todavía.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {videos.map((src, i) => (
                <div key={i} className="overflow-hidden rounded-xl">
                  <video src={src} controls className="h-56 w-full object-cover" />
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'albumes' && (
          <div>
            {isMe && (
              <button onClick={() => setAlbumModal(true)} className="btn-primary mb-4 px-4 py-2 text-sm">
                <FolderPlus size={16} /> Crear álbum
              </button>
            )}
            {userAlbums.length === 0 ? (
              <div className="card p-10 text-center text-muted">No hay álbumes todavía.</div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {userAlbums.map((album) => {
                  const ap = privacyOption(album.visibility as any);
                  return (
                    <div key={album.id} className="card group overflow-hidden">
                      <div className="relative h-40 overflow-hidden" style={{ background: album.coverUrl ? undefined : avatarGradient(album.name) }}>
                        {album.coverUrl && <img src={album.coverUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />}
                        <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur">
                          <ap.icon size={12} /> {ap.short}
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="truncate font-semibold text-strong">{album.name}</h3>
                        {album.description && <p className="truncate text-xs text-muted">{album.description}</p>}
                        <p className="mt-1 text-xs text-muted">{album.postIds.length} fotos</p>
                        {isMe && (
                          <button onClick={() => deleteAlbum(album.id)} className="mt-2 inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600">
                            <Trash2 size={12} /> Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'guardados' && isMe && (
          mySavedPosts.length === 0 ? (
            <div className="card p-10 text-center text-muted">No hay publicaciones guardadas.</div>
          ) : (
            mySavedPosts.map((p) => <PostCard key={p.id} post={p} />)
          )
        )}
      </div>

      {editing && (
        <EditProfileModal
          user={profileUser}
          onClose={() => setEditing(false)}
          onSave={(patch) => { updateProfile(patch); setEditing(false); }}
        />
      )}

      {photoTarget && pendingSrc && (
        <ImageEditor
          src={pendingSrc}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
          aspectRatio={photoTarget === 'avatar' ? 'square' : 'cover'}
          title={photoTarget === 'avatar' ? 'Editor de foto de perfil' : 'Editor de portada'}
        />
      )}

      <PhotoViewer
        src={viewer?.src ?? ''}
        open={!!viewer}
        label={viewer?.label}
        onClose={() => setViewer(null)}
      />

      {albumModal && (
        <CreateAlbumModal onClose={() => setAlbumModal(false)} onCreate={(name, desc, vis, cover) => { createAlbum(name, desc, vis, cover); setAlbumModal(false); }} photos={photos} />
      )}
      {infoModal && (
        <ProfileInfoModal info={info} onClose={() => setInfoModal(false)} onSave={(patch) => { updateProfileInfo(patch); setInfoModal(false); }} />
      )}
    </div>
  );
}

function InfoChip({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-app bg-[var(--vex-surface-2)] px-3 py-1 text-xs text-app">
      <Icon size={13} className="text-muted" /> {text}
    </span>
  );
}

function CreateAlbumModal({ onClose, onCreate, photos }: { onClose: () => void; onCreate: (name: string, desc: string, vis: AlbumVisibility, cover?: string) => void; photos: string[] }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [vis, setVis] = useState<AlbumVisibility>('public');
  const [cover, setCover] = useState<string | undefined>(undefined);
  const visOpts: { v: AlbumVisibility; label: string }[] = [
    { v: 'public', label: 'Público' },
    { v: 'friends', label: 'Amigos' },
    { v: 'private', label: 'Privado' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vex-overlay)] p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md animate-scale-in rounded-2xl border border-app bg-[var(--vex-surface)] p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-strong">Crear álbum</h2>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-[var(--vex-surface-2)]"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Vacaciones, Familia..." />
          </div>
          <div>
            <label className="label">Descripción (opcional)</label>
            <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Breve descripción del álbum" />
          </div>
          <div>
            <label className="label">Privacidad</label>
            <div className="flex gap-2">
              {visOpts.map((o) => (
                <button key={o.v} onClick={() => setVis(o.v)} className={cn('flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition', vis === o.v ? 'gradient-brand border-transparent text-white' : 'border-app text-muted hover:bg-[var(--vex-surface-2)]')}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {photos.length > 0 && (
            <div>
              <label className="label">Portada (opcional)</label>
              <div className="grid grid-cols-4 gap-2">
                {photos.slice(0, 8).map((src, i) => (
                  <button key={i} onClick={() => setCover(src)} className={cn('overflow-hidden rounded-lg border-2 transition', cover === src ? 'border-brand-500' : 'border-transparent')}>
                    <img src={src} alt="" className="h-16 w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button onClick={() => name.trim() && onCreate(name, desc, vis, cover)} disabled={!name.trim()} className="btn-primary mt-5 w-full py-3">
          <Check size={18} /> Crear álbum
        </button>
      </div>
    </div>
  );
}

function ProfileInfoModal({ info, onClose, onSave }: { info: ProfileInfo; onClose: () => void; onSave: (patch: Partial<ProfileInfo>) => void }) {
  const [form, setForm] = useState<ProfileInfo>(info);
  const set = (k: keyof ProfileInfo, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const fields: { key: keyof ProfileInfo; label: string; icon: typeof MapPin; type?: 'text' | 'select'; options?: { value: string; label: string }[] }[] = [
    { key: 'city', label: 'Ciudad', icon: MapPin },
    { key: 'country', label: 'País', icon: Globe },
    { key: 'language', label: 'Idioma', icon: Globe },
    { key: 'gender', label: 'Género', icon: UsersIcon, type: 'select', options: [{ value: '', label: 'Sin especificar' }, { value: 'male', label: 'Hombre' }, { value: 'female', label: 'Mujer' }, { value: 'other', label: 'Otro' }] },
    { key: 'relationship', label: 'Estado sentimental', icon: Heart, type: 'select', options: [{ value: '', label: 'Sin especificar' }, { value: 'single', label: 'Soltero' }, { value: 'in_relationship', label: 'En relación' }, { value: 'married', label: 'Casado' }, { value: 'complicated', label: 'Complicado' }] },
    { key: 'work', label: 'Trabajo', icon: Briefcase },
    { key: 'company', label: 'Empresa', icon: Briefcase },
    { key: 'school', label: 'Escuela', icon: GraduationCap },
    { key: 'university', label: 'Universidad', icon: GraduationCap },
    { key: 'education', label: 'Estudios', icon: GraduationCap },
    { key: 'interests', label: 'Intereses', icon: Star },
    { key: 'hobbies', label: 'Pasatiempos', icon: Gamepad2 },
    { key: 'favoriteMovies', label: 'Películas favoritas', icon: Film },
    { key: 'favoriteSeries', label: 'Series favoritas', icon: Film },
    { key: 'favoriteMusic', label: 'Música favorita', icon: Music },
    { key: 'favoriteBooks', label: 'Libros favoritos', icon: BookOpen },
    { key: 'website', label: 'Sitio web', icon: Globe },
    { key: 'family', label: 'Familia', icon: UsersIcon },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vex-overlay)] p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col animate-scale-in rounded-2xl border border-app bg-[var(--vex-surface)] shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-app p-5">
          <h2 className="font-display text-lg font-bold text-strong">Información del perfil</h2>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-[var(--vex-surface-2)]"><X size={18} /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="label flex items-center gap-1.5"><f.icon size={14} className="text-muted" /> {f.label}</label>
              {f.type === 'select' ? (
                <select className="input" value={form[f.key] as string ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input className="input" value={form[f.key] as string ?? ''} onChange={(e) => set(f.key, e.target.value)} placeholder={f.label} />
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-app p-5">
          <button onClick={() => onSave(form)} className="btn-primary w-full py-3"><Check size={18} /> Guardar información</button>
        </div>
      </div>
    </div>
  );
}

function EditProfileModal({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (patch: Partial<User>) => void }) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [bio, setBio] = useState(user.bio);
  const [showBirthDate, setShowBirthDate] = useState(user.showBirthDate ?? true);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--vex-overlay)] p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md animate-slide-up rounded-t-3xl border border-app bg-[var(--vex-surface)] p-6 shadow-card sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-strong">Editar perfil</h2>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-[var(--vex-surface-2)]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="label">Apellidos</label>
              <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Biografía</label>
            <textarea className="input min-h-24 resize-none" maxLength={180} placeholder="Cuéntale al mundo algo sobre ti..." value={bio} onChange={(e) => setBio(e.target.value)} />
            <p className="mt-1 text-right text-xs text-muted">{bio.length}/180</p>
          </div>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-app p-3">
            <div>
              <p className="text-sm font-semibold text-strong">Mostrar fecha de nacimiento</p>
              <p className="text-xs text-muted">Si está activado, otros usuarios pueden verla</p>
            </div>
            <button
              type="button"
              onClick={() => setShowBirthDate((v) => !v)}
              className={cn('relative h-6 w-11 rounded-full transition', showBirthDate ? 'gradient-brand' : 'bg-[var(--vex-border)]')}
            >
              <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', showBirthDate ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </label>
        </div>

        <button
          onClick={() => onSave({ firstName, lastName, bio, showBirthDate })}
          className="btn-primary mt-5 w-full py-3"
        >
          <Check size={18} /> Guardar cambios
        </button>
      </div>
    </div>
  );
}
