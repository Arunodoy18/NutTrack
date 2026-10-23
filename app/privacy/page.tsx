import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Privacy Policy — Nura", description: "What Nura collects, why, who sees it, and how to export or delete your data." };

const UPDATED = "15 October 2026";

function S({ n, t, children }: { n: number; t: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xl font-bold">{n}. {t}</h2>
      <div className="space-y-2 text-[15px] leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-surface px-6 py-10 font-sans text-ink">
      <div className="mx-auto max-w-2xl">
        <Link href="/download" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-ink-soft"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <h1 className="font-display text-4xl font-black tracking-tight">Privacy Policy</h1>
        <p className="mt-1 text-sm text-ink-soft">Last updated: {UPDATED}</p>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">Nura is a nutrition tracking app. This page explains in plain language what we collect, why, who it goes to, and the choices you have.</p>

        <div className="mt-8 space-y-8">
          <S n={1} t="What we collect">
            <ul className="list-disc space-y-1 pl-5">
              <li><b className="text-ink">Account:</b> name, email address and a securely hashed password (never the password itself).</li>
              <li><b className="text-ink">Profile and body details</b> for you and any family members you add: age, sex, height, weight, activity level, diet, allergies or conditions you choose to enter, and goals. These are used to calculate nutrition targets.</li>
              <li><b className="text-ink">What you log:</b> meals and their nutrition, meal photos you choose to scan, water, weight, workouts, grocery lists and reminder settings.</li>
              <li><b className="text-ink">Health Connect data (only if you connect it):</b> steps, active calories, exercise sessions and weight, read from Health Connect after you pair a phone and grant access. Nura never writes to Health Connect.</li>
              <li><b className="text-ink">Feedback you send us</b> from Profile → Send feedback: your message, its type, your app version and your account, so we can follow up.</li>
              <li><b className="text-ink">Device information:</b> a random token for each phone you pair (for reminders or Health Connect), your time zone, and the phone model name shown in your connected-devices list.</li>
            </ul>
          </S>
          <S n={2} t="How we use it">
            <p>Only to run Nura: calculating targets, logging and showing your meals and trends, building meal plans and recipes, sending the reminders you turn on, and keeping your data in sync across your own devices. We do not sell your personal data, and we do not use it for advertising. Nura contains no advertising.</p>
          </S>
          <S n={3} t="Children and families">
            <p>You can add family members, including children, to your account. The account holder is responsible for their information and for confirming profiles for children under 13. Children&apos;s targets are based on paediatric guidelines and never set a weight-loss deficit for anyone under 18. Family members share your account and are visible only to you.</p>
          </S>
          <S n={4} t="Who processes your data">
            <ul className="list-disc space-y-1 pl-5">
              <li><b className="text-ink">Google Gemini</b> analyses the meal photos and fridge photos you submit for AI scanning. These are sent securely to Google&apos;s API. We use Gemini&apos;s free tier, under which Google may review submitted content and use it to improve its products. If you prefer not to share a photo, use search, barcode or manual entry instead, which do not send photos.</li>
              <li><b className="text-ink">Open Food Facts</b> receives barcode numbers and food searches to look up packaged products.</li>
              <li><b className="text-ink">Groq</b> processes the text of meals you type or speak (to estimate nutrition), messages you send to the in-app advisor, and the text used to write your insights.</li>
              <li><b className="text-ink">Our hosting and database providers</b> store your data on our behalf (Netlify and Neon).</li>
              <li><b className="text-ink">Resend</b> delivers account emails such as verification codes.</li>
            </ul>
          </S>
          <S n={5} t="Permissions the app asks for">
            <ul className="list-disc space-y-1 pl-5">
              <li><b className="text-ink">Camera:</b> to scan meals and barcodes. Photos are used only when you tap the shutter.</li>
              <li><b className="text-ink">Microphone:</b> for voice input, only while you hold the speak button.</li>
              <li><b className="text-ink">Notifications:</b> for the reminders you turn on.</li>
              <li><b className="text-ink">Health Connect read access:</b> only if you connect it, and only for the data types listed above. You can revoke it any time in Health Connect or by disconnecting the phone in Nura.</li>
            </ul>
          </S>
          <S n={6} t="Your choices and rights">
            <ul className="list-disc space-y-1 pl-5">
              <li><b className="text-ink">Export:</b> Profile → Your data downloads everything as spreadsheets or JSON (passwords are never included).</li>
              <li><b className="text-ink">Delete:</b> Profile → Delete Account removes your account, family profiles and everything attached to them.</li>
              <li><b className="text-ink">Disconnect:</b> Activity &amp; connected apps lets you disconnect a phone at any time. Signing out also stops reminders on that phone.</li>
            </ul>
          </S>
          <S n={7} t="Security and retention">
            <p>Data is sent over encrypted connections. Passwords are hashed, device tokens are stored only as hashes, and the Health Connect pairing token on your phone is kept in encrypted storage. No system is perfectly secure, so we cannot guarantee absolute security. We keep your data until you delete it.</p>
          </S>
          <S n={8} t="Not medical advice">
            <p>Nura is a tracking and education tool, not a medical device. For medical conditions, eating disorders or special dietary needs, please talk to a doctor or registered dietitian.</p>
          </S>
          <S n={9} t="Changes">
            <p>If we change this policy in a way that matters, we will say so in the app. The date above shows the latest version.</p>
          </S>
        </div>
      </div>
    </div>
  );
}
