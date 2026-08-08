import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type Route =
  | { name: 'welcome' }
  | { name: 'register' }
  | { name: 'verify'; userId: string }
  | { name: 'login' }
  | { name: 'recover' }
  | { name: 'legal'; section: 'reglamento' | 'terminos' | 'privacidad' }
  | { name: 'home' }
  | { name: 'search' }
  | { name: 'messages' }
  | { name: 'notifications' }
  | { name: 'profile'; userId?: string }
  | { name: 'saved' }
  | { name: 'settings' }
  | { name: 'explore' }
  | { name: 'friends' }
  | { name: 'photos' }
  | { name: 'videos' }
  | { name: 'stories' };

interface RouterState {
  route: Route;
  navigate: (r: Route) => void;
  back: () => void;
}

const RouterContext = createContext<RouterState | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: 'welcome' }]);

  const navigate = useCallback((r: Route) => {
    setStack((prev) => [...prev, r]);
    window.scrollTo({ top: 0 });
  }, []);

  const back = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  return (
    <RouterContext.Provider value={{ route: stack[stack.length - 1], navigate, back }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterState {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
