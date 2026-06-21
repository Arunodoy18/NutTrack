# dietBuddy — Strava-style redesign · Production handoff

This folder contains **real Next.js + Tailwind files** that drop into your
`NutTrack` repo. **No functional code was changed** — only the UI/styling.
Commit them on github.com (pencil = edit, "Add file → Upload files" = new files),
and Netlify auto-deploys to dietbuddy.buildc3.tech.

---

## Design tokens (the new look)
- **Accent (Strava orange):** `#FC4C02` → in Tailwind use `brand` (`bg-brand`, `text-brand`, `brand-600` …)
- **Surfaces:** app bg `#F4F4F6` (`surface-muted`), cards `#FFFFFF`, lines `#E7E7EB` (`surface-line`)
- **Text:** `#242428` (`ink`), `#67676F` (`ink-soft`), `#9A9AA2` (`ink-faint`)
- **Display font:** Barlow Semi Condensed → `font-display` (headlines + numbers)
- **Body font:** Plus Jakarta Sans → `font-sans`
- **Macros:** protein = emerald, fat = amber, fiber = blue (unchanged hues)

---

## BATCH 1 + 2 — included here (ready to commit) ✅
Replace each file in your repo with the matching file from this folder:

| Repo path | What changed |
|---|---|
| `tailwind.config.ts` | added `brand`, `ink`, `surface` colors + `display`/`sans` fonts |
| `app/globals.css` | light theme, accent var, loads Barlow + Plus Jakarta + JetBrains Mono |
| `app/layout.tsx` | light `<body>`, `themeColor` white, removed `dark` class (PWA + SW untouched) |
| `app/auth/login/page.tsx` | reskinned + **added working "Continue with Google"** (`signIn("google")`) |
| `app/auth/signup/page.tsx` | reskinned + Google button (register + auto-login logic untouched) |
| `app/auth/forgot-password/page.tsx` | reskinned OTP flow (send-otp / verify-otp logic untouched) |
| `components/LandingPage.tsx` | full Strava-style marketing page (all `/auth` links intact) |

**Commit these together.** Your Dashboard route still renders its current
design (it sets its own background), so nothing looks half-finished — only the
landing + auth + theme foundation flip to the new look.

### How to commit on github.com (no terminal needed)
1. Open `Arunodoy18/NutTrack` on github.com.
2. For an existing file (e.g. `app/layout.tsx`): open it → click the **pencil** →
   select-all, paste the new contents → **Commit changes**.
3. Repeat for each file above.
4. Netlify builds automatically — watch the deploy, then check dietbuddy.buildc3.tech.

> Tip: commit `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx` first
> (the foundation), then the auth pages and `LandingPage.tsx`.

---

## BATCH 3 — Dashboard + FridgeRaider ✅ (included)
| Repo path | What changed |
|---|---|
| `components/Dashboard.tsx` | reskinned to light/Strava — **all logic untouched** (AI scanner, Razorpay, recharts, goals, streak, voice, paywall) |
| `components/FridgeRaider.tsx` | reskinned to light/Strava — fridge scan + recipe logic untouched |

Only `className` strings and inline chart/SVG colors changed:
- page `bg-slate-900` → `bg-surface-muted` · cards `bg-slate-800/*` → `bg-white` (with their existing shadow for separation)
- inner tiles `bg-slate-900/3x` → `bg-surface-muted` · borders → `border-surface-line`
- headings/numbers `text-white` → `text-ink` **(kept white on orange buttons)** · `text-slate-300/400/500` → `text-ink-soft`/`text-ink-faint`
- `indigo-*` → `brand-*` · cyan scan beam → `brand`
- recharts/ring SVG: calorie `#6366f1` → `#FC4C02`, track `#334155` → `#E7E7EB`, tooltip dark → white; macro colors (emerald/amber/blue) unchanged
- key titles + big numbers get `font-display` (Barlow)

> Modal backdrops became `bg-black/50` scrims. Nothing here touches state,
> effects, server actions, API routes, NextAuth, Razorpay, or DB code.

**Plus two prototype touches on the Dashboard:**
- **Single calorie ring** hero (the 4 concentric rings → one bold orange ring; protein/fat/fiber still shown as the cards below).
- **Mobile sticky action bar** (`md:hidden`) with a center Log-Meal camera FAB + Fridge + Goals — it calls your *existing* handlers (`setIsUploadModalOpen`, `setIsFridgeRaiderOpen`, `setIsModalOpen`), so it's fully functional and adds nothing new. Desktop is unchanged.

### Commit order (whole redesign)
1. `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`
2. `app/auth/login`, `signup`, `forgot-password`
3. `components/LandingPage.tsx`
4. `components/Dashboard.tsx`, `components/FridgeRaider.tsx`

After all are committed, the entire app — landing → auth → dashboard → fridge →
paywall — renders in the Strava skin, fully functional.
