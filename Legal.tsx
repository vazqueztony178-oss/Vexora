import { AppProvider, useApp } from '@/context/AppContext';
import { RouterProvider, useRouter } from '@/context/RouterContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { TopBar } from '@/components/TopBar';
import { Welcome } from '@/pages/Welcome';
import { Register } from '@/pages/Register';
import { Verify } from '@/pages/Verify';
import { Login } from '@/pages/Login';
import { Recover } from '@/pages/Recover';
import { Legal } from '@/pages/Legal';
import { Home } from '@/pages/Home';
import { SearchPage } from '@/pages/SearchPage';
import { Messages } from '@/pages/Messages';
import { Notifications } from '@/pages/Notifications';
import { Profile } from '@/pages/Profile';
import { Settings } from '@/pages/Settings';
import { SavedPosts } from '@/pages/SavedPosts';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { Compass, Users as UsersIcon, ImageIcon, Video as VideoIcon, BookOpen, GraduationCap, Bot, Newspaper, Palette, Youtube, Star, Film, Gamepad2, ShoppingBag, Music } from 'lucide-react';

function Shell() {
  const { route } = useRouter();
  const { currentUser } = useApp();

  const authRoutes = ['welcome', 'register', 'verify', 'login', 'recover', 'legal'];
  const isAuthRoute = authRoutes.includes(route.name);

  if (isAuthRoute || !currentUser) {
    return (
      <div className="animate-fade-in">
        {route.name === 'welcome' && <Welcome />}
        {route.name === 'register' && <Register />}
        {route.name === 'verify' && <Verify userId={route.userId} />}
        {route.name === 'login' && <Login />}
        {route.name === 'recover' && <Recover />}
        {route.name === 'legal' && <Legal section={route.section} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--vex-bg)] text-[var(--vex-text)]">
      <TopBar />
      <main className="animate-fade-in">
        {route.name === 'home' && <Home />}
        {route.name === 'search' && <SearchPage />}
        {route.name === 'messages' && <Messages />}
        {route.name === 'notifications' && <Notifications />}
        {route.name === 'profile' && <Profile userId={route.userId} />}
        {route.name === 'saved' && <SavedPosts />}
        {route.name === 'settings' && <Settings />}
        {route.name === 'explore' && <PlaceholderPage title="Explorar" description="Descubre nuevas personas, tendencias y contenido de toda la comunidad Vexora." icon={<Compass size={28} />} />}
        {route.name === 'friends' && <PlaceholderPage title="Amigos" description="Gestiona tus amistades, encuentra personas nuevas y conecta con otros usuarios." icon={<UsersIcon size={28} />} />}
        {route.name === 'photos' && <PlaceholderPage title="Fotos" description="Explora todas las fotos de la comunidad y comparte tus momentos." icon={<ImageIcon size={28} />} />}
        {route.name === 'videos' && <PlaceholderPage title="Videos" description="Mira y comparte videos de toda la comunidad Vexora." icon={<VideoIcon size={28} />} />}
        {route.name === 'stories' && <PlaceholderPage title="Historias" description="Comparte momentos efímeros que desaparecen en 24 horas." icon={<BookOpen size={28} />} />}
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <RouterProvider>
          <Shell />
        </RouterProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
