"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { clearLocalUserData } from "@/lib/clientStorage";

/**
 * Landing spot when a signed-in cookie points at an account that no longer
 * exists (e.g. deleted on another device). Clears the session and any locally
 * cached dashboard data, then returns to the login screen.
 */
export default function SignedOutPage() {
  useEffect(() => {
    clearLocalUserData();
    signOut({ callbackUrl: "/auth/login" });
  }, []);

  return (
    <div className="min-h-[100dvh] bg-surface flex items-center justify-center font-sans text-ink">
      <p className="text-sm font-bold text-ink-soft">Signing you out…</p>
    </div>
  );
}
