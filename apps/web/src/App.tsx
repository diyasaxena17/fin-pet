import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

const CompanionApp = lazy(() => import('./mochi-ui/App').then(module => ({ default: module.App })));
const LegacyApp = lazy(() => import('./LegacyApp').then(module => ({ default: module.App })));
const SignalsApp = lazy(() => import('./signals/SignalsApp').then(module => ({ default: module.SignalsApp })));
const signalPaths = new Set(['/signals', '/intent', '/check-ins', '/lab']);

export function App() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const signals = signalPaths.has(pathname);
  const legacyRoute = !signals && (pathname !== '/' || searchParams.get('legacy') === '1');
  const [legacyMode, setLegacyMode] = useState(legacyRoute);
  useEffect(() => {
    if (signals) setLegacyMode(false);
    else if (legacyRoute) setLegacyMode(true);
  }, [signals, legacyRoute]);
  return <Suspense fallback={<p role="status">Loading your forest…</p>}>
    {signals ? <><Link className="text-link" to="/">Forest home</Link><SignalsApp /></>
      : legacyRoute || legacyMode ? <LegacyApp />
        : <><nav aria-label="Experience navigation" className="flex justify-center gap-4 p-2">
          <Link to="/signals">Behavioural tools</Link><Link to="/?legacy=1">Account dashboard</Link>
        </nav><CompanionApp /></>}
  </Suspense>;
}
