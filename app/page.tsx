import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/access";
import { signedOutHome } from "@/lib/welcome";

// The app has no public landing page: signed-in people go to the dashboard, new people see the welcome screens first,
// returning signed-out people go straight to sign-in.
export default async function Page() {
  redirect((await getSessionUserId()) ? "/dashboard" : await signedOutHome());
}
