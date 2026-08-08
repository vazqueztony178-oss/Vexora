import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
import { Avatar } from '@/components/Avatar';
import {
  User, Bell, Lock, Shield, LogOut, ChevronRight, Globe, Sun, Moon, Monitor,
  Ban, X, Palette, Download, Key, Smartphone, Eye, EyeOff, Check, Save,
  Mail, Phone, MessageSquare, PhoneCall, AtSign, HardDrive, RefreshCw, Sparkles,
} from 'lucide-react';
import { fullName } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { User as UserType } from '@/types';

type SettingsSection = 'account' | 'security' | 'privacy' | 'notifications' | 'backup' | 'appearance' | 'legal';

export function Settings() {
  const { currentUser, logout, updateProfile, unblockUser, getUserById, updateShowOnlineStatus, preferences, updatePrivacy, updateAppearance } = useApp();
  const { navigate } = useRouter();
  const { mode, setMode, resolved, glassIntensity, setGlassIntensity } = useTheme();
  const [showBlocked, setShowBlocked] = useState(false);
  const [section, setSection] = useState<SettingsSection>('account');

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifCalls, setNotifCalls] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifTags, setNotifTags] = useState(true);


  const [twoFA, setTwoFA] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [showChangePass, setShowChangePass] = useState(false);

  if (!currentUser) return null;

  const navItems: Array<{ key: SettingsSection; label: string; icon: typeof User }> = [
    { key: 'account', label: 'Cuenta', icon: User },
    { key: 'security', label: 'Seguridad', icon: Shield },
    { key: 'privacy', label: 'Privacidad', icon: Lock },
    { key: 'notifications', label: 'Notificaciones', icon: Bell },
    { key: 'backup', label: 'Respaldo', icon: Download },
    { key: 'appearance', label: 'Apariencia', icon: Palette },
    { key: 'legal', label: 'Legal', icon: Globe },
  ];

  const visOptions: Array<{ value: 'public' | 'friends' | 'private'; label: string }> = [
    { value: 'public', label: 'Público' },
    { value: 'friends', label: 'Amigos' },
    { value: 'private', label: 'Solo yo' },
  ];
  const interactionOptions: Array<{ value: 'all' | 'friends' | 'none'; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'friends', label: 'Amigos' },
    { value: 'none', label: 'Nadie' },
  ];
  const followOptions: Array<{ value: 'all' | 'approval'; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'approval', label: 'Solo aprobación manual' },
  ];
  const intensityOptions: Array<{ value: 'soft' | 'medium' | 'intense'; label: string; desc: string }> = [
    { value: 'soft', label: 'Suave', desc: 'Menos desenfoque y transparencia' },
    { value: 'medium', label: 'Medio', desc: 'Equilibrio entre cristal y claridad' },
    { value: 'intense', label: 'Intenso', desc: 'Máximo desenfoque, brillo y reflejos' },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 font-display text-2xl font-bold text-strong">Configuración</h1>

      <div className="card mb-5 flex items-center gap-4 p-5">
        <Avatar user={currentUser} size={60} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-strong">{fullName(currentUser)}</p>
          <p className="truncate text-sm text-muted">@{currentUser.username}</p>
        </div>
        <button onClick={() => navigate({ name: 'profile' })} className="btn-ghost px-4 py-2 text-sm">Ver perfil</button>
      </div>

      <div className="grid gap-5 md:grid-cols-[220px_1fr]">
        {/* Section nav */}
        <div className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition md:w-full',
                section === item.key
                  ? 'gradient-brand text-white shadow-soft'
                  : 'text-muted hover:bg-[var(--vex-surface-2)] hover:text-strong',
              )}
            >
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div className="min-w-0">
          {section === 'account' && (
            <div className="space-y-4">
              <SettingsGroup title="Información personal">
                <SettingsRow label="Nombre" desc={currentUser.firstName} />
                <SettingsRow label="Apellidos" desc={currentUser.lastName} />
                <SettingsRow label="Usuario" desc={`@${currentUser.username}`} />
                <SettingsRow label="Correo electrónico" desc={currentUser.email} />
                <SettingsRow label="Correo alternativo" desc={currentUser.altEmail || 'Sin definir'} />
                <SettingsRow label="Teléfono" desc={currentUser.phone || 'Sin definir'} />
                <SettingsRow label="Biografía" desc={currentUser.bio || 'Sin definir'} />
                <button onClick={() => navigate({ name: 'profile' })} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-[var(--vex-surface-2)]">
                  <div className="flex-1"><p className="text-sm font-semibold text-brand-600">Editar información del perfil</p></div>
                  <ChevronRight size={18} className="text-muted" />
                </button>
              </SettingsGroup>
            </div>
          )}

          {section === 'security' && (
            <div className="space-y-4">
              <SettingsGroup title="Contraseña">
                <button onClick={() => setShowChangePass((v) => !v)} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-[var(--vex-surface-2)]">
                  <Key size={18} className="text-muted" />
                  <div className="flex-1"><p className="text-sm font-semibold text-strong">Cambiar contraseña</p><p className="text-xs text-muted">Actualiza tu contraseña</p></div>
                  <ChevronRight size={18} className="text-muted" />
                </button>
                {showChangePass && (
                  <div className="space-y-2 p-4 pt-0">
                    <input type="password" className="input" placeholder="Contraseña actual" />
                    <input type="password" className="input" placeholder="Nueva contraseña" />
                    <input type="password" className="input" placeholder="Confirmar contraseña" />
                    <button onClick={() => setShowChangePass(false)} className="btn-primary px-4 py-2 text-sm"><Check size={16} /> Guardar contraseña</button>
                  </div>
                )}
                <button className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-[var(--vex-surface-2)]">
                  <Mail size={18} className="text-muted" />
                  <div className="flex-1"><p className="text-sm font-semibold text-strong">Recuperar contraseña</p><p className="text-xs text-muted">Enviar enlace al correo</p></div>
                  <ChevronRight size={18} className="text-muted" />
                </button>
              </SettingsGroup>

              <SettingsGroup title="Recuperación">
                <div className="p-4">
                  <label className="label">Correo de recuperación</label>
                  <input className="input" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="correo@recuperacion.com" />
                </div>
                <div className="border-t border-soft p-4">
                  <label className="label">Número de recuperación</label>
                  <input className="input" value={recoveryPhone} onChange={(e) => setRecoveryPhone(e.target.value)} placeholder="+52 555 123 4567" />
                </div>
              </SettingsGroup>

              <SettingsGroup title="Verificación en dos pasos">
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-strong">Verificación en dos pasos</p>
                    <p className="text-xs text-muted">Añade una capa extra de seguridad</p>
                  </div>
                  <Toggle on={twoFA} onChange={setTwoFA} />
                </div>
              </SettingsGroup>

              <SettingsGroup title="Sesiones activas">
                <div className="flex items-center gap-3 p-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-950/40">
                    <Smartphone size={18} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-strong">Este dispositivo</p>
                    <p className="text-xs text-muted">Actual · Activo ahora</p>
                  </div>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-600 dark:bg-green-950/40 dark:text-green-400">Actual</span>
                </div>
                <button className="flex w-full items-center gap-3 border-t border-soft p-4 text-left transition hover:bg-[var(--vex-surface-2)]">
                  <RefreshCw size={18} className="text-red-500" />
                  <div className="flex-1"><p className="text-sm font-semibold text-red-500">Cerrar otros dispositivos</p></div>
                </button>
              </SettingsGroup>
            </div>
          )}

          {section === 'privacy' && (
            <div className="space-y-4">
              <SettingsGroup title="Visibilidad del perfil">
                <PrivacySelectRow
                  icon={Globe}
                  label="Perfil"
                  desc="Quién puede ver tu perfil completo"
                  value={preferences.privacy.profileVisibility}
                  onChange={(v) => updatePrivacy('profileVisibility', v)}
                  options={visOptions}
                />
              </SettingsGroup>

              <SettingsGroup title="Publicaciones">
                <PrivacySelectRow
                  icon={Globe}
                  label="Privacidad predeterminada"
                  desc="Se aplica a nuevas publicaciones"
                  value={preferences.privacy.defaultPostVisibility}
                  onChange={(v) => updatePrivacy('defaultPostVisibility', v)}
                  options={visOptions}
                />
                <p className="px-4 pb-3 text-xs text-muted">Puedes cambiar la privacidad individualmente en cada publicación.</p>
              </SettingsGroup>

              <SettingsGroup title="Quién puede ver">
                <PrivacySelectRow label="Fotos" value={preferences.privacy.photosVisibility} onChange={(v) => updatePrivacy('photosVisibility', v)} options={visOptions} />
                <PrivacySelectRow label="Videos" value={preferences.privacy.videosVisibility} onChange={(v) => updatePrivacy('videosVisibility', v)} options={visOptions} />
                <PrivacySelectRow label="Historias" value={preferences.privacy.storiesVisibility} onChange={(v) => updatePrivacy('storiesVisibility', v)} options={visOptions} />
                <PrivacySelectRow label="Lista de amigos" value={preferences.privacy.friendsVisibility} onChange={(v) => updatePrivacy('friendsVisibility', v)} options={visOptions} />
                <PrivacySelectRow label="Fecha de nacimiento" value={preferences.privacy.birthDateVisibility} onChange={(v) => updatePrivacy('birthDateVisibility', v)} options={visOptions} />
                <PrivacySelectRow label="Ciudad y país" value={preferences.privacy.locationVisibility} onChange={(v) => updatePrivacy('locationVisibility', v)} options={visOptions} />
                <PrivacySelectRow label="Familia" value={preferences.privacy.familyVisibility} onChange={(v) => updatePrivacy('familyVisibility', v)} options={visOptions} />
                <PrivacySelectRow label="Información personal" value={preferences.privacy.personalInfoVisibility} onChange={(v) => updatePrivacy('personalInfoVisibility', v)} options={visOptions} />
              </SettingsGroup>

              <SettingsGroup title="Interacciones">
                <PrivacySelectRow label="Quién puede enviarme mensajes" value={preferences.privacy.whoCanMessage} onChange={(v) => updatePrivacy('whoCanMessage', v)} options={interactionOptions} />
                <PrivacySelectRow label="Quién puede llamarme" value={preferences.privacy.whoCanCall} onChange={(v) => updatePrivacy('whoCanCall', v)} options={interactionOptions} />
                <PrivacySelectRow label="Quién puede comentar mis publicaciones" value={preferences.privacy.whoCanComment} onChange={(v) => updatePrivacy('whoCanComment', v)} options={interactionOptions} />
                <PrivacySelectRow label="Quién puede seguirme" value={preferences.privacy.whoCanFollow} onChange={(v) => updatePrivacy('whoCanFollow', v)} options={followOptions} />
              </SettingsGroup>

              <SettingsGroup title="Estado">
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-strong">Mostrar mi estado en línea</p>
                    <p className="text-xs text-muted">Otros usuarios pueden ver cuándo estás conectado</p>
                  </div>
                  <Toggle on={currentUser.showOnlineStatus ?? true} onChange={(v) => updateShowOnlineStatus(v)} />
                </div>
              </SettingsGroup>

              <SettingsGroup title="Usuarios bloqueados">
                <button onClick={() => setShowBlocked(true)} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-[var(--vex-surface-2)]">
                  <Ban size={18} className="text-muted" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-strong">Usuarios bloqueados</p>
                    <p className="text-xs text-muted">{(currentUser.blockedUsers?.length ?? 0) > 0 ? `${currentUser.blockedUsers!.length} personas bloqueadas` : 'No tienes usuarios bloqueados'}</p>
                  </div>
                  <ChevronRight size={18} className="text-muted" />
                </button>
              </SettingsGroup>
            </div>
          )}

          {section === 'notifications' && (
            <div className="space-y-4">
              <SettingsGroup title="Notificaciones">
                <NotifRow icon={Mail} label="Correo" on={notifEmail} onChange={setNotifEmail} />
                <NotifRow icon={Bell} label="Push" on={notifPush} onChange={setNotifPush} />
                <NotifRow icon={MessageSquare} label="Mensajes" on={notifMessages} onChange={setNotifMessages} />
                <NotifRow icon={PhoneCall} label="Llamadas" on={notifCalls} onChange={setNotifCalls} />
                <NotifRow icon={MessageSquare} label="Comentarios" on={notifComments} onChange={setNotifComments} />
                <NotifRow icon={AtSign} label="Etiquetas" on={notifTags} onChange={setNotifTags} />
              </SettingsGroup>
            </div>
          )}

          {section === 'backup' && (
            <div className="space-y-4">
              <SettingsGroup title="Descargar respaldo">
                <p className="px-4 pt-4 text-sm text-muted">Descarga tus datos en formato ZIP. Selecciona qué quieres incluir:</p>
                {[
                  { label: 'Conversaciones', icon: MessageSquare },
                  { label: 'Fotos', icon: Eye },
                  { label: 'Videos', icon: Eye },
                  { label: 'Archivos', icon: HardDrive },
                  { label: 'Publicaciones', icon: Globe },
                  { label: 'Perfil', icon: User },
                ].map((item) => (
                  <BackupRow key={item.label} icon={item.icon} label={item.label} />
                ))}
                <div className="border-t border-soft p-4">
                  <button className="btn-primary w-full py-3"><Download size={18} /> Descargar todo en ZIP</button>
                </div>
              </SettingsGroup>
            </div>
          )}

          {section === 'appearance' && (
            <div className="space-y-4">
              <SettingsGroup title="Tema">
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {([
                      ['light', 'Claro', Sun],
                      ['dark', 'Oscuro', Moon],
                      ['system', 'Sistema', Monitor],
                      ['glass', 'Liquid Glass', Sparkles],
                    ] as const).map(([t, label, Icon]) => (
                      <button
                        key={t}
                        onClick={() => { setMode(t as ThemeMode); updateAppearance('themeMode', t as ThemeMode); }}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-semibold transition',
                          mode === t ? 'gradient-brand border-transparent text-white shadow-soft' : 'border-app text-muted hover:bg-[var(--vex-surface-2)]',
                        )}
                      >
                        <Icon size={18} /> {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted">La preferencia se guarda automáticamente. Sistema sigue el modo claro u oscuro de tu dispositivo.</p>
                </div>
              </SettingsGroup>

              {mode === 'glass' && (
                <SettingsGroup title="Intensidad del efecto">
                  {intensityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setGlassIntensity(opt.value); updateAppearance('glassIntensity', opt.value); }}
                      className={cn(
                        'flex w-full items-center gap-3 p-4 text-left transition hover:bg-[var(--vex-surface-2)]',
                        glassIntensity === opt.value && 'bg-[var(--vex-accent-soft)]',
                      )}
                    >
                      <div className={cn('flex h-5 w-5 items-center justify-center rounded-full border-2 transition', glassIntensity === opt.value ? 'gradient-brand border-transparent' : 'border-app')}>
                        {glassIntensity === opt.value && <Check size={12} className="text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-strong">{opt.label}</p>
                        <p className="text-xs text-muted">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </SettingsGroup>
              )}

              <SettingsGroup title="Vista previa">
                <div className="p-4">
                  <ThemePreview resolved={resolved} mode={mode} glassIntensity={glassIntensity} />
                  <button
                    onClick={() => { setMode(mode); updateAppearance('themeMode', mode); }}
                    className="btn-primary mt-3 w-full py-2.5 text-sm"
                  >
                    <Check size={16} /> Aplicar tema
                  </button>
                </div>
              </SettingsGroup>
            </div>
          )}

          {section === 'legal' && (
            <div className="space-y-4">
              <SettingsGroup title="Legal">
                <button onClick={() => navigate({ name: 'legal', section: 'reglamento' })} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-[var(--vex-surface-2)]">
                  <div className="flex-1"><p className="text-sm font-semibold text-strong">Reglamento de la comunidad</p></div>
                  <ChevronRight size={18} className="text-muted" />
                </button>
                <button onClick={() => navigate({ name: 'legal', section: 'terminos' })} className="flex w-full items-center gap-3 border-t border-soft p-4 text-left transition hover:bg-[var(--vex-surface-2)]">
                  <div className="flex-1"><p className="text-sm font-semibold text-strong">Términos de uso</p></div>
                  <ChevronRight size={18} className="text-muted" />
                </button>
                <button onClick={() => navigate({ name: 'legal', section: 'privacidad' })} className="flex w-full items-center gap-3 border-t border-soft p-4 text-left transition hover:bg-[var(--vex-surface-2)]">
                  <div className="flex-1"><p className="text-sm font-semibold text-strong">Política de privacidad</p></div>
                  <ChevronRight size={18} className="text-muted" />
                </button>
              </SettingsGroup>
            </div>
          )}
        </div>
      </div>

      <button onClick={logout} className="btn-danger mt-5 w-full py-3 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/50">
        <LogOut size={18} /> Cerrar sesión
      </button>

      <p className="mt-6 text-center text-xs text-muted">Vexora v2.0 · Hecho con cariño</p>

      {showBlocked && (
        <BlockedUsersDialog
          blockedIds={currentUser.blockedUsers ?? []}
          getUser={getUserById}
          onUnblock={unblockUser}
          onClose={() => setShowBlocked(false)}
        />
      )}
    </div>
  );

  function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div>
        <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-muted">{title}</h2>
        <div className="card divide-y divide-[var(--vex-border-soft)]">{children}</div>
      </div>
    );
  }

  function SettingsRow({ label, desc }: { label: string; desc: string }) {
    return (
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-strong">{label}</p>
          <p className="truncate text-xs text-muted">{desc}</p>
        </div>
      </div>
    );
  }

  function PrivacySelectRow({ label, desc, icon: Icon, value, onChange, options }: {
    label: string;
    desc?: string;
    icon?: typeof Bell;
    value: string;
    onChange: (v: any) => void;
    options: Array<{ value: string; label: string }>;
  }) {
    return (
      <div className="flex items-center gap-3 p-4">
        {Icon && <Icon size={18} className="text-muted" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-strong">{label}</p>
          {desc && <p className="truncate text-xs text-muted">{desc}</p>}
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="shrink-0 rounded-lg border border-app bg-[var(--vex-surface-2)] px-3 py-1.5 text-xs font-semibold text-strong outline-none focus:border-brand-400"
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }

  function NotifRow({ icon: Icon, label, on, onChange }: { icon: typeof Bell; label: string; on: boolean; onChange: (v: boolean) => void }) {
    return (
      <div className="flex items-center gap-3 p-4">
        <Icon size={18} className="text-muted" />
        <div className="flex-1"><p className="text-sm font-semibold text-strong">{label}</p></div>
        <Toggle on={on} onChange={onChange} />
      </div>
    );
  }

  function BackupRow({ icon: Icon, label }: { icon: typeof Bell; label: string }) {
    const [checked, setChecked] = useState(true);
    return (
      <button onClick={() => setChecked(!checked)} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-[var(--vex-surface-2)]">
        <Icon size={18} className="text-muted" />
        <div className="flex-1"><p className="text-sm font-semibold text-strong">{label}</p></div>
        <div className={cn('flex h-5 w-5 items-center justify-center rounded-md border transition', checked ? 'gradient-brand border-transparent' : 'border-app')}>
          {checked && <Check size={14} className="text-white" />}
        </div>
      </button>
    );
  }
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(!on); }}
      className={cn('relative h-6 w-11 rounded-full transition', on ? 'gradient-brand' : 'bg-[var(--vex-border)]')}
    >
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

