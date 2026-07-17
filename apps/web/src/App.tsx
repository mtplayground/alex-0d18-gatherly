import { useEffect, useState } from 'react';
import type { HealthResponse } from '@app/shared';
import { apiRequest } from './lib/api';

type ApiState =
  | { status: 'loading' }
  | { status: 'ready'; health: HealthResponse }
  | { status: 'error'; message: string };

export function App() {
  const [apiState, setApiState] = useState<ApiState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    apiRequest<HealthResponse>('/api/health')
      .then((health) => {
        if (active) {
          setApiState({ status: 'ready', health });
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const message = err instanceof Error ? err.message : 'API request failed';
          setApiState({ status: 'error', message });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Project scaffold</p>
        <h1>Event planning workspace</h1>
        <p className="summary">
          The SPA, API, and shared contract package are ready for the feature issues that follow.
        </p>
        <div className="status-panel" aria-live="polite">
          <span className={`status-dot status-dot--${apiState.status}`} />
          <span>{renderStatus(apiState)}</span>
        </div>
      </section>
    </main>
  );
}

function renderStatus(apiState: ApiState): string {
  if (apiState.status === 'loading') {
    return 'Checking API connection...';
  }

  if (apiState.status === 'error') {
    return apiState.message;
  }

  return `API ${apiState.health.status} at ${apiState.health.timestamp}`;
}
