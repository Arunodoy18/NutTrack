/** The Android app adds this token to its WebView user agent. Everything else is "a browser". */
export const APP_UA = /NuraApp\/(\d+\.\d+\.\d+)/;
export const isAppUserAgent = (ua: string | null | undefined) => !!ua && APP_UA.test(ua);
/**
 * The app also sets this cookie. Service-worker network requests don't carry the app's user-agent suffix,
 * but they do carry cookies, so the cookie keeps the app working when its service worker answers a page load.
 */
export const APP_COOKIE = "nura_app";
export const hasAppCookie = (cookieHeader: string | null | undefined) => !!cookieHeader && /(?:^|;\s*)nura_app=\d+\.\d+\.\d+/.test(cookieHeader);

/** Pages a plain browser may still see (the download page, legal pages the Play Store links to). */
const PUBLIC_PAGES = new Set(["/download", "/privacy", "/terms", "/delete-account"]);
export const isPublicPage = (path: string) => PUBLIC_PAGES.has(path.replace(/\/+$/, "") || "/");

/** Should this request be answered with the download page instead of the requested app screen? */
export function shouldShowDownload(opts: { method: string; accept: string | null; ua: string | null; path: string; cookie?: string | null }): boolean {
  if (opts.method !== "GET" && opts.method !== "HEAD") return false; // API writes etc. are protected by auth, not by the gate
  if (!(opts.accept ?? "").includes("text/html")) return false; // only page navigations
  if (isAppUserAgent(opts.ua) || hasAppCookie(opts.cookie)) return false;
  return !isPublicPage(opts.path);
}
