import { useState, type FormEvent } from 'react';
import { useRouter } from '@/context/RouterContext';
import { useApp } from '@/context/AppContext';
import { Logo, Wordmark } from '@/components/Logo';
import { ArrowLeft, Eye, EyeOff, AlertCircle, Mail, KeyRound, Check, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

type Step = 'request' | 'code' | 'reset' | 'done';

export function Recover() {
  const { back, navigate } = useRouter();
  const { requestPasswordReset, verifyResetCode, resetPassword } = useApp();

  const [step, setStep] = useState<Step>('request');
  const [identifier, setIdentifier] = useState('');
  const [userId, setUserId] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [code, setCode] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitRequest = (e: FormEvent) => {
    e.preventDefault();
    const res = requestPasswordReset(identifier);
    if (!res.ok) return setError(res.error ?? 'No se pudo procesar.');
    setUserId(res.userId!);
    setDemoCode(res.code!);
    setError(null);
    setStep('code');
  };

  const submitCode = (e: FormEvent) => {
    e.preventDefault();
    const res = verifyResetCode(userId, code);
    if (!res.ok) return setError(res.error ?? 'Código incorrecto.');
    setError(null);
    setStep('reset');
  };

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (newPw !== confirmPw) return setError('Las contraseñas no coinciden.');
    const res = await resetPassword(userId, newPw);
    if (!res.ok) return setError(res.error ?? 'No se pudo cambiar.');
    setError(null);
    setStep('done');
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
            <h1 className="mt-2 font-display text-2xl font-bold text-strong">Recuperar contraseña</h1>
            <p className="text-muted">
              {step === 'request' && 'Te enviaremos un código de verificación.'}
              {step === 'code' && 'Ingresa el código que enviamos a tu correo.'}
              {step === 'reset' && 'Crea una nueva contraseña.'}
              {step === 'done' && 'Tu contraseña fue restablecida.'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="mb-6 flex items-center justify-center gap-2">
            {(['request', 'code', 'reset'] as const).map((s, i) => {
              const activeIdx = (['request', 'code', 'reset', 'done'] as const).indexOf(step);
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition',
                    i <= activeIdx ? 'gradient-brand text-white' : 'bg-[var(--vex-surface-2)] text-muted',
                  )}>{i + 1}</div>
                  {i < 2 && <div className={cn('h-1 w-8 rounded-full', i < activeIdx ? 'gradient-brand' : 'bg-[var(--vex-surface-2)]')} />}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
              <AlertCircle size={18} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={submitRequest} className="card space-y-5 p-6 sm:p-8">
              <div>
                <label className="label">Correo principal, alternativo o teléfono</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input className="input pl-10" placeholder="tucorreo@ejemplo.com" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
                </div>
              </div>
              <button type="submit" disabled={!identifier.trim()} className="btn-primary w-full py-3.5">
                <KeyRound size={18} /> Enviar código
              </button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={submitCode} className="card space-y-5 p-6 sm:p-8">
              {demoCode && (
                <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                  <p className="font-semibold">Modo demo</p>
                  <p>Tu código de verificación es: <span className="font-mono text-lg font-bold">{demoCode}</span></p>
                </div>
              )}
              <div>
                <label className="label">Código de verificación</label>
                <input
                  className="input text-center text-2xl tracking-[0.5em]"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <button type="submit" disabled={code.length !== 6} className="btn-primary w-full py-3.5">
                Verificar código
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={submitReset} className="card space-y-5 p-6 sm:p-8">
              <div>
                <label className="label">Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input pr-11"
                    placeholder="Mínimo 6 caracteres"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-strong">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirmar contraseña</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input"
                  placeholder="Repite la contraseña"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                />
              </div>
              <button type="submit" disabled={!newPw || !confirmPw} className="btn-primary w-full py-3.5">
                <ShieldCheck size={18} /> Restablecer contraseña
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="card flex flex-col items-center gap-4 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Check size={32} />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-strong">¡Listo!</h2>
                <p className="mt-1 text-muted">Tu contraseña fue cambiada y se cerraron todas las sesiones anteriores.</p>
              </div>
              <button onClick={() => navigate({ name: 'login' })} className="btn-primary w-full py-3.5">
                Iniciar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
