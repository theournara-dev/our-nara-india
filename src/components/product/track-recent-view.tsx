"use client";

import { useEffect } from "react";
import { addRecentView } from "@/lib/recent-view";

/** Records a product page view (mount) into the session recent-views list. */
export function TrackRecentView({ slug }: { slug: string }) {
  useEffect(() => {
    addRecentView(slug);
  }, [slug]);

  return null;
}
