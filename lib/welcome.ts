import { cookies } from "next/headers";

/** Cookie set once someone has seen (or skipped) the welcome screens. */
export const WELCOMED_COOKIE = "nura_welcomed";

/** Where a signed-out person lands: the welcome screens the first time, the sign-in screen after that. */
export async function signedOutHome(): Promise<"/onboarding" | "/auth/login"> {
  return (await cookies()).get(WELCOMED_COOKIE) ? "/auth/login" : "/onboarding";
}
