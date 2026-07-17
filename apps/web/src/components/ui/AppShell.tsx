import type { ReactNode } from 'react';

export interface AppShellProps {
  eyebrow: string;
  title: string;
  summary: string;
  aside?: ReactNode;
  children: ReactNode;
}

export function AppShell({ eyebrow, title, summary, aside, children }: AppShellProps) {
  return (
    <main className="app-shell">
      <header className="shell-header">
        <div className="shell-heading">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="summary">{summary}</p>
        </div>
        {aside ? <div className="shell-header-aside">{aside}</div> : null}
      </header>
      {children}
    </main>
  );
}
