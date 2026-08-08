import { useRouter } from '@/context/RouterContext';
import { Logo, Wordmark } from '@/components/Logo';
import { ArrowLeft, ScrollText, FileText, Lock } from 'lucide-react';

const SECTIONS: Array<{ section: 'reglamento' | 'terminos' | 'privacidad'; title: string; icon: typeof ScrollText; updated: string }> = [
  { section: 'reglamento', title: 'Reglamento de la comunidad', icon: ScrollText, updated: '7 de agosto de 2026' },
  { section: 'terminos', title: 'Términos de uso', icon: FileText, updated: '7 de agosto de 2026' },
  { section: 'privacidad', title: 'Política de privacidad', icon: Lock, updated: '7 de agosto de 2026' },
];

const CONTENT: Record<string, Array<{ heading: string; body: string[] }>> = {
  reglamento: [
    {
      heading: '1. Objeto del reglamento',
      body: [
        'El presente Reglamento establece las normas de convivencia que todos los miembros de Vexora deben respetar para mantener un espacio seguro, respetuoso y agradable para todas las personas.',
        'El uso de Vexora implica la aceptación íntegra de este Reglamento, así como de los Términos de uso y la Política de privacidad.',
      ],
    },
    {
      heading: '2. Conducta de los usuarios',
      body: [
        'Está prohibido publicar contenido que sea difamatorio, amenazante, acosador, discriminatorio o que incite al odio o la violencia.',
        'No se permite suplantar la identidad de otra persona ni crear cuentas falsas con el fin de engañar a otros usuarios.',
        'Se debe respetar a los demás miembros. El acoso, el bullying y las amenazas conllevan la suspensión inmediata de la cuenta.',
      ],
    },
    {
      heading: '3. Contenido permitido',
      body: [
        'Puedes compartir textos, imágenes y enlaces que sean tuyos o que tengas permiso para publicar.',
        'No se permite publicar material con derechos de autor sin autorización, contenido explícito no consentido, spam o material ilegal.',
        'Vexora se reserva el derecho de eliminar contenido que infrinja este reglamento sin previo aviso.',
      ],
    },
    {
      heading: '4. Seguridad y reportes',
      body: [
        'Si detectas una conducta inadecuada, puedes reportarla al equipo de moderación desde las opciones de cada publicación o perfil.',
        'Vexora investiga los reportes de forma confidencial y toma medidas proporcionales a la gravedad de la infracción.',
      ],
    },
    {
      heading: '5. Sanciones',
      body: [
        'Las infracciones pueden derivar en advertencias, eliminación de contenido, suspensión temporal o cancelación definitiva de la cuenta.',
        'Las decisiones del equipo de moderación son definitivas y buscan proteger a la comunidad.',
      ],
    },
  ],
  terminos: [
    {
      heading: '1. Aceptación de los términos',
      body: [
        'Al registrarte y usar Vexora aceptas los presentes Términos de uso. Si no estás de acuerdo con alguno de ellos, debes dejar de utilizar la plataforma.',
      ],
    },
    {
      heading: '2. Descripción del servicio',
      body: [
        'Vexora es una red social que permite a las personas conectarse, compartir contenido y comunicarse entre sí.',
        'El servicio se ofrece tal cual y puede ser actualizado, modificado o discontinuado parcial o totalmente en cualquier momento.',
      ],
    },
    {
      heading: '3. Registro y cuenta',
      body: [
        'Para crear una cuenta debes proporcionar información veraz y mantenerla actualizada.',
        'Eres responsable de mantener la confidencialidad de tu contraseña y de toda la actividad que ocurra desde tu cuenta.',
        'La edad mínima para usar Vexora es de 13 años.',
      ],
    },
    {
      heading: '4. Licencia sobre el contenido',
      body: [
        'Mantienes la titularidad de todo el contenido que publiques. Al publicarlo, otorgas a Vexora una licencia no exclusiva, gratuita y mundial para mostrarlo dentro de la plataforma.',
        'Puedes eliminar tu contenido en cualquier momento, lo que también suprime la licencia concedida.',
      ],
    },
    {
      heading: '5. Limitación de responsabilidad',
      body: [
        'Vexora no se hace responsable de los daños directos o indirectos derivados del uso o la imposibilidad de uso del servicio.',
        'El servicio se proporciona con fines de entretenimiento y conexión social, sin garantía de disponibilidad continua.',
      ],
    },
  ],
  privacidad: [
    {
      heading: '1. Información que recopilamos',
      body: [
        'Recopilamos la información que nos proporcionas al registrarte: nombre, apellidos, nombre de usuario, correo electrónico, correo alternativo, fecha de nacimiento y foto de perfil.',
        'También recopilamos el contenido que publicas y las interacciones que realizas dentro de la plataforma.',
      ],
    },
    {
      heading: '2. Uso de la información',
      body: [
        'Utilizamos tu información para crear y mantener tu cuenta, mostrar tu perfil a otros usuarios, permitir la interacción social y mejorar la experiencia de la plataforma.',
        'No vendemos tus datos personales a terceros.',
      ],
    },
    {
      heading: '3. Visibilidad del perfil',
      body: [
        'Tu nombre, nombre de usuario, foto de perfil y publicaciones pueden ser vistos por otros usuarios de Vexora.',
        'Puedes gestionar parte de tu visibilidad desde la configuración de tu cuenta.',
      ],
    },
    {
      heading: '4. Almacenamiento local',
      body: [
        'En esta versión de demostración, tus datos se almacenan únicamente en tu navegador mediante almacenamiento local (localStorage). No se envían a servidores externos.',
        'Al limpiar los datos de tu navegador, toda la información almacenada localmente se eliminará de forma permanente.',
      ],
    },
    {
      heading: '5. Tus derechos',
      body: [
        'Puedes acceder, modificar o eliminar tu información en cualquier momento desde la configuración de tu cuenta.',
        'Tienes derecho a solicitar la eliminación de tu cuenta y de todo el contenido asociado.',
      ],
    },
  ],
};

