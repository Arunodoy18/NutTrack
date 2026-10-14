"use client";

import { useEffect } from "react";

/**
 * Inside the Android app: once someone is signed in, hand the app a one-time code so it can fetch
 * reminders in the background. After a successful link the app adds "linked" to its user agent, so this
 * stops. Until then it retries whenever the phone comes back online or the app returns to the foreground.
 */
export default function AppLinker() {
  useEffect(() => {
    let busy = false;
    const attempt = () => {
      try {
        const ua = navigator.userAgent;
        if (!/NuraApp\/\d/.test(ua) || /\blinked\b/.test(ua) || (window as any).__nuraLinked || busy) return;
        if (/^\/(auth|download|privacy|terms|setup|onboarding)/.test(location.pathname)) return;
        const last = Number(sessionStorage.getItem("nura_link_at") || 0);
        if (Date.now() - last < 15_000) return; // no hammering
        busy = true;
        sessionStorage.setItem("nura_link_at", String(Date.now()));
        fetch("/api/sync/pair", { method: "POST" })
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => { if (j?.code) window.location.href = `nura://link?code=${encodeURIComponent(j.code)}`; })
          .catch(() => { /* offline: try again when we're back */ })
          .finally(() => { busy = false; });
      } catch { /* ignore */ }
    };
    attempt();
    window.addEventListener("online", attempt);
    document.addEventListener("visibilitychange", attempt);
    return () => { window.removeEventListener("online", attempt); document.removeEventListener("visibilitychange", attempt); };
  }, []);
  return null;
}
