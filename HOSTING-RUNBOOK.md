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

**Provision staff** (Firebase Console → Firestore → select the `ai-studio-…` database):
1. Console → Authentication → add each staff member (email + password). Copy each **UID**.
2. Firestore (named DB) → collection `tms_staff` → doc **ID = that UID** →
   `{ name: "Rajkumar", role: "admin", active: true }` (roles: admin | senior | therapist).
   Tip: copy your current `admin_users` people in as `role:"admin"` first (no lockout), then demote.

**Parents** (later, as you onboard): `tms_parent_users/{uid}` → `{ name, clientId }` where
`clientId` is their `tms_clients` doc id.

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
From the **cornerstone** repo folder:
```bash
cd cornerstone
npm install
npm run build            # produces dist/index.html (TMS) + dist/portal.html (portal)
firebase login           # if not already
firebase hosting:sites:create cornerstone-tms
firebase hosting:sites:create cornerstone-portal
# .firebaserc already maps target tms->cornerstone-tms, portal->cornerstone-portal.
# If the created site IDs differ, run:
#   firebase target:apply hosting tms <your-tms-site-id>
#   firebase target:apply hosting portal <your-portal-site-id>
firebase deploy --only hosting:tms,hosting:portal
```
Open the two `*.web.app` URLs → confirm the TMS shows the staff login and the portal shows the
parent login. Then **Console → Hosting →** each site → **Add custom domain**:
- site `cornerstone-tms` → `tms.cornerstonechilddevelopment.in`
- site `cornerstone-portal` → `portal.cornerstonechilddevelopment.in`

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
