import fs from "fs";
import path from "path";
import { Download, ShieldCheck, Smartphone, Droplets, ScanLine, Users } from "lucide-react";

export const metadata = { title: "Get the Nura app", description: "Nura is an Android app. Download and install it to start tracking your nutrition." };
export const dynamic = "force-dynamic"; // never statically cached: it is also served in place of other URLs

function release(): { version: string; sizeMb: string; sha256: string; file: string } {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "app-release.json"), "utf8"));
    return { version: String(j.version), sizeMb: String(j.sizeMb), sha256: String(j.sha256), file: String(j.file || "nura.apk") };
  } catch {
    return { version: "", sizeMb: "", sha256: "", file: "nura.apk" };
  }
}

export default function DownloadPage() {
  const r = release();
  return (
    <main className="min-h-screen bg-surface text-ink font-sans">
      <div className="max-w-md mx-auto px-6 py-12 flex flex-col items-center text-center">
        <img src="/icon.png" alt="Nura" width={96} height={96} className="w-24 h-24 rounded-[28px] shadow-lg mb-6" />
        <h1 className="font-display text-4xl font-black tracking-tight">Nura</h1>
        <p className="mt-2 text-ink-soft font-medium">Smart nutrition for the whole family</p>

        <a href={`/${r.file}`} download className="mt-8 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-brand text-white font-bold py-4 text-lg shadow-lg shadow-brand/30 active:scale-[0.99]">
          <Download className="w-5 h-5" /> Download for Android
        </a>
        <p className="mt-2 text-xs text-ink-soft">{r.version ? `Version ${r.version} · ${r.sizeMb} MB · ` : ""}Android 10 or newer</p>

        <ul className="mt-8 w-full grid gap-3 text-left">
          {[[ScanLine, "Scan food and barcodes", "Photo, barcode or search; works offline too."], [Users, "Whole-family profiles", "Child-safe targets for every age."], [Droplets, "Water, weight and reminders", "Gentle nudges that never nag."]].map(([Icon, t, d]: any) => (
            <li key={t} className="flex gap-3 bg-white rounded-2xl p-4 border border-surface-line"><Icon className="w-6 h-6 text-brand shrink-0" /><div><div className="font-bold">{t}</div><div className="text-xs text-ink-soft">{d}</div></div></li>
          ))}
        </ul>

        <section className="mt-8 w-full bg-white rounded-2xl p-5 border border-surface-line text-left" aria-labelledby="how">
          <h2 id="how" className="font-black flex items-center gap-2"><Smartphone className="w-5 h-5 text-brand" /> How to install</h2>
          <ol className="mt-3 space-y-2 text-sm text-ink-soft list-decimal pl-5">
            <li>Open this page on your Android phone and tap <b className="text-ink">Download for Android</b>.</li>
            <li>When the download finishes, tap the file to open it.</li>
            <li>If Android asks, allow installing from this source (<i>Settings → Install unknown apps</i>), then tap <b className="text-ink">Install</b>.</li>
          </ol>
        </section>

        {r.sha256 && (
          <details className="mt-6 w-full text-left text-xs text-ink-soft">
            <summary className="cursor-pointer font-bold flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Verify the download</summary>
            <p className="mt-2">SHA-256 of the file:</p>
            <code className="block mt-1 break-all bg-white border border-surface-line rounded-lg p-2 text-[11px]">{r.sha256}</code>
          </details>
        )}
        <p className="mt-8 text-[11px] text-ink-faint">Nura is only available as an Android app. <a className="underline" href="/privacy">Privacy</a> · <a className="underline" href="/terms">Terms</a></p>
      </div>
    </main>
  );
}
