import { useState } from 'react';
import { useRouter } from '@/context/RouterContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/cn';
import { Logo, Wordmark } from '@/components/Logo';
import {
  Sparkles, MessageCircle, Users, Globe, Home as HomeIcon, Compass, UsersRound, CalendarDays,
  Heart, MessageSquare, Share2, Bookmark, Moon, Sun, Menu, X,
} from 'lucide-react';

const HERO_PHOTO = 'https://images.pexels.com/photos/32132398/pexels-photo-32132398.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

const NAV = [
  { label: 'Inicio', icon: HomeIcon },
  { label: 'Explorar', icon: Compass },
  { label: 'Comunidad', icon: UsersRound },
  { label: 'Eventos', icon: CalendarDays },
];

const FEATURES = [
  { icon: MessageCircle, title: 'Comparte momentos', desc: 'Publica fotos, textos e ideas con las personas que más te importan.' },
  { icon: Users, title: 'Conecta con amigos', desc: 'Sigue perfiles, chatea en tiempo real y mantente cerca de todos.' },
  { icon: Globe, title: 'Descubre personas', desc: 'Explora una comunidad vibrante y encuentra nuevas aficiones.' },
];

export function Welcome() {
  const { navigate } = useRouter();
  const { resolved, toggle } = useTheme();
  const [mobileNav, setMobileNav] = useState(false);

  const dark = resolved === 'dark';

  return (
    <div className={cn('relative min-h-screen overflow-x-hidden', dark ? 'vex-dark-gradient text-white' : 'vex-light-gradient text-slate-800')}>
      <Starfield dark={dark} />

      {/* Header */}
      <header className={cn('sticky top-0 z-40 border-b backdrop-blur-xl transition-colors', dark ? 'border-white/10 bg-[#030712]/70' : 'border-slate-200 bg-white/80')}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <a href="#inicio" aria-label="Vexora, volver al inicio" className="vex-logo-hover group flex items-center gap-2.5">
            <Logo size={40} />
            <Wordmark className="text-2xl" />
          </a>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item, i) => (
              <button
                key={item.label}
                onClick={() => i === 0 && navigate({ name: 'login' })}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
                  dark ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <item.icon size={16} /> {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              aria-label="Cambiar tema"
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-xl border transition',
                dark ? 'border-white/10 text-slate-300 hover:bg-white/5 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100',
              )}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => navigate({ name: 'login' })}
              className={cn(
                'hidden rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:inline-flex',
                dark ? 'text-slate-200 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-100',
              )}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => navigate({ name: 'register' })}
              className="vex-gradient-bg vex-glow-btn inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
            >
              Crear cuenta
            </button>
            <button
              onClick={() => setMobileNav((o) => !o)}
              className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl border md:hidden', dark ? 'border-white/10 text-slate-200' : 'border-slate-200 text-slate-700')}
            >
              {mobileNav ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {mobileNav && (
          <div className={cn('border-t px-4 py-3 md:hidden', dark ? 'border-white/10 bg-[#030712]/95' : 'border-slate-200 bg-white/95')}>
            {NAV.map((item) => (
              <button key={item.label} onClick={() => { setMobileNav(false); navigate({ name: 'login' }); }} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold', dark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}>
                <item.icon size={16} /> {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 sm:pt-20 lg:pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          {/* Left */}
          <div className="animate-fade-up text-center lg:text-left">
            <span className={cn('inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold backdrop-blur', dark ? 'border-white/15 bg-white/5 text-[#00A8FF]' : 'border-slate-200 bg-white/70 text-brand-600')}>
              <Sparkles size={15} /> La nueva red social
            </span>

            <h1 className={cn('mt-6 font-display text-5xl font-extrabold leading-[1.04] tracking-tight text-balance sm:text-6xl lg:text-7xl', dark ? 'text-white' : 'text-slate-900')} id="inicio">
              Conecta,
              <br />
              comparte y
              <br />
              <span className="vex-gradient-text">vive</span> con Vexora
            </h1>

            <p className={cn('mt-6 max-w-lg text-lg leading-relaxed mx-auto lg:mx-0', dark ? 'text-slate-300/90' : 'text-slate-600')}>
              Un espacio moderno para estar cerca de las personas que te importan. Publica momentos, sigue a tus amigos y descubre nuevas personas.
            </p>

            {/* Feature cards */}
            <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:max-w-none">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className={cn(
                    'group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 animate-fade-up hover:-translate-y-1',
                    dark
                      ? 'border-white/10 bg-[#071426]/80 backdrop-blur hover:border-[#00A8FF]/40 hover:shadow-neonBlue'
                      : 'border-slate-200 bg-white/90 shadow-card hover:border-brand-300 hover:shadow-glow',
                  )}
                  style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                >
                  <div className={cn('absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100', dark ? 'bg-gradient-to-br from-[#00A8FF]/10 to-[#A855F7]/10' : 'bg-gradient-to-br from-brand-50/60 to-grape-50/60')} />
                  <div className="relative">
                    <div className={cn('mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl transition', dark ? 'vex-gradient-bg text-white vex-glow-purple' : 'bg-gradient-to-br from-brand-500 to-grape-500 text-white')}>
                      <f.icon size={20} />
                    </div>
                    <h3 className={cn('font-display text-base font-bold', dark ? 'text-white' : 'text-slate-900')}>{f.title}</h3>
                    <p className={cn('mt-1.5 text-sm leading-relaxed', dark ? 'text-slate-400' : 'text-slate-500')}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: post mockups */}
          <div className="relative hidden animate-fade-up lg:block" style={{ animationDelay: '0.2s' }}>
            <div className={cn('absolute -inset-8 rounded-[2.5rem] opacity-40 blur-3xl', 'bg-gradient-to-br from-[#00A8FF]/30 via-[#2563EB]/20 to-[#A855F7]/30')} />

            <div className="relative space-y-4">
              {/* Main post */}
              <div className={cn('rounded-3xl border p-5 backdrop-blur-xl transition', dark ? 'border-white/10 bg-[#071426]/90 shadow-deep' : 'border-slate-200 bg-white/90 shadow-card')}>
                <div className="flex items-center gap-3">
                  <div className="vex-gradient-bg-bright inline-flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white">SR</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className={cn('truncate font-semibold', dark ? 'text-white' : 'text-slate-800')}>Sofía Ramírez</p>
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full vex-gradient-bg text-[9px] text-white">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                    </div>
                    <p className={cn('text-xs', dark ? 'text-slate-400' : 'text-slate-500')}>@sofia · 2 min</p>
                  </div>
                </div>
                <p className={cn('mt-3 leading-relaxed', dark ? 'text-slate-200' : 'text-slate-700')}>
                  Amanecer en la montaña. No hay mejor forma de empezar el día. ☀️🏔️
                </p>
                <div className="mt-3 overflow-hidden rounded-2xl">
                  <img src={HERO_PHOTO} alt="Amanecer en la montaña" className="h-56 w-full object-cover" loading="lazy" />
                </div>
                <div className={cn('mt-3 flex items-center gap-5 border-t pt-3 text-sm', dark ? 'border-white/10' : 'border-slate-100')}>
                  <span className={cn('inline-flex items-center gap-1.5', dark ? 'text-rose-400' : 'text-rose-500')}><Heart size={16} className="fill-current" /> 128</span>
                  <span className={cn('inline-flex items-center gap-1.5', dark ? 'text-sky-400' : 'text-sky-500')}><MessageSquare size={16} /> 24</span>
                  <span className={cn('inline-flex items-center gap-1.5', dark ? 'text-violet-400' : 'text-violet-500')}><Share2 size={16} /> 6</span>
                  <span className={cn('ml-auto inline-flex items-center gap-1.5', dark ? 'text-amber-400' : 'text-amber-500')}><Bookmark size={16} /> Guardar</span>
                </div>
              </div>

              {/* Small post */}
              <div className={cn('ml-auto w-[78%] rounded-2xl border p-4 backdrop-blur-xl transition', dark ? 'border-white/10 bg-[#0b1a30]/90 shadow-deep' : 'border-slate-200 bg-white/90 shadow-card')}>
                <div className="flex items-center gap-2.5">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 text-xs font-bold text-white">MA</div>
                  <div>
                    <p className={cn('text-sm font-semibold', dark ? 'text-white' : 'text-slate-800')}>Mateo Alvares</p>
                    <p className={cn('text-xs', dark ? 'text-slate-400' : 'text-slate-500')}>@mateo · 5 min</p>
                  </div>
                </div>
                <p className={cn('mt-2 text-sm leading-relaxed', dark ? 'text-slate-300' : 'text-slate-600')}>
                  Acabo de unirme a Vexora y me encanta lo fluido que es todo. ¡Excelente trabajo!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile post preview */}
        <div className={cn('mt-10 rounded-3xl border p-5 backdrop-blur-xl lg:hidden', dark ? 'border-white/10 bg-[#071426]/90' : 'border-slate-200 bg-white/90 shadow-card')}>
          <div className="flex items-center gap-3">
            <div className="vex-gradient-bg-bright inline-flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white">SR</div>
            <div className="flex-1">
              <p className={cn('font-semibold', dark ? 'text-white' : 'text-slate-800')}>Sofía Ramírez</p>
              <p className={cn('text-xs', dark ? 'text-slate-400' : 'text-slate-500')}>@sofia · 2 min</p>
            </div>
          </div>
          <p className={cn('mt-3 leading-relaxed', dark ? 'text-slate-200' : 'text-slate-700')}>Amanecer en la montaña. No hay mejor forma de empezar el día. ☀️🏔️</p>
          <div className="mt-3 overflow-hidden rounded-2xl">
            <img src={HERO_PHOTO} alt="Amanecer" className="h-44 w-full object-cover" loading="lazy" />
          </div>
          <div className={cn('mt-3 flex items-center gap-5 border-t pt-3 text-sm', dark ? 'border-white/10' : 'border-slate-100')}>
            <span className={cn('inline-flex items-center gap-1.5', dark ? 'text-rose-400' : 'text-rose-500')}><Heart size={16} className="fill-current" /> 128</span>
            <span className={cn('inline-flex items-center gap-1.5', dark ? 'text-sky-400' : 'text-sky-500')}><MessageSquare size={16} /> 24</span>
            <span className={cn('inline-flex items-center gap-1.5', dark ? 'text-violet-400' : 'text-violet-500')}><Share2 size={16} /> 6</span>
          </div>
        </div>
      </main>

      {/* Planet footer decoration */}
      <PlanetFooter dark={dark} />

      {/* Footer */}
      <footer className={cn('relative z-10 border-t backdrop-blur-xl', dark ? 'border-white/10 bg-[#030712]/80' : 'border-slate-200 bg-white/80')}>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="vex-logo-hover flex items-center gap-2">
                <Logo size={34} />
                <Wordmark className="text-lg" />
              </span>
              <p className={cn('border-l pl-3 text-xs', dark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400')}>© 2026 Vexora</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
              <button onClick={() => navigate({ name: 'legal', section: 'reglamento' })} className={cn('font-medium transition', dark ? 'text-slate-400 hover:text-[#00A8FF]' : 'text-slate-500 hover:text-brand-600')}>Reglamento</button>
              <button onClick={() => navigate({ name: 'legal', section: 'terminos' })} className={cn('font-medium transition', dark ? 'text-slate-400 hover:text-[#00A8FF]' : 'text-slate-500 hover:text-brand-600')}>Términos</button>
              <button onClick={() => navigate({ name: 'legal', section: 'privacidad' })} className={cn('font-medium transition', dark ? 'text-slate-400 hover:text-[#00A8FF]' : 'text-slate-500 hover:text-brand-600')}>Privacidad</button>
            </div>

            <div className="flex items-center gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  aria-label={s.label}
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition',
                    dark ? 'border-white/10 text-slate-400 hover:border-[#00A8FF]/40 hover:text-[#00A8FF]' : 'border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600',
                  )}
                >
                  <s.icon size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const SOCIALS = [
  { label: 'X', icon: X },
  { label: 'Globe', icon: Globe },
  { label: 'Sparkles', icon: Sparkles },
  { label: 'Compass', icon: Compass },
];

function Starfield({ dark }: { dark: boolean }) {
  const stars = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    top: `${(i * 53) % 100}%`,
    left: `${(i * 37) % 100}%`,
    size: (i % 3) + 1,
    delay: `${(i % 5) * 0.8}s`,
  }));
  if (!dark) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay }}
        />
      ))}
    </div>
  );
}

