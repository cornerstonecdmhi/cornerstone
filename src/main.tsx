import { Sentry } from './instrument'; // MUST be first — Sentry.init() before any app code
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<div className="center muted" style={{ padding: 40 }}>Something went wrong. The team has been notified — please refresh.</div>}>
      <BrowserRouter>
        <AuthProvider audience="tms">
          <App />
        </AuthProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
