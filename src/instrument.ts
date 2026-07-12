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

// Injected by vite.config `define` at build time (falls back to 'dev').
declare const __GIT_COMMIT__: string;
declare const __GIT_BRANCH__: string;
declare const __BUILD_TIME__: string;
const GIT_COMMIT = typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : 'dev';
const GIT_BRANCH = typeof __GIT_BRANCH__ !== 'undefined' ? __GIT_BRANCH__ : 'dev';
const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';

/** Build stamp for UI display + bug reports: version + commit + branch + time. */
export const BUILD_INFO = { version: APP_VERSION, commit: GIT_COMMIT, branch: GIT_BRANCH, buildTime: BUILD_TIME };

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: (import.meta.env.VITE_SENTRY_ENV as string) || (import.meta.env.DEV ? 'development' : 'pilot'),
  release: `${APP_VERSION}+${GIT_COMMIT}`,

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

// Tag every event with the build so debugging maps to a commit / branch / build time.
if (dsn) Sentry.setTags({ git_commit: GIT_COMMIT, git_branch: GIT_BRANCH, build_time: BUILD_TIME });

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
