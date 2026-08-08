import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from '@/context/RouterContext';
import { useApp } from '@/context/AppContext';
import { storage } from '@/lib/storage';
import { Logo, Wordmark } from '@/components/Logo';
import { ArrowLeft, Eye, EyeOff, AlertCircle, LogIn, KeyRound } from 'lucide-react';

export function Login() {
  const { navigate, back } = useRouter();
  const { login } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = storage.getRememberedEmail();
    if (saved) {
      setIdentifier(saved);
      setRemember(true);
    }
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await login(identifier, password);
    if (!res.ok) return setError(res.error ?? 'No se pudo iniciar sesión.');
    storage.setRememberedEmail(remember ? identifier : '');
    navigate({ name: 'home' });
  };

  return (
    <div className="relative min-h-screen gradient-aurora bg-[var(--vex-bg)]">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-6">
        <button onClick={back} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-muted hover:text-strong">
          <ArrowLeft size={18} /> Volver
        </button>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="mb-6 text-center">
            <div className="vex-logo-hover mx-auto flex flex-col items-center">
              <Logo size={56} />
              <Wordmark className="mt-3 text-3xl" />
            </div>
            <h1 className="mt-2 font-display text-2xl font-bold text-strong">Bienvenido de vuelta</h1>
            <p className="text-muted">Inicia sesión para continuar.</p>
          </div>

          <form onSubmit={submit} className="card space-y-5 p-6 sm:p-8">
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
                <AlertCircle size={18} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}

            <div>
              <label className="label">Correo, correo alternativo o usuario</label>
              <input className="input" placeholder="tucorreo@ejemplo.com" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-11"
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-strong">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-app accent-[var(--vex-brand)]"
                />
                Recordarme
              </label>
              <button
                type="button"
                onClick={() => navigate({ name: 'recover' })}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
              >
                <KeyRound size={14} /> ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button type="submit" disabled={!identifier || !password} className="btn-primary w-full py-3.5 text-base">
              <LogIn size={18} /> Iniciar sesión
            </button>

            <p className="text-center text-sm text-muted">
              ¿No tienes cuenta?{' '}
              <button type="button" onClick={() => navigate({ name: 'register' })} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
                Regístrate
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
