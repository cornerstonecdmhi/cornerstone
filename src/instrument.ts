/**
 * Sentry initialisation — imported first, before any app code (main.tsx /
 * portal-main.tsx). Mirrors the website config.
 *
 * Healthcare-safe + cost-conscious:
 *  - Errors only. NO performance tracing, NO session replay.
 *  - DSN from VITE_SENTRY_DSN — never hardcoded; inert without it.
 *  - Only the signed-in user's id + role is attached — never a name, email, phone,
 *    or any patient / clinical data. beforeSend strips PII.
 */
import * as Sentry from '@sentry/react';
import { APP_VERSION } from './version';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: (import.meta.env.VITE_SENTRY_ENV as string) || (import.meta.env.DEV ? 'development' : 'pilot'),
  release: APP_VERSION,

  // Keep Sentry's DEFAULT integrations (global error + unhandledrejection handlers) by
  // NOT passing `integrations`; tracing/replay are never added.
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  sendDefaultPii: false,

  beforeSend(event) {
    if (event.request) {
      delete (event.request as any).cookies;
      delete (event.request as any).data;
      if (event.request.headers) { delete (event.request.headers as any).Authorization; delete (event.request.headers as any).Cookie; }
    }
    if (event.user) {
      delete (event.user as any).email;
      delete (event.user as any).username;
      delete (event.user as any).ip_address;
    }
    return event;
  },

  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'ui.input') return null;
    return breadcrumb;
  },
});

/** Attach ONLY id + role — never name / email / patient data. */
export function setSentryUser(id?: string | null, role?: string | null) {
  if (!dsn) return;
  if (id) {
    Sentry.setUser({ id });
    Sentry.setTag('role', role || 'unknown');
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
