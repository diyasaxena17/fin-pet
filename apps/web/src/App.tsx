import { NavLink, Route, Routes } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Onboarding } from './pages/Onboarding';
import { Tap } from './pages/Tap';
import { FutureMe } from './pages/FutureMe';

export function App() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-5">
        <NavLink to="/" className="text-3xl font-bold tracking-tight">Mochi<span className="text-violet-600">.</span></NavLink>
        <nav aria-label="Main navigation" className="flex flex-wrap gap-4 text-sm font-medium">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/onboarding">Onboarding</NavLink>
          <NavLink to="/tap">Tap</NavLink>
          <NavLink to="/future-me">Future Me</NavLink>
        </nav>
      </header>
      <main><Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/tap" element={<Tap />} />
        <Route path="/future-me" element={<FutureMe />} />
        <Route path="*" element={<p>Page not found.</p>} />
      </Routes></main>
    </div>
  );
}
