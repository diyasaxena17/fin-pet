import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { Budget } from './pages/Budget';
import { CheckIn } from './pages/CheckIn';
import { Dashboard } from './pages/Dashboard';
import { FutureMe } from './pages/FutureMe';
import { Insights } from './pages/Insights';
import { Learn } from './pages/Learn';
import { Onboarding } from './pages/Onboarding';
import { Settings } from './pages/Settings';
import { WinterOak } from './pages/WinterOak';
import { Tap } from './pages/Tap';
import { TopicForest } from './pages/TopicForest';
import { Feedback, LoadingState } from './components/Feedback';
import { useAppState } from './lib/appState';

const tabs = [
  { to: '/?legacy=1', label: 'Forest', end: true }, { to: '/budget', label: 'Budget' },
  { to: '/insights', label: 'Insights' }, { to: '/learn', label: 'Learn' }, { to: '/oak', label: 'Winter Oak' }, { to: '/future', label: 'Future' },
];
export function App() {
  const { state, error, reload } = useAppState();
  return <div className="app-frame mx-auto max-w-6xl px-4 pb-12 pt-4 sm:px-7 sm:pt-7">
    <header className="app-header mb-5 rounded-3xl px-4 py-4 sm:mb-8 sm:px-6"><div className="brand-row">
      <NavLink to="/?legacy=1" className="brand" aria-label="Squirrel and Tree, Forest"><span className="brand-mark" aria-hidden="true">🌳</span><span><strong>Squirrel &amp; Tree</strong><small>small habits, room to grow</small></span></NavLink>
      <div className="flex items-center gap-2"><NavLink className="report-shortcut" to="/report">Daily report <span aria-hidden="true">↗</span></NavLink><NavLink className="report-shortcut" to="/settings">Settings</NavLink></div>
    </div><nav aria-label="Main navigation" className="main-tabs">{tabs.map(({ to, label, end }) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}</nav></header>
    <main>{state?.initialized && state.demoSeeded ? <Feedback kind="info"><strong>DEMO DATA</strong> · seeded progress is for preview only.</Feedback> : null}
      {error ? <div className="global-error"><Feedback kind="error">{error}</Feedback><button className="button--quiet" onClick={reload}>Retry loading</button></div> : null}
      {state === null ? <LoadingState>Connecting to your forest…</LoadingState> : <Routes>
        <Route path="/" element={<Dashboard />} /><Route path="/onboarding" element={<Onboarding />} />
        <Route path="/budget" element={<Budget />} /><Route path="/insights" element={<Insights />} /><Route path="/learn" element={<Learn />} /><Route path="/oak" element={<WinterOak />} />
        <Route path="/future" element={<FutureMe />} /><Route path="/future-me" element={<Navigate to="/future" replace />} />
        <Route path="/report" element={<CheckIn />} /><Route path="/check-in" element={<Navigate to="/report" replace />} /><Route path="/tap" element={<TopicForest />} /><Route path="/topics" element={<TopicForest />} /><Route path="/feed" element={<Tap />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<section className="empty-state"><div><strong>That path isn’t in this forest.</strong><p><NavLink className="text-link" to="/">Go to Forest</NavLink></p></div></section>} />
      </Routes>}</main><footer className="app-footer">Your goals and choices stay yours. Spending records are separate from savings.</footer>
  </div>;
}
