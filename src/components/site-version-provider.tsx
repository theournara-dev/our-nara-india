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

function readStoredVersion(fallback: SiteVersion): SiteVersion {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(SITE_VERSION_STORAGE_KEY);
    return parseSiteVersion(stored) ?? fallback;
  } catch {
    return fallback;
  }
}

export function SiteVersionProvider({
  children,
  initialVersion = SITE_VERSION,
}: {
  children: React.ReactNode;
  /**
   * The version resolved for this request (from the host header in the server
   * layout). Both prod domains share one deployment, so the build-time
   * SITE_VERSION can't tell them apart — the host can. Falls back to
   * SITE_VERSION when not provided.
   */
  initialVersion?: SiteVersion;
}) {
  const [version, setVersionState] = useState<SiteVersion>(initialVersion);

  // Hydrate from localStorage once on mount (avoids SSR mismatch). A stored
  // value represents an explicit user pick and wins over the host-derived
  // default; without one the host-derived initial render stays.
  useEffect(() => {
    const stored = readStoredVersion(initialVersion);
    setVersionState(stored);
    setActiveVersion(stored);
  }, [initialVersion]);

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
