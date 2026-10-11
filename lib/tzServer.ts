import { cookies } from "next/headers";
import { DEFAULT_TZ, TZ_COOKIE, isValidTz } from "@/lib/tz";

/** The caller's IANA time zone (from the browser-set cookie), defaulting to India. */
export async function getUserTz(): Promise<string> {
  try {
    const v = (await cookies()).get(TZ_COOKIE)?.value;
    if (isValidTz(v)) return v;
  } catch {
    /* outside a request */
  }
  return DEFAULT_TZ;
}
