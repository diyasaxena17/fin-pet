import type { ReactNode } from 'react';

export function Feedback({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
  return <div className={`feedback feedback--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function LoadingState({ children = 'Loading…' }: { children?: ReactNode }) {
  return <p className="loading-state" role="status"><span className="loading-dot" aria-hidden="true" />{children}</p>;
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="empty-state"><span aria-hidden="true">🌱</span><div><strong>{title}</strong><p>{children}</p></div></div>;
}
