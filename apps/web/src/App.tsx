import { useEffect, useRef } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Settings } from './pages/Settings';
import { CheckIn } from './pages/CheckIn';
import { Dashboard } from './pages/Dashboard';
import { Onboarding } from './pages/Onboarding';
import { Tap } from './pages/Tap';
import { FutureMe } from './pages/FutureMe';
import { SignalsPage } from './signals/SignalsPage';
import { SignalsProvider } from './signals/store';
import { Hud } from './components/Hud';
import { useAppState } from './lib/appState';

const tabs = [
  { to: '/', label: 'Home', icon: '🌳', end: true }, { to: '/signals', label: 'Signals', icon: '📡' }, { to: '/check-in', label: 'Check-in', icon: '✅' },
  { to: '/tap?petId=mochi-01', label: 'Feed', icon: '🌰' }, { to: '/future-me', label: 'Future Me', icon: '✉️' }, { to: '/settings', label: 'Settings', icon: '⚙️' },
] as const;

export function App() {
  const { state, error, reload } = useAppState();
  const { pathname } = useLocation();
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 0; }, [pathname]);
  return (
    <SignalsProvider>
      <div className="wo-stage">
        <div className="wo-phone">
          {state?.initialized ? <Hud state={state} /> : <header className="wo-hud wo-hud-plain"><span className="wo-status"><i aria-hidden="true" />Mochi</span><small>little steps, lasting change</small></header>}
          <div className="wo-scroll" ref={scroller}>
            <main className="wo-main">
              {state?.initialized && state.demoSeeded ? <p role="status" className="demo-banner mb-5 rounded-2xl p-3 font-semibold">✦ DEMO MODE · progress has been seeded for preview</p> : null}
              {error ? <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p> : null}
              {state === null ? <p role="status">{error ? <button onClick={reload}>Retry loading</button> : 'Loading Mochi…'}</p> : <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/signals" element={<SignalsPage />} />
                <Route path="/check-in" element={<CheckIn />} />
                <Route path="/tap" element={<Tap />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/future-me" element={<FutureMe />} />
                <Route path="*" element={<p>Page not found.</p>} />
              </Routes>}
            </main>
          </div>
          <nav aria-label="Main navigation" className="wo-nav">
            {tabs.map((t) => <NavLink key={t.to} to={t.to} end={'end' in t}><span aria-hidden="true">{t.icon}</span><small>{t.label}</small></NavLink>)}
          </nav>
          <div id="wo-overlay" />
        </div>
      </div>
    </SignalsProvider>
  );
}
