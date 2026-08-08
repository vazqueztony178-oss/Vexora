import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from '@/context/RouterContext';
import { useApp } from '@/context/AppContext';
import { Logo, Wordmark } from '@/components/Logo';
import { ArrowLeft, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Verify({ userId }: { userId: string }) {
  const { navigate, back } = useRouter();
  const { verifyCode, resendCode, getUserById } = useApp();
  const user = getUserById(userId);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const code = resendCode(userId);
    setGenerated(code);
    setSeconds(45);
  }, [userId]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const setDigit = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    setDigits((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
    if (v && i < 5) {
      const el = document.getElementById(`d-${i + 1}`);
      el?.focus();
    }
  };

  const code = digits.join('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return setError('Ingresa los 6 dígitos.');
    const res = verifyCode(userId, code);
    if (!res.ok) return setError(res.error ?? 'Código incorrecto.');
    navigate({ name: 'home' });
  };

  const resend = () => {
    const c = resendCode(userId);
    setGenerated(c);
    setSeconds(45);
    setError(null);
  };

  return (
    <div className="relative min-h-screen gradient-aurora bg-[var(--vex-bg)]">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-6">
        <button onClick={back} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-muted hover:text-strong">
          <ArrowLeft size={18} /> Volver
        </button>

        <div className="mx-auto w-full max-w-md py-10 text-center">
          <div className="vex-logo-hover mx-auto flex flex-col items-center">
            <Logo size={60} />
            <Wordmark className="mt-4 text-3xl" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-strong">Verifica tu cuenta</h1>
          <p className="mt-2 text-muted">
            Enviamos un código de 6 dígitos a <span className="font-semibold text-strong">{user?.email ?? 'tu correo'}</span>.
          </p>

          {generated && (
            <div className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              <span className="font-semibold">Modo demo:</span> tu código es <span className="font-mono text-lg font-bold tracking-widest">{generated}</span>
            </div>
          )}

          <form onSubmit={submit} className="mt-8">
            <div className="flex justify-between gap-2 sm:gap-3">
              {digits.map((d, i) => (
                <input
                  key={i}
                  id={`d-${i}`}
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !d && i > 0) document.getElementById(`d-${i - 1}`)?.focus();
                  }}
                  className={cn(
                    'h-16 w-12 rounded-2xl border-2 bg-[var(--vex-surface)] text-center font-display text-2xl font-bold text-strong outline-none transition',
                    d ? 'border-brand-400 ring-4 ring-brand-100 dark:ring-brand-900/40' : 'border-[var(--vex-border)] focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:ring-brand-900/40',
                  )}
                />
              ))}
            </div>

            {error && (
              <div className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-red-600">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button type="submit" disabled={code.length !== 6} className="btn-primary mt-6 w-full py-3.5 text-base">
              <ShieldCheck size={18} /> Verificar cuenta
            </button>
          </form>

          <div className="mt-6 text-sm text-muted">
            {seconds > 0 ? (
              <p>Puedes reenviar el código en {seconds} s.</p>
            ) : (
              <button onClick={resend} className="inline-flex items-center gap-2 font-semibold text-brand-600 hover:underline dark:text-brand-400">
                <RefreshCw size={15} /> Reenviar código
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