export function Legal({ section }: { section: 'reglamento' | 'terminos' | 'privacidad' }) {
  const { navigate, back } = useRouter();
  const meta = SECTIONS.find((s) => s.section === section)!;
  const Icon = meta.icon;
  const blocks = CONTENT[section];

  return (
    <div className="min-h-screen bg-[var(--vex-bg)]">
      <header className="sticky top-0 z-10 border-b border-app bg-[var(--vex-surface)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <button onClick={back} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-strong">
            <ArrowLeft size={18} /> Volver
          </button>
          <button onClick={() => navigate({ name: 'welcome' })} className="flex items-center gap-2">
            <span className="vex-logo-hover flex items-center gap-2">
              <Logo size={32} />
              <Wordmark className="text-lg" />
            </span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10">
        <div className="mb-8 flex items-center gap-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-brand text-white shadow-glow">
            <Icon size={26} />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-strong">{meta.title}</h1>
            <p className="text-sm text-muted">Última actualización: {meta.updated}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <button
              key={s.section}
              onClick={() => navigate({ name: 'legal', section: s.section })}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                s.section === section ? 'gradient-brand text-white shadow-soft' : 'bg-[var(--vex-surface)] text-muted border border-app hover:bg-[var(--vex-surface-2)]'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        <article className="mt-8 space-y-8">
          {blocks.map((b) => (
            <section key={b.heading} className="card p-6">
              <h2 className="font-display text-xl font-bold text-strong">{b.heading}</h2>
              <div className="mt-3 space-y-3">
                {b.body.map((p, i) => (
                  <p key={i} className="leading-relaxed text-app">{p}</p>
                ))}
              </div>
            </section>
          ))}
        </article>

        <p className="mt-10 text-center text-sm text-muted">
          ¿Tienes dudas sobre este documento? Escríbenos a soporte@vexora.com
        </p>
      </div>
    </div>
  );
}
