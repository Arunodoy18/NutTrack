import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import {
  Download, ScanLine, Barcode, Mic, WifiOff, Users, Baby, BookOpenCheck, ChefHat, Droplets, Bell,
  Activity, FileDown, ShieldCheck, Sparkles, Smartphone, Check, ChevronDown, Flame, HeartPulse, Lock, Camera,
} from "lucide-react";
import PlatformNotice from "@/components/landing/PlatformNotice";
import LiveDemoLoader from "@/components/landing/LiveDemoLoader";

const SITE = "https://dietbuddy.buildc3.tech";
export const dynamic = "force-dynamic"; // also served in place of other URLs, so it must never be cached as a static page

export const metadata = {
  metadataBase: new URL(SITE),
  alternates: { canonical: "/download" },
  title: "Nura — free nutrition tracker for the whole family (Android app)",
  description: "Nura turns a photo, a barcode or a few words into calories and macros. Child-safe targets, offline logging, meal plans, reminders and Health Connect sync. Free Android app.",
  openGraph: {
    title: "Nura — nutrition tracking for the whole family",
    description: "Snap a meal, scan a barcode or just type it. Free Android app with child-safe targets and offline logging.",
    url: SITE, siteName: "Nura", type: "website", images: [{ url: `${SITE}/og.png`, width: 1200, height: 630, alt: "Nura: free nutrition tracker for the whole family" }],
  },
  twitter: { card: "summary_large_image", images: [`${SITE}/og.png`], title: "Nura — nutrition tracking for the whole family", description: "Free Android app: photo, barcode or text to calories and macros." },
};

function release() {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "app-release.json"), "utf8"));
    return { version: String(j.version), sizeMb: String(j.sizeMb), sha256: String(j.sha256), file: String(j.file || "nura.apk") };
  } catch { return { version: "", sizeMb: "", sha256: "", file: "nura.apk" }; }
}

const FEATURES = [
  { icon: Camera, t: "Snap a photo", d: "Point at your plate. Nura finds each food, estimates the portion and shows calories, protein, carbs and fat. Fix anything before you log it." },
  { icon: Barcode, t: "Scan a barcode", d: "Packaged food in seconds, from an open product database. Choose how much you actually had, from half a serving to three." },
  { icon: Mic, t: "Type or say it", d: "“2 rotis with dal and a bowl of curd” becomes an itemised meal. Or search 158 everyday Indian and global foods, even with typos." },
  { icon: WifiOff, t: "Works offline", d: "No signal in the kitchen or on the train? Log meals, water and weight anyway. Everything syncs by itself when you are back online." },
  { icon: Users, t: "One account, the whole family", d: "Add up to six people, each with their own targets, meals, water and weight. Switch profiles with one tap." },
  { icon: Baby, t: "Built to be safe for kids", d: "Targets for children use paediatric energy guidelines, never a weight-loss deficit under 18, and ask for a parent's confirmation under 13." },
  { icon: BookOpenCheck, t: "Recipes and a 7-day plan", d: "62 recipes and a weekly plan made for each person's age, diet and allergies. Swap a meal, log it, or send the shopping list to your phone." },
  { icon: ChefHat, t: "Fridge Raider", d: "Photograph what you have. Nura lists the ingredients it sees and suggests macro-friendly recipes from them." },
  { icon: Droplets, t: "Water and weight", d: "Daily water goals that fit age and activity, and a weight trend that warns you if you are losing weight too fast." },
  { icon: Bell, t: "Reminders that don't nag", d: "Meal, water and weigh-in nudges at times you choose. Skipped automatically if you just ate, and never at night." },
  { icon: Activity, t: "Steps and workouts", d: "Connect Health Connect to bring in steps, active calories, workouts and weight from your watch or fitness app. Or log a workout by hand." },
  { icon: FileDown, t: "Your data is yours", d: "Download everything as spreadsheets or JSON, print a summary for your doctor or dietitian, or delete your account whenever you like." },
];