function PlanetFooter({ dark }: { dark: boolean }) {
  return (
    <div className="pointer-events-none absolute bottom-0 left-1/2 z-0 h-64 w-[120%] -translate-x-1/2 overflow-hidden">
      <div
        className={cn('absolute -bottom-48 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full opacity-60 blur-2xl animate-pulse-glow', dark ? 'bg-[#2563EB]' : 'bg-brand-300')}
      />
      <div
        className={cn('absolute -bottom-44 left-1/2 h-64 w-64 -translate-x-1/2 translate-x-10 rounded-full opacity-50 blur-2xl animate-pulse-glow', dark ? 'bg-[#A855F7]' : 'bg-grape-300')}
        style={{ animationDelay: '1.5s' }}
      />
      <div
        className={cn(
          'absolute -bottom-40 left-1/2 h-56 w-[140%] -translate-x-1/2 rounded-[100%] border-t',
          dark ? 'border-[#00A8FF]/20' : 'border-brand-200',
        )}
        style={{
          background: dark
            ? 'radial-gradient(60% 100% at 50% 0%, rgba(0,168,255,0.18), rgba(124,58,237,0.10) 50%, transparent 70%)'
            : 'radial-gradient(60% 100% at 50% 0%, rgba(37,99,235,0.10), rgba(124,58,237,0.06) 50%, transparent 70%)',
        }}
      />
    </div>
  );
}
