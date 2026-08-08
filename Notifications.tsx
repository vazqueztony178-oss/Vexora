import { useState, type FormEvent } from 'react';
import { useRouter } from '@/context/RouterContext';
import { useApp } from '@/context/AppContext';
import { Logo, Wordmark } from '@/components/Logo';
import { ArrowLeft, Eye, EyeOff, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const YEARS = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

function strength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte'];
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-lime-500', 'bg-emerald-500'];
  return { score, label: labels[score], color: colors[score] };
}

export function Register() {
  const { navigate, back } = useRouter();
  const { register } = useApp();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    altEmail: '',
    phone: '',
    password: '',
    confirm: '',
    birthDay: 1,
    birthMonth: 1,
    birthYear: 2000,
    accept: false,
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pw = strength(form.password);
  const match = form.password === form.confirm;
  const canSubmit =
    form.firstName && form.lastName && form.username && form.email && form.password.length >= 6 && match && form.accept;

  const set = (k: keyof typeof form, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!match) return setError('Las contraseñas no coinciden.');
    if (!form.accept) return setError('Debes aceptar el Reglamento, Términos y Política de privacidad.');
    const res = await register({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      username: form.username.trim().replace(/^@/, ''),
      email: form.email.trim(),
      altEmail: form.altEmail.trim(),
      phone: form.phone.trim(),
      password: form.password,
      birthDay: form.birthDay,
      birthMonth: form.birthMonth,
      birthYear: form.birthYear,
      showBirthDate: true,
    });
    if (!res.ok) return setError(res.error ?? 'No se pudo crear la cuenta.');
    navigate({ name: 'verify', userId: res.pendingUserId! });
  };

  return (
    <div className="relative min-h-screen gradient-aurora bg-[var(--vex-bg)]">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-6">
        <header className="flex items-center justify-between">
          <button onClick={back} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-strong">
            <ArrowLeft size={18} /> Volver
          </button>
          <button onClick={() => navigate({ name: 'login' })} className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
            ¿Ya tienes cuenta? Inicia sesión
          </button>
        </header>

        <div className="mx-auto w-full max-w-xl py-6">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="vex-logo-hover flex flex-col items-center">
              <Logo size={56} />
              <Wordmark className="mt-3 text-3xl" />
            </div>
            <h1 className="mt-2 font-display text-2xl font-bold text-strong">Crea tu cuenta</h1>
            <p className="text-muted">Únete a Vexora en menos de un minuto.</p>
          </div>

          <form onSubmit={submit} className="card space-y-5 p-6 sm:p-8">
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
                <AlertCircle size={18} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Nombre</label>
                <input className="input" placeholder="Tu nombre" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
              </div>
              <div>
                <label className="label">Apellidos</label>
                <input className="input" placeholder="Tus apellidos" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Nombre de usuario</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">@</span>
                <input className="input pl-7" placeholder="usuario" value={form.username} onChange={(e) => set('username', e.target.value.replace(/\s/g, ''))} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Correo electrónico</label>
                <input type="email" className="input" placeholder="tucorreo@ejemplo.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div>
                <label className="label">Correo alternativo <span className="font-normal text-muted">(opcional)</span></label>
                <input type="email" className="input" placeholder="otro@ejemplo.com" value={form.altEmail} onChange={(e) => set('altEmail', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Fecha de nacimiento</label>
              <div className="grid grid-cols-3 gap-3">
                <select className="input" value={form.birthDay} onChange={(e) => set('birthDay', Number(e.target.value))}>
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select className="input" value={form.birthMonth} onChange={(e) => set('birthMonth', Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select className="input" value={form.birthYear} onChange={(e) => set('birthYear', Number(e.target.value))}>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input pr-11"
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-strong">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className={cn('h-1.5 flex-1 rounded-full', i < pw.score ? pw.color : 'bg-[var(--vex-border)]')} />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted">{pw.label}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="label">Confirmar contraseña</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  className={cn('input', form.confirm && !match && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
                  placeholder="Repite tu contraseña"
                  value={form.confirm}
                  onChange={(e) => set('confirm', e.target.value)}
                />
                {form.confirm && !match && <p className="mt-1 text-xs font-medium text-red-500">Las contraseñas no coinciden.</p>}
                {form.confirm && match && <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">Las contraseñas coinciden.</p>}
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[var(--vex-surface-2)] p-4 transition hover:bg-[var(--vex-border-soft)]">
              <button
                type="button"
                onClick={() => set('accept', !form.accept)}
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition',
                  form.accept ? 'gradient-brand border-transparent' : 'border-[var(--vex-border)] bg-[var(--vex-surface)]',
                )}
              >
                {form.accept && <Check size={13} className="text-white" />}
              </button>
              <span className="text-sm text-app">
                He leído y acepto el{' '}
                <button type="button" onClick={() => navigate({ name: 'legal', section: 'reglamento' })} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">Reglamento</button>, los{' '}
                <button type="button" onClick={() => navigate({ name: 'legal', section: 'terminos' })} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">Términos de uso</button> y la{' '}
                <button type="button" onClick={() => navigate({ name: 'legal', section: 'privacidad' })} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">Política de privacidad</button>.
              </span>
            </label>

            <button type="submit" disabled={!canSubmit} className="btn-primary w-full py-3.5 text-base">
              <ShieldCheck size={18} /> Crear cuenta
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
