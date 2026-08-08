import { useRouter, type Route } from '@/context/RouterContext';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import { Logo, Wordmark } from '@/components/Logo';
import { Avatar } from '@/components/Avatar';
import {
  Home, Search, MessageCircle, Bell, User, Settings, LogOut, Menu, Bookmark,
  Compass, Users as UsersIcon, ImageIcon, Video as VideoIcon, BookOpen,
  GraduationCap, Bot, Newspaper, Palette, Youtube, Star, Film, Gamepad2,
  ShoppingBag, Music, X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useState } from 'react';

interface NavItem {
  name: string;
  route: Route;
  icon: typeof Home;
  label: string;
}

const NAV: NavItem[] = [
  { name: 'home', route: { name: 'home' }, icon: Home, label: 'Inicio' },
  { name: 'search', route: { name: 'search' }, icon: Search, label: 'Buscar' },
  { name: 'messages', route: { name: 'messages' }, icon: MessageCircle, label: 'Mensajes' },
  { name: 'notifications', route: { name: 'notifications' }, icon: Bell, label: 'Notificaciones' },
  { name: 'saved', route: { name: 'saved' }, icon: Bookmark, label: 'Guardados' },
  { name: 'profile', route: { name: 'profile' }, icon: User, label: 'Perfil' },
  { name: 'settings', route: { name: 'settings' }, icon: Settings, label: 'Configuración' },
];

interface SideItem {
  route?: Route;
  icon: typeof Home;
  label: string;
  external?: boolean;
  url?: string;
}

const SIDE_SECTIONS: Array<{ title: string; items: SideItem[] }> = [
  {
    title: 'Principal',
    items: [
      { route: { name: 'home' }, icon: Home, label: 'Inicio' },
      { route: { name: 'profile' }, icon: User, label: 'Mi perfil' },
      { route: { name: 'explore' }, icon: Compass, label: 'Explorar' },
      { route: { name: 'friends' }, icon: UsersIcon, label: 'Amigos' },
      { route: { name: 'photos' }, icon: ImageIcon, label: 'Fotos' },
      { route: { name: 'videos' }, icon: VideoIcon, label: 'Videos' },
      { route: { name: 'stories' }, icon: BookOpen, label: 'Historias' },
    ],
  },
  {
    title: 'Contenido',
    items: [
      { icon: GraduationCap, label: 'Educación', external: true, url: 'https://www.khanacademy.org' },
      { icon: Bot, label: 'ChatAI', external: true, url: 'https://chat.openai.com' },
      { icon: Newspaper, label: 'Noticias', external: true, url: 'https://news.google.com' },
      { icon: Palette, label: 'Dibujar', external: true, url: 'https://excalidraw.com' },
      { icon: Youtube, label: 'YouTube', external: true, url: 'https://www.youtube.com' },
      { icon: Star, label: 'Personajes', external: true, url: 'https://en.wikipedia.org/wiki/List_of_fictional_characters' },
      { icon: Film, label: 'Famosos', external: true, url: 'https://www.imdb.com' },
      { icon: Gamepad2, label: 'Juegos', external: true, url: 'https://www.crazygames.com' },
      { icon: ShoppingBag, label: 'Mercado', external: true, url: 'https://www.amazon.com' },
      { icon: Music, label: 'Música', external: true, url: 'https://open.spotify.com' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { route: { name: 'settings' }, icon: Settings, label: 'Configuración' },
    ],
  },
];

export function TopBar() {
  const { route, navigate } = useRouter();
  const { currentUser, logout, unreadNotificationCount, totalUnreadMessages } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const unread = unreadNotificationCount;
  const unreadMsgs = totalUnreadMessages();

  const go = (r: Route) => { navigate(r); setMenuOpen(false); setSideOpen(false); };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-app bg-[var(--vex-surface)]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <button onClick={() => navigate({ name: 'home' })} className="vex-logo-hover flex shrink-0 items-center gap-2.5">
            <Logo size={40} />
            <Wordmark className="hidden text-xl sm:block" />
          </button>

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = route.name === item.name;
              const badgeCount = item.name === 'notifications' ? unread : item.name === 'messages' ? unreadMsgs : 0;
              const showBadge = badgeCount > 0;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.route)}
                  title={item.label}
                  className={cn(
                    'relative inline-flex h-11 w-11 items-center justify-center rounded-xl transition',
                    active
                      ? 'gradient-brand text-white shadow-soft'
                      : 'text-muted hover:bg-[var(--vex-surface-2)] hover:text-strong',
                  )}
                >
                  <item.icon size={21} />
                  {showBadge && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-3">
            <button
              onClick={() => navigate({ name: 'profile' })}
              className="hidden items-center gap-2 rounded-full border border-app py-1 pl-1 pr-3 transition hover:bg-[var(--vex-surface-2)] sm:flex"
            >
              {currentUser && <Avatar user={currentUser} size={32} />}
              <span className="text-sm font-semibold text-strong">@{currentUser?.username}</span>
            </button>

            <button onClick={() => setSideOpen(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-app transition hover:bg-[var(--vex-surface-2)]" title="Menú">
              <Menu size={22} />
            </button>

            <div className="relative md:hidden">
              <button onClick={() => setMenuOpen((o) => !o)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-app hover:bg-[var(--vex-surface-2)]" title="Más">
                <Compass size={22} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-app bg-[var(--vex-surface)] p-2 shadow-card">
                    {NAV.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => go(item.route)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                          route.name === item.name
                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                            : 'text-app hover:bg-[var(--vex-surface-2)]',
                        )}
                      >
                        <item.icon size={18} /> {item.label}
                        {item.name === 'notifications' && unread > 0 && (
                          <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span>
                        )}
                        {item.name === 'messages' && unreadMsgs > 0 && (
                          <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadMsgs > 99 ? '99+' : unreadMsgs}</span>
                        )}
                      </button>
                    ))}
                    <div className="my-1 border-t border-soft" />
                    <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
                      <LogOut size={18} /> Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>

            <button onClick={logout} title="Cerrar sesión" className="hidden h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-red-50 hover:text-red-600 md:inline-flex dark:hover:bg-red-950/40">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Slide-in side menu */}
      {sideOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-[var(--vex-overlay)] backdrop-blur-sm animate-fade-up" onClick={() => setSideOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col border-r border-app bg-[var(--vex-surface)] shadow-card animate-slide-in">
            <div className="flex items-center justify-between border-b border-soft p-4">
              <div className="flex items-center gap-2">
                <Logo size={32} />
                <Wordmark className="text-lg" />
              </div>
              <button onClick={() => setSideOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-[var(--vex-surface-2)]">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {SIDE_SECTIONS.map((section) => (
                <div key={section.title} className="mb-4">
                  <p className="mb-1 px-3 text-xs font-bold uppercase tracking-wide text-muted">{section.title}</p>
                  {section.items.map((item) => {
                    const active = item.route && route.name === item.route.name;
                    if (item.external && item.url) {
                      return (
                        <a
                          key={item.label}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setSideOpen(false)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-app transition hover:bg-[var(--vex-surface-2)]"
                        >
                          <item.icon size={18} className="text-muted" /> {item.label}
                        </a>
                      );
                    }
                    return (
                      <button
                        key={item.label}
                        onClick={() => item.route && go(item.route)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                          active ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'text-app hover:bg-[var(--vex-surface-2)]',
                        )}
                      >
                        <item.icon size={18} className={active ? '' : 'text-muted'} /> {item.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="border-t border-soft p-3">
              <button onClick={() => { logout(); setSideOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
                <LogOut size={18} /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
