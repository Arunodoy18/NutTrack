# RevenueCat setup for Nura (Android)

The app already has the hook point ready: `mobile/app/_layout.tsx` reads
`EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` and only configures the SDK if it's set,
so nothing breaks in the meantime. Once you have the key, give it to me and
I'll wire it in — no code changes needed beyond setting that one value.

## 1. Create the Play Console subscription product first

RevenueCat wraps Google Play Billing — it doesn't replace it. You need the
product to exist in Play Console before RevenueCat can sell it.

1. In Play Console, your app → **Monetize → Products → Subscriptions**.
2. Create a subscription (the app currently references "Premium" —
   `mobile/app/(tabs)/profile.tsx` checks `customerInfo.entitlements.active['Premium']`).
   The old web copy mentioned ₹199/3-months — pick whatever price/period you want.
3. **Note:** Play Console requires your app to have an active production or
   testing track before subscription products can go live — this ties back to
   getting the closed test running first.

## 2. Create your RevenueCat account and project

1. Sign up at https://app.revenuecat.com (free tier is fine to start).
2. Create a new project (e.g. "Nura").
3. Add an app within that project, platform **Google Play**, package name
   `com.nuttrack.app` (must match `mobile/app.json` exactly).

## 3. Connect Play Console to RevenueCat (needed for server-side receipt validation)

1. In Google Play Console: **Setup → API access** → create/link a Google Cloud
   service account with access to your app.
2. Grant that service account the **Financial data / Manage orders and
   subscriptions** permission for your app.
3. In RevenueCat's app settings for the Android app, paste that service
   account's JSON credentials under **Service Account Credentials**.
4. Add the subscription product you created in step 1 to a RevenueCat
   **Offering** (RevenueCat's abstraction over Play products — this is what
   `Purchases.getOfferings()` in `profile.tsx` reads from).

## 4. Get the public API key and send it to me

RevenueCat app settings → **API Keys** → copy the **Public app-specific API
key** for the Android app (starts with `goog_...`). This is safe to embed in
the client — it's not a secret credential.

Paste it here and I'll set `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` and wire up
the build config.

## 5. Webhook (already built, just needs pointing)

The backend has `app/api/webhooks/revenuecat/route.ts` to receive purchase
events and flip `isPremium` on the user record. I found and fixed two bugs in
it while wiring this up: it was parsing the user's UUID with `parseInt()`
(silently never matching any real user, so purchases would never actually
grant premium), and it had **no signature/auth check at all** — anyone could
POST a fake purchase event and grant themselves premium for free.

To enable it:
1. Generate a random secret, e.g. `openssl rand -hex 32`.
2. Set it as `REVENUECAT_WEBHOOK_SECRET` in Netlify's environment variables.
3. In RevenueCat → **Integrations → Webhooks**, set:
   - URL: `https://dietbuddy.buildc3.tech/api/webhooks/revenuecat`
   - Authorization header value: the same secret from step 1
4. The route now rejects any request whose `Authorization` header doesn't
   match `REVENUECAT_WEBHOOK_SECRET` exactly.
