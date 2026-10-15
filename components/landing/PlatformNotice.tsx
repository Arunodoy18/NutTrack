"use client";

import React, { useEffect, useState } from "react";

/**
 * Nura is an Android app. People on an iPhone or a computer get a clear note (and, on a computer, a QR code
 * that opens this page on their phone) instead of a download button that can't work for them.
 */
export default function PlatformNotice({ qrSvg }: { qrSvg: string }) {
  const [kind, setKind] = useState<"android" | "ios" | "desktop" | null>(null);
  useEffect(() => {
    const ua = navigator.userAgent;
    setKind(/Android/i.test(ua) ? "android" : /iPhone|iPad|iPod/i.test(ua) ? "ios" : "desktop");
  }, []);
  if (!kind || kind === "android") return null;
  return (
    <aside className="mx-auto mt-6 w-full max-w-md rounded-3xl border border-brand/20 bg-brand/5 p-5 text-left" role="note">
      {kind === "ios" ? (
        <>
          <p className="font-black text-ink">Nura is Android-only for now</p>
          <p className="mt-1 text-sm text-ink-soft">Open this page on an Android phone to download the app. There is no iPhone version yet.</p>
        </>
      ) : (
        <div className="flex items-center gap-4">
          <div className="h-28 w-28 shrink-0 rounded-2xl bg-white p-2 shadow-sm" dangerouslySetInnerHTML={{ __html: qrSvg }} aria-label="QR code that opens this page on your phone" role="img" />
          <div>
            <p className="font-black text-ink">Open this on your Android phone</p>
            <p className="mt-1 text-sm text-ink-soft">Scan the code with your phone&apos;s camera, then tap <b className="text-ink">Download for Android</b>.</p>
          </div>
        </div>
      )}
    </aside>
  );
}
