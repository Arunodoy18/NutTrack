"use client";
import { useEffect } from "react";

export function PwaRegistry() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      try {
        if (process.env.NODE_ENV === "development") {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (let registration of registrations) {
              registration.unregister().catch(() => {});
              console.log("Unregistered stale service worker in dev mode.");
            }
          }).catch(console.error);
          
          if ('caches' in window) {
            caches.keys().then((names) => {
              for (let name of names) caches.delete(name).catch(() => {});
            }).catch(console.error);
          }
        } else {
          // In production, next-pwa handles the registration if register: true is set.
          // We only register manually if we need to.
          navigator.serviceWorker.register("/sw.js").catch(console.error);
        }
      } catch (err) {
        console.warn("PWA registry error (likely insecure context):", err);
      }
    }
  }, []);

  return null;
}