function BlockedUsersDialog({
  blockedIds, getUser, onUnblock, onClose,
}: {
  blockedIds: string[];
  getUser: (id: string) => UserType | undefined;
  onUnblock: (id: string) => void;
  onClose: () => void;
}) {
  const blocked = blockedIds.map((id) => getUser(id)).filter(Boolean) as UserType[];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--vex-overlay)] p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md animate-scale-in rounded-2xl border border-app bg-[var(--vex-surface)] shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-soft p-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
              <Ban size={18} className="text-red-600 dark:text-red-400" />
            </div>
            <h2 className="font-display text-lg font-bold text-strong">Usuarios bloqueados</h2>
          </div>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-[var(--vex-surface-2)]">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {blocked.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <Ban size={32} className="text-muted" />
              <p className="text-sm font-semibold text-strong">No hay usuarios bloqueados</p>
              <p className="text-xs text-muted">Las personas que bloquees aparecerán aquí.</p>
            </div>
          ) : (
            blocked.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-[var(--vex-surface-2)]">
                <Avatar user={u} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-strong">{fullName(u)}</p>
                  <p className="truncate text-xs text-muted">@{u.username}</p>
                </div>
                <button onClick={() => onUnblock(u.id)} className="rounded-lg bg-[var(--vex-surface-2)] px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/30">
                  Desbloquear
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ThemePreview({ resolved, mode, glassIntensity }: { resolved: 'light' | 'dark'; mode: ThemeMode; glassIntensity: 'soft' | 'medium' | 'intense' }) {
  const isGlass = mode === 'glass';
  const isDark = resolved === 'dark';
  const blurMap = { soft: '8px', medium: '14px', intense: '22px' };
  const blur = isGlass ? blurMap[glassIntensity] : undefined;
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-4',
        isGlass && '',
      )}
      style={{
        backgroundColor: isGlass
          ? isDark ? 'rgba(10,22,44,0.55)' : 'rgba(255,255,255,0.55)'
          : isDark ? '#020617' : '#F7F9FC',
        borderColor: isGlass ? (isDark ? 'rgba(99,130,200,0.20)' : 'rgba(148,163,184,0.28)') : (isDark ? '#1E293B' : '#E2E8F0'),
        backdropFilter: isGlass ? `blur(${blur})` : undefined,
      }}
    >
      {/* ambient aurora for glass */}
      {isGlass && (
        <div
          className="pointer-events-none absolute inset-0 -z-0"
          style={{
            background: isDark
              ? 'radial-gradient(50% 60% at 20% 20%, rgba(0,168,255,0.18) 0%, transparent 60%), radial-gradient(45% 55% at 80% 80%, rgba(124,58,237,0.16) 0%, transparent 60%)'
              : 'radial-gradient(50% 60% at 20% 20%, rgba(0,168,255,0.12) 0%, transparent 60%), radial-gradient(45% 55% at 80% 80%, rgba(124,58,237,0.10) 0%, transparent 60%)',
          }}
        />
      )}
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-brand" />
            <div>
              <p className="text-sm font-bold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>Vexora</p>
              <p className="text-[10px]" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                {mode === 'glass' ? 'Liquid Glass' : isDark ? 'Oscuro' : 'Claro'}
              </p>
            </div>
          </div>
          <div
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
            style={{ backgroundImage: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)' }}
          >
            Activo
          </div>
        </div>

        <div
          className="rounded-xl border p-3"
          style={{
            backgroundColor: isGlass
              ? isDark ? 'rgba(14,28,52,0.45)' : 'rgba(255,255,255,0.40)'
              : isDark ? '#071426' : '#FFFFFF',
            borderColor: isGlass ? (isDark ? 'rgba(99,130,200,0.12)' : 'rgba(148,163,184,0.18)') : (isDark ? '#1E293B' : '#E2E8F0'),
            backdropFilter: isGlass ? `blur(${blur})` : undefined,
          }}
        >
          <p className="text-xs font-semibold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>Tarjeta de ejemplo</p>
          <p className="mt-1 text-[11px]" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            Texto secundario dentro de una superficie.
          </p>
          <div className="mt-2.5 flex gap-2">
            <span
              className="rounded-lg px-2.5 py-1 text-[10px] font-semibold text-white"
              style={{ backgroundImage: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)' }}
            >
              Botón
            </span>
            <span
              className="rounded-lg border px-2.5 py-1 text-[10px] font-semibold"
              style={{
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
                color: isDark ? '#F8FAFC' : '#0F172A',
                backgroundColor: isGlass ? 'transparent' : (isDark ? '#0B1A30' : '#F8FAFC'),
              }}
            >
              Secundario
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }}>
            <div className="h-full w-2/3 rounded-full" style={{ backgroundImage: 'linear-gradient(135deg, #00A8FF 0%, #2563EB 50%, #A855F7 100%)' }} />
          </div>
          <Sparkles size={14} style={{ color: '#7C3AED' }} />
        </div>
      </div>
    </div>
  );
}
