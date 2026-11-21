import { NavLink, Route, Routes } from 'react-router-dom';
import { Settings } from './pages/Settings';
import { CheckIn } from './pages/CheckIn';
import { Dashboard } from './pages/Dashboard';
import { Onboarding } from './pages/Onboarding';
import { Tap } from './pages/Tap';
import { FutureMe } from './pages/FutureMe';
import { useAppState } from './lib/appState';

export function App() {
  const { state, error, reload } = useAppState();
  return (
    <div className="app-frame mx-auto max-w-5xl px-4 pb-12 pt-5 sm:px-7 sm:pt-8">
      <header className="app-header mb-8 flex flex-wrap items-center justify-between gap-5 rounded-3xl px-5 py-4 sm:px-7">
        <NavLink to="/" className="brand flex items-center gap-3 text-2xl font-bold tracking-tight"><span className="brand-mark" aria-hidden="true">m</span><span>Mochi<span className="text-violet-600">.</span><small className="block text-xs font-medium tracking-wide text-slate-500">little steps, lasting change</small></span></NavLink>
        <nav aria-label="Main navigation" className="flex flex-wrap gap-2 text-sm font-semibold">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/check-in">Check-in</NavLink>
          <NavLink to="/tap?petId=mochi-01">Feed</NavLink>
          <NavLink to="/future-me">Future Me</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <main>
        {state?.initialized && state.demoSeeded ? <p role="status" className="demo-banner mb-5 rounded-2xl p-3 font-semibold">✦ DEMO MODE · progress has been seeded for preview</p> : null}
        {error ? <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p> : null}
        {state === null ? <p role="status">{error ? <button onClick={reload}>Retry loading</button> : 'Loading Mochi…'}</p> : <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/check-in" element={<CheckIn />} />
        <Route path="/tap" element={<Tap />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/future-me" element={<FutureMe />} />
        <Route path="*" element={<p>Page not found.</p>} />
      </Routes>}
      </main>
    </div>
  );
}
