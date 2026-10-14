import { redirect } from "next/navigation";

// The app has no public landing page: it opens straight to the dashboard (which sends signed-out people to sign in).
export default function Page() {
  redirect("/dashboard");
}
