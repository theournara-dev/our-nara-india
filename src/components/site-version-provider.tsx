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
import { FREE_SHIPPING, type ShippingSettings } from "@/lib/shipping";

interface SiteVersionContextValue {
  /** The currently active version (build-time default, overridable at runtime). */
  version: SiteVersion;
  /** Switch the active version. Persists to localStorage + cookie. */
  setVersion: (version: SiteVersion) => void;
  /** Config for the active version. */
  config: SiteVersionConfig;
  /**
   * Delivery pricing for the active store. Comes from the server layout (which
   * reads both versions) so the cart, the quick-buy sheet and the product page
   * all show the same fee and the same free-shipping progress.
   */
  shipping: ShippingSettings;
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
  shippingByVersion,
}: {
  children: React.ReactNode;
  /**
   * The version resolved for this request (from the host header in the server
   * layout). Both prod domains share one deployment, so the build-time
   * SITE_VERSION can't tell them apart — the host can. Falls back to
   * SITE_VERSION when not provided.
   */
  initialVersion?: SiteVersion;
  /**
   * Delivery pricing per store, read once in the server layout. Both versions
   * are passed so switching store re-prices shipping without a round trip,
   * exactly like prices already do.
   */
  shippingByVersion?: Record<SiteVersion, ShippingSettings>;
}) {
  const [version, setVersionState] = useState<SiteVersion>(initialVersion);

  // Hydrate from localStorage once on mount (avoids SSR mismatch). A stored
  // value represents an explicit user pick and wins over the host-derived
  // default; without one the host-derived initial render stays.
  useEffect(() => {
    const stored = readStoredVersion(initialVersion);
    // Hydrate from localStorage after mount. This can't move to a lazy
    // initializer without an SSR/client hydration mismatch, and the linter
    // can't model "read an external store on mount".
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    () => ({
      version,
      setVersion,
      config: getVersionConfig(version),
      shipping: shippingByVersion?.[version] ?? FREE_SHIPPING,
    }),
    [version, setVersion, shippingByVersion],
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
