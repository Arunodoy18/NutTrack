import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Delete your Nura account", description: "How to delete your Nura account and what is removed." };

export default function DeleteAccountInfoPage() {
  return (
    <div className="min-h-screen bg-surface px-6 py-10 font-sans text-ink">
      <div className="mx-auto max-w-2xl">
        <Link href="/download" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-ink-soft"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <h1 className="text-3xl font-black tracking-tight">Delete your Nura account</h1>
        <p className="mt-2 text-sm font-medium text-ink-soft">You can delete your account and data yourself, any time, inside the Nura app for Android.</p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink-soft">
          <section>
            <h2 className="mb-2 text-xl font-bold text-ink">How to delete</h2>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Open Nura and sign in.</li>
              <li>Go to <b className="text-ink">Profile</b>.</li>
              <li>Scroll to the bottom and tap <b className="text-ink">Delete Account</b>, then confirm.</li>
            </ol>
          </section>
          <section>
            <h2 className="mb-2 text-xl font-bold text-ink">What is deleted</h2>
            <p>Your account, every family profile you added, and everything attached to them: meals and photos, water and weight logs, workouts and steps, activity and Health Connect data, reminders, and paired-phone tokens. Deletion is immediate and cannot be undone.</p>
          </section>
          <section>
            <h2 className="mb-2 text-xl font-bold text-ink">Before you delete</h2>
            <p>Profile → Export lets you download your data (CSV/JSON). To stop only the Health Connect link, use Activity &amp; connected apps → Disconnect instead.</p>
          </section>
          <p>See the <Link href="/privacy" className="font-bold text-brand">Privacy Policy</Link> for what Nura collects and why.</p>
        </div>
      </div>
    </div>
  );
}
