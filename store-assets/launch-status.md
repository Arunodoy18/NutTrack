# Nura launch status — where things actually stand

Last updated after the Gemini key was verified and wired in. This is the
single source of truth — everything below was actually tested, not assumed.

## ✅ Verified working end-to-end (real API calls, not just code review)

- Register / login, web and mobile JWT
- Dashboard, goals, profile, insights APIs (live, against production)
- Account deletion (built this session, verified locally: delete → old token
  404s → login fails)
- Text-based meal logging, daily insight, AI chat advisor → Groq
  (`openai/gpt-oss-120b`), verified with a real request returning correct
  structured JSON
- Meal/fridge photo analysis → Gemini (`gemini-3.6-flash`), verified through
  the real `/api/mobile/meals/analyze` endpoint - confirmed the model
  correctly follows the prompt's custom JSON contract, including its
  non-food rejection format
- RevenueCat webhook: fixed two real bugs (no auth check, `parseInt()` on a
  UUID that silently broke real purchases) - verified against the real DB
- `NEXTAUTH_URL` confirmed correct in production via the live Google OAuth
  callback URL
- Upstash rate limiting: confirmed working (5 allowed, 6th+ blocked) - you
  confirmed this is in Netlify already
- Android app icon/splash/favicon: were literally broken template
  placeholders (Android Studio guide image, cropped logo fragment) - fixed
- First-ever EAS build succeeded (preview APK) - this is the first time the
  app has actually run outside of API-level curl testing

## ⚠️ Needs your action - each independent of the others

| # | What | Why it matters |
|---|---|---|
| 1 | Add `GEMINI_API_KEY` to Netlify | I only have it locally - production still can't do photo scans until this is set |
| 2 | Confirm `GROQ_API_KEY` is in Netlify | Never explicitly confirmed - only Upstash was |
| 3 | `RESEND_API_KEY` + verified sending domain | You chose to set this up but never sent a key - Forgot Password is still broken |
| 4 | `REVENUECAT_WEBHOOK_SECRET` in Netlify | Webhook fails closed without it (safe, but purchases won't grant premium) |
| 5 | Full RevenueCat setup (Play Console product → RevenueCat project → service account → public key) | Walkthrough already given - without it, "Upgrade" just shows "Coming soon" |
| 6 | Actually install and use the EAS preview build | Biggest untested surface - everything so far is API-level, not device-level |
| 7 | BillDesk PA-CB merchant verification | In progress, 90-day window - doesn't block the free app, only premium purchase processing |
| 8 | Play Store submission itself | App not yet created in Play Console; no screenshots beyond the feature graphic; only a preview APK exists, not a signed production AAB |

## Suggested order

1. **Install the APK on your phone right now** and actually use it - this finds real bugs faster than anything else left on this list.
2. Add `GEMINI_API_KEY` to Netlify (2 minutes, unlocks the core feature in production).
3. Confirm `GROQ_API_KEY` is really in Netlify while you're in there.
4. Come back with what breaks on the real device - that's the highest-value thing you can hand me next.
5. RevenueCat, Resend, and the production AAB build can all happen in parallel once the core app is confirmed working on your phone.
