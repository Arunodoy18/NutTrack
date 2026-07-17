# Play Console submission reference — Nura (com.nuttrack.app)

Drawn directly from the codebase (schema, third-party SDKs, API routes) as of this session.
Copy these into Play Console's Data Safety and Content Rating forms.

## Data Safety form

### Does your app collect or share any of the required user data types?
**Yes.**

### Data types collected

| Category | Type | Collected? | Shared? | Purpose | Notes |
|---|---|---|---|---|---|
| Personal info | Name | Yes | No | Account functionality | `users.name` |
| Personal info | Email address | Yes | No | Account functionality | login/signup |
| Personal info | User IDs | Yes | Yes (RevenueCat, PostHog, Sentry) | App functionality, analytics, crash reporting | internal UUID sent to these processors |
| Health and fitness | Health info | Yes | No | App functionality | `medicalConditions`, `bodyFat` fields |
| Health and fitness | Fitness info | Yes | No | App functionality | age, gender, height, weight, activity level, training frequency, dietary preferences, calorie/macro goals and logs — this is the core purpose of the app |
| Photos and videos | Photos | Yes | Yes (OpenAI) | App functionality | meal/fridge photos sent to OpenAI's API for nutrition analysis; not stored in permanent cloud storage by the app itself |
| Financial info | Purchase history | Yes (planned) | Yes (RevenueCat) | App functionality | subscription/premium status once billing is wired up |
| App activity | App interactions | Yes | Yes (PostHog) | Analytics | screen views / usage events |
| App info and performance | Crash logs | Yes | Yes (Sentry) | Analytics | crash/error reporting |
| App info and performance | Diagnostics | Yes | Yes (Sentry) | Analytics | performance/error diagnostics |
| Device or other IDs | Device ID | Yes | Yes (Sentry, PostHog) | Analytics | collected automatically by those SDKs |

**Not collected:** precise/approximate location, contacts, calendar, audio, messages, web browsing history, files/docs not listed above, race/ethnicity/religion/sexual orientation.

### Security practices to declare
- Data is encrypted in transit: **Yes** (HTTPS/TLS to dietbuddy.buildc3.tech and all third parties).
- Users can request data deletion: check this is actually true before answering **Yes** — right now there is no self-serve "delete my account/data" flow anywhere in the app or backend. Either build one (even a "email us to delete" support flow counts) or answer "No" honestly. Answering "Yes" without a real mechanism is a policy violation if Google or a user checks.
- Committed to Play's Families Policy: **No** (this app is not designed for children; keep the target audience as 18+ / general, not aimed at kids).

### Why this matters
`medicalConditions` and other health fields put this squarely in Google Play's **Health Connect / sensitive health data** territory — expect closer review scrutiny than a generic utility app. Make sure your privacy policy (dietbuddy.buildc3.tech/privacy) explicitly lists everything in the table above; Google cross-checks the policy text against the Data Safety form answers and rejects mismatches.

## Content Rating questionnaire (IARC)

App category: **Utility / Health & Fitness**, not a game.

Answer **No** to all of: violence, blood, sexual content, profanity, controlled substances (alcohol/tobacco/drugs — note the app is about nutrition, not substances), gambling, user-generated content shared with other users (there's no social/feed feature), unrestricted internet browser, ability to communicate with other users.

Answer **Yes** where applicable:
- Shares personal info with third parties → **Yes** (matches Data Safety form above).
- Shares user location → **No**.

Expected result: **Everyone / 3+ (PEGI 3)** rating. If you add any social/community feature later (comments, shared recipes visible to other users), you'll need to redo this questionnaire.

## Store listing copy (draft — edit to taste)

**App name:** Nura
**Short description (max 80 chars):**
`Snap a photo of your meal. Nura tells you the calories and macros.`

**Full description (draft):**
```
Nura is an AI-powered nutrition tracker. Point your camera at a meal or your
fridge and Nura estimates calories, protein, fat, fiber, and more — no manual
food-diary logging required.

• Snap a photo, get instant nutrition estimates
• Track daily calories and macros against your personal goals
• Scan your fridge for recipe ideas based on what you already have
• See weekly trends and insights
• Simple, fast, no barcode scanning required

Nura uses AI to analyze food photos — estimates are a helpful guide, not a
substitute for professional medical or dietary advice.
```

**Privacy policy URL:** https://dietbuddy.buildc3.tech/privacy
**Terms of service URL:** https://dietbuddy.buildc3.tech/terms

## Screenshots — I can't generate these here

This environment has no Android emulator, iOS simulator, or device attached, so I can't
capture real in-app screenshots (a headless web render of the React Native screens would
look meaningfully different from the actual native Android UI — tab bar, camera flow, and
system chrome all render differently — so it'd be misleading to hand you those instead).

Once you have a build running on an emulator or your phone (see the EAS steps), Play
Console needs, minimum:
- 2–8 phone screenshots (recommend: login, dashboard, camera scan result, insights)
- 1 feature graphic, 1024×500 — **already generated**: `store-assets/feature-graphic.png`
