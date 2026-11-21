import type { ReactNode } from 'react';

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-3xl border border-violet-100 bg-white p-7 shadow-sm">
    <h1 className="mb-4 text-2xl font-semibold tracking-tight">{title}</h1>
    <div className="leading-relaxed text-slate-600">{children}</div>
  </section>;
}
