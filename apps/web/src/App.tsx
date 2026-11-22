import { lazy, Suspense } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

const CompanionApp = lazy(() => import('./mochi-ui/App').then(module => ({ default: module.App })));
const LegacyApp = lazy(() => import('./LegacyApp').then(module => ({ default: module.App })));
const SignalsApp = lazy(() => import('./signals/SignalsApp').then(module => ({ default: module.SignalsApp })));
const signalPaths = new Set(['/signals', '/intent', '/check-ins', '/lab']);

export function App() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const signals = signalPaths.has(pathname);
  const winterOakRoute = pathname === '/oak';
  const legacyRoute = !signals && !winterOakRoute && (pathname !== '/' || searchParams.get('legacy') === '1');
  return <Suspense fallback={<p role="status">Loading your forest…</p>}>
    {signals ? <><Link className="experience-home-link" to="/">Forest home</Link><SignalsApp /></>
      : legacyRoute ? <LegacyApp /> : <CompanionApp />}
  </Suspense>;
}