const SCREENS = [
  { src: "/landing/scan.webp", h: 980, t: "Photo to nutrition", d: "AI reads the plate and itemises every food." },
  { src: "/landing/barcode.webp", h: 1077, t: "Barcode with portions", d: "Pick ½× to 3× of the pack serving." },
  { src: "/landing/dashboard.webp", h: 762, t: "Your day at a glance", d: "Calories, macros and what is left." },
  { src: "/landing/plan.webp", h: 778, t: "A plan for each person", d: "Swap, log and shop for the week." },
  { src: "/landing/fridge.webp", h: 800, t: "Fridge Raider", d: "Ingredients in, recipes out." },
];

const FAQ = [
  { q: "Is Nura really free?", a: "Yes. Every feature is free. To keep the AI bill fair there is a limit of 200 AI photo or text scans per account per day, which resets daily. Searching foods, barcodes, recipes, plans, water and weight are not counted." },
  { q: "Why isn't it on the Play Store?", a: "It is coming. Until then you install it directly from this page. The file is signed by us and its checksum is shown below so you can verify it. Android may ask you to allow installs from your browser once." },
  { q: "Is the APK safe to install?", a: "Nura asks only for what its features need: camera (to scan), microphone (voice input), notifications (reminders) and, only if you connect it, Health Connect read access. You can compare the SHA-256 shown on this page with the file you downloaded." },
  { q: "Which phones does it work on?", a: "Android 10 or newer. It is built as a small native app (under 4 MB). Health Connect sync is built in on Android 14 and newer; on Android 9 to 13 you also need Google's free Health Connect app." },
  { q: "What happens to my photos?", a: "Meal and fridge photos are sent securely to Google's Gemini AI to be analysed. On Gemini's free tier Google may review submitted photos to improve its products. Text you type or speak is processed by an AI text service (Groq). If you would rather not share photos, use search, barcode or manual entry. Details are in the privacy policy." },
  { q: "Does it work without internet?", a: "Logging does. Meals you search or enter, water and weight are saved on the phone and sync later. AI photo and text analysis, and barcode lookups, wait until you are online and then run automatically." },
  { q: "Can I use it for my children?", a: "Yes, that is a core use. Each child gets their own profile with age-appropriate targets. Nura never sets a weight-loss deficit for anyone under 18 and does not let children “earn back” food with exercise." },
  { q: "Is Nura medical advice?", a: "No. It is a tracking and education tool, not a medical device. If you or your child has a medical condition, an eating disorder or special dietary needs, talk to a doctor or registered dietitian." },
  { q: "How do I delete my data?", a: "In the app: Profile → Your data to download everything, and Profile → Delete Account to remove your account and everything attached to it." },
];

function Phone({ src, alt, h, priority }: { src: string; alt: string; h: number; priority?: boolean }) {
  return (
    <div className="relative mx-auto w-[236px] shrink-0 rounded-[38px] border-[7px] border-ink bg-ink shadow-2xl shadow-ink/20">
      <div className="absolute left-1/2 top-2 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-ink" aria-hidden />
      <img src={src} alt={alt} width={540} height={h} loading={priority ? "eager" : "lazy"} decoding="async" className="block w-full rounded-[30px] bg-white" style={{ aspectRatio: `540 / ${h}`, objectFit: "cover", objectPosition: "top", maxHeight: 470 }} />
    </div>
  );
}

