# Cornerstone — Go-Live Hosting Runbook (0 → 100)

Four surfaces, one Firebase backend, two hosts. Do the parts in order.

| Surface | Repo | Host | Subdomain |
|---|---|---|---|
| Website | `cornerstonecdmhi/website` (index.html) | **Vercel** | `cornerstonechilddevelopment.in` + `www.` |
| Admin panel | `cornerstonecdmhi/website` (admin.html) | **Vercel** (same project) | `admin.` |
| TMS (staff) | `cornerstonecdmhi/cornerstone` (index.html) | **Firebase Hosting** | `tms.` |
| Parent portal | `cornerstonecdmhi/cornerstone` (portal.html) | **Firebase Hosting** | `portal.` |

> Why website **and** admin both on Vercel: they're one codebase (same repo). `vercel.json`
> routes the `admin.` host to `admin.html`. The TMS + portal are the other codebase → Firebase.

---

## ✅ LIVE NOW (deployed 2026-06-23)
The TMS + Parent Portal are **deployed and serving** on Firebase Hosting:
- **TMS (staff):** https://cornerstone-tms.web.app
- **Parent Portal:** https://cornerstonecdmhi-portal.web.app  ← note: site id is `cornerstonecdmhi-portal` (the plain `cornerstone-portal` id was globally reserved). `.firebaserc` is updated to match.
- Firestore **rules are deployed** to the named DB (incl. the new invite/role model).
- Each site serves its own app (verified): TMS `/` → staff app, Portal `/` → parent app.

