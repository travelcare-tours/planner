'use client';

import { useEffect } from 'react';

/**
 * GlobalErrorHandler catches and suppresses raw DOM Event errors
 * and unhandled promise rejections that reject with DOM Event objects
 * (e.g. image load errors, resource network errors, clipboard failures)
 * which trigger the Next.js dev overlay "Runtime Error: [object Event]".
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleWindowError = (event: ErrorEvent) => {
      // In Next.js dev mode, resource errors (such as <img> or <link> failures)
      // trigger error events where event.error is null/undefined, or where
      // the error is a raw Event object instead of an Error instance.
      const isRawEvent =
        !event.error ||
        event.error instanceof Event ||
        String(event.error) === '[object Event]' ||
        (event.target && event.target !== window);

      if (isRawEvent) {
        // Prevent default error overlay from popping up for non-fatal resource events
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // If a promise is rejected with a DOM Event, empty value, or [object Event]
      const reason = event.reason;
      const isRawEvent =
        !reason ||
        reason instanceof Event ||
        String(reason) === '[object Event]' ||
        (typeof reason === 'object' && reason !== null && 'target' in reason && 'type' in reason);

      if (isRawEvent) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('error', handleWindowError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Disable mouse wheel from changing values on number inputs across the app
    const handleWheel = (event: WheelEvent) => {
      const activeEl = document.activeElement;
      if (activeEl instanceof HTMLInputElement && activeEl.type === 'number') {
        activeEl.blur();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('error', handleWindowError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return null;
}
