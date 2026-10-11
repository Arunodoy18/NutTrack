import { NextRequest, NextResponse } from "next/server";
import { shouldShowDownload } from "@/lib/appGate";

/** Nura is an installed app, not a website: browsers get the download page. APIs, assets and the app itself are untouched. */
export function middleware(req: NextRequest) {
  const show = shouldShowDownload({
    method: req.method,
    accept: req.headers.get("accept"),
    ua: req.headers.get("user-agent"),
    path: req.nextUrl.pathname,
  });
  const res = show ? NextResponse.rewrite(new URL("/download", req.url)) : NextResponse.next();
  res.headers.set("Vary", "User-Agent, Accept");
  return res;
}

export const config = {
  // Skip API routes, Next internals and any file with an extension (apk, js, png, json, …).
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