export default async function DownloadPage() {
  const r = release();
  const apk = `/${r.file}`;
  const qrSvg = await QRCode.toString(SITE, { type: "svg", margin: 0, width: 96, color: { dark: "#1B1B1F", light: "#FFFFFF" } });
  const jsonLd = {
    "@context": "https://schema.org", "@type": "MobileApplication", name: "Nura", operatingSystem: "ANDROID 10+", applicationCategory: "HealthApplication",
    description: "Free nutrition and calorie tracker for the whole family with photo, barcode and offline logging.", softwareVersion: r.version || undefined,
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" }, downloadUrl: `${SITE}${apk}`, url: SITE,
  };
  const Cta = ({ id }: { id?: string }) => (
    <a id={id} href={apk} download className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-4 text-lg font-bold text-white shadow-lg shadow-brand/30 transition active:scale-[0.99] sm:w-auto">
      <Download className="h-5 w-5" aria-hidden /> Download for Android
    </a>
  );

  return (
    <div className="min-h-screen bg-surface font-sans text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-surface-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <a href="#top" className="flex items-center gap-2 font-display text-xl font-black tracking-tight">
            <img src="/icon.png" alt="" width={32} height={32} className="h-8 w-8 rounded-xl" /> Nura
          </a>
          <a href={apk} download className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white">Download</a>
        </div>
      </header>

      <main id="top">
        {/* hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-brand/10 via-brand/5 to-transparent" aria-hidden />
          <div className="relative mx-auto max-w-5xl px-5 pb-10 pt-10 text-center md:grid md:grid-cols-2 md:items-center md:gap-10 md:text-left">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-white px-3 py-1 text-xs font-bold text-brand">
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> Free Android app{r.version ? ` · v${r.version}` : ""}
              </span>
              <h1 className="mt-4 font-display text-[40px] font-black leading-[1.05] tracking-tight sm:text-5xl">
                Know what&apos;s on your plate. <span className="text-brand">For everyone at the table.</span>
              </h1>
              <p className="mx-auto mt-4 max-w-md text-base font-medium leading-relaxed text-ink-soft md:mx-0">
                Nura turns a photo, a barcode or a few words into calories and macros — with child-safe targets, offline logging and gentle reminders.
              </p>
              <div className="mt-6 flex flex-col items-center gap-2 md:items-start">
                <Cta />
                <a href="#try" className="text-sm font-bold text-brand underline underline-offset-4">Or try it right here, no install →</a>
                <p className="text-xs font-medium text-ink-soft">{r.version ? `Version ${r.version} · ` : ""}{r.sizeMb ? `${r.sizeMb} MB · ` : ""}Android 10 or newer · Free</p>
              </div>
              <PlatformNotice qrSvg={qrSvg} />
              <ul className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-bold text-ink-soft md:justify-start">
                {["Free to use", "No ads", "Works offline", "Safe for kids"].map((t) => (
                  <li key={t} className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />{t}</li>
                ))}
              </ul>
            </div>
            <div className="mt-10 md:mt-0">
              <div className="relative mx-auto w-fit">
                <Phone src="/landing/scan.webp" h={980} alt="Nura app showing a photographed salad bowl analysed into 317 calories with protein, fat and carbs" priority />
                <div className="absolute -left-4 top-16 hidden rotate-[-4deg] rounded-2xl bg-white px-3 py-2 text-left shadow-xl sm:block"><div className="flex items-center gap-1.5 text-sm font-black"><Flame className="h-4 w-4 text-brand" aria-hidden />317 kcal</div><div className="text-[10px] font-semibold text-ink-soft">from one photo</div></div>
                <div className="absolute -right-4 bottom-24 hidden rotate-[3deg] rounded-2xl bg-white px-3 py-2 text-left shadow-xl sm:block"><div className="flex items-center gap-1.5 text-sm font-black"><WifiOff className="h-4 w-4 text-sky-600" aria-hidden />Offline ready</div><div className="text-[10px] font-semibold text-ink-soft">syncs when you&apos;re back</div></div>
              </div>
            </div>
          </div>
        </section>

        {/* live demo */}
        <section id="try" className="scroll-mt-16 border-y border-surface-line bg-white py-14" aria-labelledby="try-h">
          <div className="mx-auto max-w-5xl px-5 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-brand">Try it live</span>
            <h2 id="try-h" className="mt-3 font-display text-3xl font-black tracking-tight sm:text-4xl">Don&apos;t take our word for it. Tap around.</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm font-medium text-ink-soft">This is Nura&apos;s real food database, nutrition engine and meal planner running in your browser. Watch the tour, or take over.</p>
          </div>
          <div className="mt-8"><LiveDemoLoader /></div>
        </section>

        {/* how it works */}
        <section className="mx-auto max-w-5xl px-5 py-12" aria-labelledby="how">
          <h2 id="how" className="text-center font-display text-3xl font-black tracking-tight">Log a meal in three taps</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {[["1", "Snap, scan or type", "Photograph your plate, scan the barcode, or write what you ate."], ["2", "Check the numbers", "See every food with calories, protein, carbs and fat. Adjust the portion if you need to."], ["3", "Stay on track", "Watch your day fill up against targets that fit your age, goal and activity."]].map(([n, t, d]) => (
              <li key={n} className="rounded-3xl border border-surface-line bg-white p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-black text-white">{n}</span>
                <h3 className="mt-3 text-lg font-black">{t}</h3>
                <p className="mt-1 text-sm font-medium leading-relaxed text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* screens */}
        <section className="bg-white py-12" aria-labelledby="screens">
          <div className="mx-auto max-w-5xl">
            <h2 id="screens" className="px-5 text-center font-display text-3xl font-black tracking-tight">See it in action</h2>
            <p className="mx-auto mt-2 max-w-md px-5 text-center text-sm font-medium text-ink-soft">Real screens from the app. Swipe to see more.</p>
            <div className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 [scrollbar-width:none] md:justify-center">
              {SCREENS.map((s) => (
                <figure key={s.src} className="w-[236px] shrink-0 snap-center">
                  <Phone src={s.src} h={s.h} alt={`${s.t}: ${s.d}`} />
                  <figcaption className="mt-3 text-center"><div className="text-sm font-black">{s.t}</div><div className="text-xs font-medium text-ink-soft">{s.d}</div></figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* features */}
        <section className="mx-auto max-w-5xl px-5 py-14" aria-labelledby="features">
          <h2 id="features" className="text-center font-display text-3xl font-black tracking-tight">Everything in one small app</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm font-medium text-ink-soft">Built for real kitchens: quick to use, forgiving when you are busy, and careful with the people who matter most.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, t, d }) => (
              <article key={t} className="flex gap-4 rounded-3xl border border-surface-line bg-white p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Icon className="h-6 w-6" aria-hidden /></div>
                <div>
                  <h3 className="text-base font-black leading-tight">{t}</h3>
                  <p className="mt-1 text-[13px] font-medium leading-relaxed text-ink-soft">{d}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* families */}
        <section className="mx-auto max-w-5xl px-5 pb-14" aria-labelledby="family">
          <div className="rounded-[32px] bg-gradient-to-br from-[#fc5c16] to-[#e63e00] p-7 text-white sm:p-10">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/80"><HeartPulse className="h-4 w-4" aria-hidden /> For parents</div>
            <h2 id="family" className="mt-2 font-display text-3xl font-black tracking-tight">Nutrition that respects growing bodies</h2>
            <ul className="mt-5 grid gap-3 text-sm font-semibold sm:grid-cols-2">
              {["Energy needs from paediatric guidelines, by age and sex", "Never a calorie deficit or weight-loss goal for anyone under 18", "A parent confirms the profile for children under 13", "No “earn your food with exercise” maths for kids", "Growth-focused coaching: fruit, milk, curd and variety", "Meal plans respect allergies and diets for every member"].map((t) => (
                <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{t}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* privacy */}
        <section className="mx-auto max-w-5xl px-5 pb-14" aria-labelledby="privacy">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-surface-line bg-white p-5 md:col-span-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><ShieldCheck className="h-6 w-6" aria-hidden /></div>
              <h2 id="privacy" className="mt-3 font-display text-2xl font-black leading-tight">Privacy you can read in a minute</h2>
              <p className="mt-2 text-sm font-medium text-ink-soft">We never sell your data. You can export or delete it at any time.</p>
              <a href="/privacy" className="mt-3 inline-block text-sm font-bold text-brand underline">Read the privacy policy</a>
            </div>
            <ul className="grid gap-3 md:col-span-2 sm:grid-cols-2">
              {[[Lock, "Your account, your data", "Only you and the family profiles you create can see your meals, water and weight."], [Camera, "Photos go to AI, openly", "Meal photos are analysed by Google Gemini. Prefer not to share a photo? Search, barcode and manual entry never send one."], [Activity, "Health data only if you connect it", "Nura reads from Health Connect only after you pair it and grant access, and never writes to it. Disconnect any time."], [FileDown, "Take it with you", "One tap exports spreadsheets or JSON. Passwords are never included."]].map(([Icon, t, d]: any) => (
                <li key={t} className="rounded-3xl border border-surface-line bg-white p-5"><Icon className="h-5 w-5 text-brand" aria-hidden /><div className="mt-2 font-black">{t}</div><p className="mt-1 text-sm font-medium text-ink-soft">{d}</p></li>
              ))}
            </ul>
          </div>
        </section>

        {/* install */}
        <section id="install" className="bg-white px-5 py-14" aria-labelledby="install-h">
          <div className="mx-auto max-w-3xl">
            <h2 id="install-h" className="flex items-center justify-center gap-2 text-center font-display text-3xl font-black tracking-tight"><Smartphone className="h-7 w-7 text-brand" aria-hidden /> Install in under a minute</h2>
            <ol className="mt-8 space-y-4">
              {[["Download the file", "Tap Download for Android. If your browser says the file type can be harmful, that is Android's standard message for any app outside the Play Store. Choose Download anyway."], ["Open it", "Tap the downloaded “nura.apk” from the notification or your Downloads folder."], ["Allow the install", "If Android asks, allow installs from your browser (Settings → Install unknown apps). This is needed only once. Then tap Install."], ["Open Nura and sign up", "Create an account, add yourself and your family, and log your first meal."]].map(([t, d], i) => (
                <li key={t as string} className="flex gap-4 rounded-3xl border border-surface-line bg-surface p-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-black text-white">{i + 1}</span>
                  <div><h3 className="font-black">{t}</h3><p className="mt-1 text-sm font-medium leading-relaxed text-ink-soft">{d}</p></div>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex justify-center"><Cta /></div>
            <details className="mt-6 rounded-3xl border border-surface-line bg-surface p-5 text-sm">
              <summary className="cursor-pointer list-none font-black">Trouble installing? <span className="font-medium text-ink-soft">(tap to open)</span></summary>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 font-medium text-ink-soft">
                <li><b className="text-ink">“App not installed”:</b> free up some storage (it needs about 20 MB) and try again.</li>
                <li><b className="text-ink">Play Protect warning:</b> choose “Install anyway”. Nura is not on the Play Store yet, so Google has not scanned it.</li>
                <li><b className="text-ink">Update:</b> install the newer file over the old one. Your data stays on your account.</li>
              </ul>
            </details>
            {r.sha256 && (
              <details className="mt-3 rounded-3xl border border-surface-line bg-surface p-5 text-sm">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 font-black"><ShieldCheck className="h-4 w-4" aria-hidden /> Verify your download</summary>
                <p className="mt-3 font-medium text-ink-soft">SHA-256 of the file for version {r.version}:</p>
                <code className="mt-1 block break-all rounded-xl border border-surface-line bg-white p-3 text-[11px]">{r.sha256}</code>
              </details>
            )}
          </div>
        </section>

        {/* faq */}
        <section className="mx-auto max-w-3xl px-5 py-14" aria-labelledby="faq">
          <h2 id="faq" className="text-center font-display text-3xl font-black tracking-tight">Questions, answered</h2>
          <div className="mt-8 divide-y divide-surface-line overflow-hidden rounded-3xl border border-surface-line bg-white">
            {FAQ.map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-black">{f.q}<ChevronDown className="h-5 w-5 shrink-0 text-ink-soft transition group-open:rotate-180" aria-hidden /></summary>
                <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* final cta */}
        <section className="px-5 pb-16">
          <div className="mx-auto max-w-3xl rounded-[32px] bg-ink p-8 text-center text-white sm:p-10">
            <img src="/icon.png" alt="" width={64} height={64} className="mx-auto h-16 w-16 rounded-2xl" />
            <h2 className="mt-4 font-display text-3xl font-black tracking-tight">Start with your next meal</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-white/70">Free, small and ready in a minute.</p>
            <div className="mt-6 flex justify-center"><Cta /></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-surface-line bg-white px-5 py-8 text-center text-xs font-medium text-ink-soft">
        <p>Nura is a nutrition tracking and education tool, not a medical device. It does not replace advice from a doctor or dietitian.</p>
        <p className="mt-3 space-x-3"><a className="underline" href="/privacy">Privacy</a><a className="underline" href="/terms">Terms</a><span>{r.version ? `v${r.version}` : ""}</span></p>
      </footer>
    </div>
  );
}
