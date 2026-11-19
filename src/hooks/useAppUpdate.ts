import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface VersionManifest {
  version: string;
  builtAt?: string;
}

const POLL_INTERVAL_MS = 3 * 60 * 1000; // Check every 3 minutes while open
const MIN_CHECK_GAP_MS = 20 * 1000; // Throttle rapid focus/visibility switches
const RELOAD_GUARD_KEY = 'friends_tracker_reloaded_version';

export interface AppUpdateState {
  updateAvailable: boolean;
  isUpdating: boolean;
  currentVersion: string;
  latestVersion: string | null;
  applyUpdate: () => Promise<void>;
  dismissUpdate: () => void;
  checkForUpdates: () => Promise<void>;
}

/**
 * Safely clears stale Cache Storage buckets (Workbox / static asset caches)
 * while strictly preserving localStorage (member login, theme, PINs, pending ops)
 * and IndexedDB (Firestore offline cache & Firebase Auth persistence).
 */
async function clearStaleAssetCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cacheNames = await window.caches.keys();
    await Promise.all(
      cacheNames.map((name) => {
        // Keep Google Fonts caches to avoid unnecessary font re-downloads; purge all app/workbox asset caches
        if (name === 'google-fonts-cache' || name === 'gstatic-fonts-cache') {
          return Promise.resolve(false);
        }
        return window.caches.delete(name);
      })
    );
  } catch {
    // Cache Storage may be restricted in private/iframe contexts
  }
}

/**
 * Removes any legacy root-scoped firebase-messaging-sw.js registration that could
 * block the main PWA /sw.js from updating on existing member devices.
 */
async function cleanupLegacyRootFcmWorker(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      const scriptUrl =
        reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
      const scopePath = new URL(reg.scope).pathname;
      if (scopePath === '/' && scriptUrl.endsWith('/firebase-messaging-sw.js')) {
        await reg.unregister();
      }
    }
  } catch {
    // Ignore errors in restricted browser environments
  }
}

export function useAppUpdate(): AppUpdateState {
  const currentVersion =
    typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const hasWaitingSwRef = useRef(false);
  const isReloadingRef = useRef(false);
  const lastCheckAtRef = useRef(0);

  const triggerReloadOnce = useCallback(() => {
    if (isReloadingRef.current) return;
    isReloadingRef.current = true;
    window.location.reload();
  }, []);

  const checkServerVersion = useCallback(
    async (force = false) => {
      if (typeof window === 'undefined' || !navigator.onLine) return;
      const now = Date.now();
      if (!force && now - lastCheckAtRef.current < MIN_CHECK_GAP_MS) {
        return;
      }
      lastCheckAtRef.current = now;

      // 1. Trigger browser-level Service Worker byte-diff check
      try {
        await registrationRef.current?.update();
      } catch {
        // Ignore transient offline/network update errors
      }

      // 2. Poll uncached /version.json to catch HTTP/CDN/PWA cache drift
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });
        if (!res.ok) return;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return;

        const data = (await res.json()) as VersionManifest;
        if (data?.version && data.version !== currentVersion) {
          // Guard against infinite prompts if we literally just reloaded into this exact version
          const lastReloaded = sessionStorage.getItem(RELOAD_GUARD_KEY);
          if (lastReloaded === data.version) {
            return;
          }
          setLatestVersion(data.version);
          setUpdateAvailable(true);
        }
      } catch {
        // Ignore offline or blocked fetches
      }
    },
    [currentVersion]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    const init = async () => {
      await cleanupLegacyRootFcmWorker();
      if (!isMounted) return;

      // Register VitePWA Service Worker with controlled prompt lifecycle
      try {
        const updateSW = registerSW({
          immediate: true,
          onNeedRefresh() {
            if (!isMounted) return;
            hasWaitingSwRef.current = true;
            setUpdateAvailable(true);
          },
          onRegisteredSW(_swUrl, registration) {
            if (!isMounted || !registration) return;
            registrationRef.current = registration;
            // Immediately check for newer SW on launch
            registration.update().catch(() => {});
          },
          onRegisterError(error) {
            console.info('[PWA] Service Worker registration skipped:', error);
          },
        });
        updateSWRef.current = updateSW;
      } catch (err) {
        console.info('[PWA] Service Worker unavailable in this environment:', err);
      }
    };

    init();

    // Reload automatically once the newly activated Service Worker takes control after user confirmation
    const handleControllerChange = () => {
      if (isUpdating || hasWaitingSwRef.current) {
        triggerReloadOnce();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    // Initial version check shortly after mount
    const startupTimer = window.setTimeout(() => {
      checkServerVersion(true);
    }, 1500);

    // Periodic background update check while app remains open
    const intervalId = window.setInterval(() => {
      checkServerVersion(false);
    }, POLL_INTERVAL_MS);

    // Check immediately when returning to the PWA on mobile or regaining connectivity
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkServerVersion(false);
      }
    };
    const handleOnline = () => {
      checkServerVersion(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      isMounted = false;
      window.clearTimeout(startupTimer);
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
    };
  }, [checkServerVersion, isUpdating, triggerReloadOnce]);

  const applyUpdate = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      if (latestVersion) {
        sessionStorage.setItem(RELOAD_GUARD_KEY, latestVersion);
      }

      // 1. Purge only stale asset caches (never touches localStorage or Firestore IndexedDB)
      await clearStaleAssetCaches();

      // 2. If a new Service Worker is waiting, instruct it to activate immediately
      if (updateSWRef.current && hasWaitingSwRef.current) {
        await updateSWRef.current(true);
      } else if (registrationRef.current) {
        await registrationRef.current.update().catch(() => {});
        const waiting = registrationRef.current.waiting;
        if (waiting) {
          waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    } catch {
      // Fallback straight to reload
    }

    // 3. Guaranteed clean reload even if update came via version.json without a waiting SW
    window.setTimeout(() => {
      triggerReloadOnce();
    }, 450);
  }, [isUpdating, latestVersion, triggerReloadOnce]);

  const dismissUpdate = useCallback(() => {
    setDismissedVersion(latestVersion || 'waiting-sw');
  }, [latestVersion]);

  const effectiveVersionKey = latestVersion || 'waiting-sw';
  const shouldShow = updateAvailable && dismissedVersion !== effectiveVersionKey;

  return {
    updateAvailable: shouldShow,
    isUpdating,
    currentVersion,
    latestVersion,
    applyUpdate,
    dismissUpdate,
    checkForUpdates: () => checkServerVersion(true),
  };
}
