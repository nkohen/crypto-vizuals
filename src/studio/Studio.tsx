import { GraduationCap, Map as MapIcon, BookOpenText, MessagesSquare } from 'lucide-react';
import { useRoute, href, type Route } from './route';
import WeekPage, { WeekNav } from './WeekPage';
import HomePage from './HomePage';
import MapPage from './MapPage';
import TutorPage from './TutorPage';
import ProofRoute from './ProofRoute';

/**
 * The Prework Studio: the Cryptography Camp prework handouts, the pre-computed
 * learning-edge territory map for them, and ReductionLab's walk-throughs, in one
 * page. See docs/prework-studio-design.md.
 */
export default function Studio() {
  const route = useRoute();
  // ReductionLab keeps its own full-screen layout.
  if (route.view === 'proof') return <ProofRoute slug={route.slug} />;

  return (
    <div className="flex min-h-screen flex-col bg-ink-950 text-ink-100">
      <header className="sticky top-0 z-20 border-b border-ink-700/50 bg-ink-900/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <a href={href.home()} className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-500/30 bg-gradient-to-br from-accent-500/30 to-accent-700/20">
              <GraduationCap size={18} className="text-accent-300" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight text-ink-50">Prework Studio</span>
              <span className="block truncate text-[11px] leading-tight text-ink-400">Cryptography Camp</span>
            </span>
          </a>
          <nav aria-label="Studio" className="ml-auto flex items-center gap-1 text-sm">
            <NavLink route={route} to="week" target={href.week(currentWeek(route))} icon={<BookOpenText size={15} />} label="Handouts" />
            <NavLink route={route} to="map" target={href.map()} icon={<MapIcon size={15} />} label="Map" />
            <NavLink route={route} to="tutor" target={href.tutor()} icon={<MessagesSquare size={15} />} label="Tutor" />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {route.view === 'home' && <HomePage />}
        {route.view === 'week' && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-20">
                <WeekNav current={route.week} />
              </div>
            </aside>
            <div className="mx-auto w-full max-w-3xl">
              <WeekPage week={route.week} anchor={route.anchor} />
            </div>
          </div>
        )}
        {route.view === 'map' && <MapPage selected={route.node} />}
        {route.view === 'tutor' && <TutorPage />}
      </main>
    </div>
  );
}

let lastWeek = '1';
function currentWeek(route: Route) {
  if (route.view === 'week') lastWeek = route.week;
  return lastWeek;
}

function NavLink({ route, to, target, icon, label }: { route: Route; to: Route['view']; target: string; icon: React.ReactNode; label: string }) {
  const on = route.view === to;
  return (
    <a
      href={target}
      aria-current={on ? 'page' : undefined}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition ${on ? 'bg-accent-500/15 text-accent-200' : 'text-ink-300 hover:bg-ink-800/70 hover:text-ink-100'}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </a>
  );
}
