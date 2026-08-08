import { useRouter } from '@/context/RouterContext';
import type { Route } from '@/context/RouterContext';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: ReactNode;
  externalLinks?: Array<{ label: string; url: string; icon?: ReactNode }>;
}

export function PlaceholderPage({ title, description, icon, externalLinks }: PlaceholderPageProps) {
  const { navigate } = useRouter();
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button onClick={() => navigate({ name: 'home' })} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-strong">
        <ArrowLeft size={16} /> Volver
      </button>
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand text-white">{icon}</div>
        <h1 className="font-display text-xl font-bold text-strong">{title}</h1>
        <p className="max-w-sm text-sm text-muted">{description}</p>
        {externalLinks && externalLinks.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {externalLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-app bg-[var(--vex-surface-2)] px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/30"
              >
                {link.icon} {link.label} <ExternalLink size={14} />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function makeRoute(name: string): Route {
  return { name } as unknown as Route;
}
