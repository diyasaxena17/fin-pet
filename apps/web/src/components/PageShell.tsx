import type { ReactNode } from 'react';

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return <section className="page-card rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
    <h1 className="mb-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
    <div className="leading-relaxed text-slate-600">{children}</div>
  </section>;
}
