"use client";

import { useEffect } from "react";

/**
 * Inside the Android app: once someone is signed in, hand the app a one-time code so it can fetch
 * reminders in the background. The app strips "linked" into its user agent after that, so this runs once.
 */
export default function AppLinker() {
  useEffect(() => {
    try {
      const ua = navigator.userAgent;
      if (!/NuraApp\/\d/.test(ua) || /\blinked\b/.test(ua)) return;
      if (/^\/(auth|download|privacy|terms)/.test(location.pathname)) return;
      if (sessionStorage.getItem("nura_link_tried")) return;
      sessionStorage.setItem("nura_link_tried", "1");
      fetch("/api/sync/pair", { method: "POST" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (j?.code) window.location.href = `nura://link?code=${encodeURIComponent(j.code)}`; })
        .catch(() => { try { sessionStorage.removeItem("nura_link_tried"); } catch { /* ignore */ } });
    } catch { /* ignore */ }
  }, []);
  return null;
}
