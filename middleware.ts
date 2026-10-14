import { NextRequest, NextResponse } from "next/server";
import { shouldShowDownload } from "@/lib/appGate";

/** Nura is an installed app, not a website: browsers get the download page. APIs, assets and the app itself are untouched. */
export function middleware(req: NextRequest) {
  const show = shouldShowDownload({
    method: req.method,
    accept: req.headers.get("accept"),
    ua: req.headers.get("user-agent"),
    path: req.nextUrl.pathname,
    cookie: req.headers.get("cookie"),
  });
  const res = show ? NextResponse.rewrite(new URL("/download", req.url)) : NextResponse.next();
  res.headers.set("Vary", "User-Agent, Accept");
  // The same URL answers differently for the app and for a browser, so a shared cache must never keep it
  // (a cached "download" page once got served to the app itself).
  if (show) res.headers.set("Cache-Control", "private, no-store, max-age=0");
  return res;
}

export const config = {
  // Skip API routes, Next internals and any file with an extension (apk, js, png, json, …).
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