**3 things still need YOU (can't be done from the CLI here):**
1. **Bootstrap the first TMS admin** (see PART 1 → "Provision staff" — without this, even the
   owner hits "pending approval" on the TMS because there's no admin yet to approve anyone).
2. **Point the custom subdomains** `tms.` / `portal.` at the two sites (PART 3 + PART 4 DNS).
3. **Authorized domains:** Firebase Console → Authentication → Settings → **Authorized domains** →
   add `cornerstone-tms.web.app`, `cornerstonecdmhi-portal.web.app`, and later `tms.`/`portal.`
   custom domains. (Email/password sign-in works without this; add them to be safe + for future OAuth.)

---

## What YOU need before starting
- **Domain DNS access** for `cornerstonechilddevelopment.in` (your registrar login).
- **Vercel account** (free is fine), connected to the `cornerstonecdmhi` GitHub.
- **Firebase CLI**: install Node 20, then `npm i -g firebase-tools`, then `firebase login`
  with an account that can access project **gen-lang-client-0142488280**.
- (Optional, for the rules test) **Java 17+** so the Firestore emulator can run.
- Your integration credentials (MSG91 / WhatsApp / SendGrid …) to paste into the admin panel.

---

## PART 1 — Backend first (rules + functions to the NAMED database)
From the **website** repo folder:
```bash
cd website
firebase login
firebase use gen-lang-client-0142488280
# Deploy security rules to BOTH (default) and the named DB (firebase.json now lists both)
firebase deploy --only firestore:rules
# Functions (the integration/notification API)
cd functions && npm install && npm run build && cd ..
firebase deploy --only functions
```
**Heads-up on functions:** we converted 6 triggers from v1 → v2. The deploy will ask to
**delete the old v1 functions** (onAppointmentWrite, onBookingWrite, onContactNew,
onReferralNew, onNewsletterNew, onReviewApproved) and create v2 versions — **say yes**.
v2 needs the **Cloud Run + Eventarc** APIs enabled (Firebase will prompt/enable them).

**Bootstrap the FIRST TMS admin** (one-time, in the Firebase Console — required because the
invite/approval system needs at least one admin to exist before anyone can be approved/invited):
1. Open https://cornerstone-tms.web.app and **sign in / create your account** with your email.
   You'll see "pending approval" — that's expected; it also writes a `tms_access_requests/{uid}` doc.
2. Console → Firestore → select the **`ai-studio-…`** database → collection **`tms_staff`** →
   **Add document**, doc **ID = your Auth UID** → fields:
   `{ name: "Rajkumar", email: "you@…", role: "admin", active: true }`.
   (Find your UID in Console → Authentication → Users, or it's the id of the `tms_access_requests` doc just created.)
3. Reload the TMS — you're now in as admin.

**After that, NO more console work** — from inside the TMS, **Staff & Access**:
- **Invite a teammate** (email + role) → they create their account → auto-provisioned with that role.
- Or approve anyone who self-signed-in (they appear under "Pending access requests").
- **Parent portal access** card → invite a parent (email + family) → they sign in at the portal,
  auto-linked to only their child. (No more manual `tms_parent_users` docs.)

Roles: **admin** = everything incl. financials/config; **senior/therapist** = clinical only.

---

## PART 2 — Website + Admin on Vercel (the `website` repo)
1. Vercel → **Add New → Project → Import** `cornerstonecdmhi/website`.
2. Framework preset **Vite** (auto). Build `npm run build`, Output `dist` (auto).
3. **Environment Variables**: add `GEMINI_API_KEY` if you use it. (Firebase config is committed in
   `firebase-applet-config.json`, so nothing else is needed.)
4. **Deploy.** Open the `*.vercel.app` URL → confirm the website loads, and `/admin.html` shows the Admin Login.
5. **Settings → Domains** → add:
   - `cornerstonechilddevelopment.in` (set `www.` to redirect to it, or vice-versa)
   - `admin.cornerstonechilddevelopment.in`
   Vercel will show the exact DNS records to add (Part 4). `vercel.json` already routes the
   `admin.` host to the admin app.

---

## PART 3 — TMS + Portal on Firebase Hosting (the `cornerstone` repo)
**✅ Already done** — sites created and deployed. The sites are `cornerstone-tms` and
`cornerstonecdmhi-portal`. To **re-deploy after any code change**, from the `cornerstone` repo:
```bash
npm run build            # builds dist (TMS) + dist-portal (portal index = portal.html)
firebase deploy --only hosting --project gen-lang-client-0142488280
```
> Why two dirs: Firebase serves a real `/index.html` *before* rewrites, so the portal site
> needs its own `dist-portal` whose index.html IS the portal app (the build script handles this).

**To attach the friendly subdomains:** Console → Hosting → each site → **Add custom domain**:
- site `cornerstone-tms` → `tms.cornerstonechilddevelopment.in`
- site `cornerstonecdmhi-portal` → `portal.cornerstonechilddevelopment.in`
Firebase shows the DNS records to add (PART 4). Until then the apps are live at the `*.web.app` URLs above.

---

## PART 4 — DNS (your registrar)
Add exactly what Vercel and Firebase show you. Typically:
| Record | Host | Points to | For |
|---|---|---|---|
| A | `@` (root) | Vercel's IP (e.g. `76.76.21.21`) | website |
| CNAME | `www` | `cname.vercel-dns.com` | website |
| CNAME | `admin` | `cname.vercel-dns.com` | admin |
| A | `tms` | Firebase IPs (shown in console) | TMS |
| A | `portal` | Firebase IPs (shown in console) | portal |
SSL certificates auto-provision after DNS verifies (minutes to a few hours).

---

## PART 5 — Connect, test, verify (the proof everything works)
1. **Auth isolation:** staff signs into `tms.` (works) / a parent is rejected there. Parent signs into
   `portal.` (sees only their child) / a staff account is rejected.
2. **Website → TMS flow:** submit a contact/booking on the website → it appears under **Leads & Intake** in the TMS.
3. **Admin ↔ website ↔ DB:** edit the theme/content in the admin → reload the website → change shows
   (this proves rules deployed to the named DB and the shared-DB connection works).
4. **Notifications:** in the admin Integrations, enable a provider + add credentials; set one automation
   (e.g. "new booking → WhatsApp"); submit a test booking → confirm the message sends and is logged.
5. **Security rules test** (needs Java):
   ```bash
   cd website && npm i -D @firebase/rules-unit-testing firebase
   firebase emulators:exec --only firestore "node firestore-rules.test.mjs"
   ```
   Must print `ALL RULES TESTS PASSED`.

---

## What only YOU can do (I can't from here)
- Vercel account + GitHub import; `firebase login`; DNS records at the registrar.
- Creating Auth users + filling `tms_staff`; entering integration credentials.
- Clicking "yes" on the function delete/create prompt; enabling Cloud Run/Eventarc.

## What I've already prepared in the repos
- `cornerstone/firebase.json` + `.firebaserc` — the two hosting targets (tms, portal).
- `website/firebase.json` — rules now deploy to the **named** DB; functions config.
- `website/vercel.json` — routes the `admin.` host to `admin.html`.
- All four apps build cleanly; rules + functions are written and typechecked.
