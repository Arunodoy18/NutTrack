"use client";

import { useEffect } from "react";
import { TZ_COOKIE } from "@/lib/tz";

/** Tells the server which time zone this device is in, so "today" means the user's today. */
export default function TimezoneCookie() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && !document.cookie.split("; ").some((c) => c === `${TZ_COOKIE}=${encodeURIComponent(tz)}`)) {
        document.cookie = `${TZ_COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
      }
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
