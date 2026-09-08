"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getVersionConfig,
  parseSiteVersion,
  setActiveVersion,
  SITE_VERSION,
  SITE_VERSION_COOKIE,
  SITE_VERSION_STORAGE_KEY,
  type SiteVersion,
  type SiteVersionConfig,
} from "@/lib/site-version";

interface SiteVersionContextValue {
  /** The currently active version (build-time default, overridable at runtime). */
  version: SiteVersion;
  /** Switch the active version. Persists to localStorage + cookie. */
  setVersion: (version: SiteVersion) => void;
  /** Config for the active version. */
  config: SiteVersionConfig;
}

const SiteVersionContext = createContext<SiteVersionContextValue | null>(null);

function readStoredVersion(): SiteVersion {
  if (typeof window === "undefined") return SITE_VERSION;
  try {
    const stored = window.localStorage.getItem(SITE_VERSION_STORAGE_KEY);
    return parseSiteVersion(stored) ?? SITE_VERSION;
  } catch {
    return SITE_VERSION;
  }
}

export function SiteVersionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [version, setVersionState] = useState<SiteVersion>(SITE_VERSION);

  // Hydrate from localStorage once on mount (avoids SSR mismatch).
  useEffect(() => {
    const stored = readStoredVersion();
    setVersionState(stored);
    setActiveVersion(stored);
  }, []);

  const setVersion = useCallback((next: SiteVersion) => {
    setVersionState(next);
    setActiveVersion(next);
    try {
      window.localStorage.setItem(SITE_VERSION_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode etc.) — cookie still works.
    }
    // Cookie lets server components (e.g. footer) react on the next request.
    document.cookie = `${SITE_VERSION_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  const value = useMemo<SiteVersionContextValue>(
    () => ({ version, setVersion, config: getVersionConfig(version) }),
    [version, setVersion],
  );

  return (
    <SiteVersionContext.Provider value={value}>
      {children}
    </SiteVersionContext.Provider>
  );
}

export function useSiteVersion(): SiteVersionContextValue {
  const ctx = useContext(SiteVersionContext);
  if (!ctx) {
    throw new Error("useSiteVersion must be used within <SiteVersionProvider>");
  }
  return ctx;
}
