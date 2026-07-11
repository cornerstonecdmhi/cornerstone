/**
 * useIdleTimeout — signs a user out after a period of inactivity.
 *
 * Clinical data protection for shared machines: after `timeoutMs` of no interaction
 * `onIdle` fires (sign-out). `warnMs` before that, `warning` becomes true so a modal
 * can offer "stay signed in". Activity = mouse / key / scroll / touch. Listeners are
 * passive and the timer is reset at most once a second, so it's cheap. A
 * visibilitychange check also fires the idle path if the tab was hidden past the
 * deadline (background timers are throttled).
 *
 * Mirrors the website-admin hook so both apps behave identically.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  timeoutMs: number;
  warnMs: number;
  onIdle: () => void;
  enabled?: boolean;
}

interface Result {
  warning: boolean;
  secondsLeft: number;
  stayActive: () => void;
}

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

export function useIdleTimeout({ timeoutMs, warnMs, onIdle, enabled = true }: Options): Result {
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(warnMs / 1000));

  const lastActivity = useRef<number>(Date.now());
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;
  const firedRef = useRef(false);

  const reset = useCallback(() => {
    lastActivity.current = Date.now();
    firedRef.current = false;
    setWarning(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let lastTick = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastTick < 1000) return;
      lastTick = now;
      if (!warning) lastActivity.current = now;
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const tick = () => {
      if (firedRef.current) return;
      const idle = Date.now() - lastActivity.current;
      if (idle >= timeoutMs) {
        firedRef.current = true;
        setWarning(false);
        onIdleRef.current();
      } else if (idle >= timeoutMs - warnMs) {
        setWarning(true);
        setSecondsLeft(Math.max(0, Math.ceil((timeoutMs - idle) / 1000)));
      } else if (warning) {
        setWarning(false);
      }
    };
    const interval = window.setInterval(tick, 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, [enabled, timeoutMs, warnMs, warning]);

  const stayActive = useCallback(() => reset(), [reset]);
  return { warning, secondsLeft, stayActive };
}
