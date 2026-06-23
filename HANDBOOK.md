# Cornerstone Platform — Master Handbook (all apps & pages)

_Last updated: 2026-06-23. Single source of truth for the four surfaces, every page, hosting, and go-live._

---

## 1. The platform at a glance

**One Firebase backend, four front-end surfaces, two hosts.**
- Firebase project: **`gen-lang-client-0142488280`**
- Firestore **named** database: **`ai-studio-7ad19acf-…`** (the app's DB — there is *no* `(default)` DB)
- Two source repos, four deployed apps:

| # | Surface | Who logs in | Repo (entry) | Host | URL |
|---|---|---|---|---|---|
| 1 | **Public website** | nobody (public) | `website` (`index.html`) | **Vercel** | `cornerstonechilddevelopment.in` + `www.` |
| 2 | **Website Admin** | website managers | `website` (`admin.html`) | **Vercel** (same project) | `admin.` |
| 3 | **TMS (staff)** | clinic staff | `cornerstone` (`index.html`) | **Firebase Hosting** | `tms.` → **https://cornerstone-tms.web.app** |
| 4 | **Parent Portal** | parents | `cornerstone` (`portal.html`→`dist-portal`) | **Firebase Hosting** | `portal.` → **https://cornerstonecdmhi-portal.web.app** |

> Repos are **not** the security boundary. Isolation is enforced by **Firestore rules + per-app login + separate bundles** — see §3. Website+Admin share one codebase (Vercel routes the `admin.` host to `admin.html`); TMS+Portal share the other (two Firebase sites).

**Live status:** Website + Admin on Vercel ✅ · TMS + Portal on Firebase Hosting ✅ (deployed 2026-06-23). Rules deployed to the named DB ✅. **Cloud Functions NOT deployed** (Phase 3, deferred — team sends notifications manually).

---

## 2. Take TMS + Parent Portal fully live (remaining steps)

The apps are **already deployed and reachable** at the `.web.app` URLs above. Three things finish the job — only you can do them:

### Step 1 — Become the first TMS admin (self-service — no console needed)
The first TMS admin is **claimed automatically**: sign into the TMS with **the same account you use for the website Admin panel** (an `admin_users` member). Because no TMS admin exists yet, the system promotes that website-admin to the first TMS admin on sign-in, then **locks** the bootstrap (a `tms_config/bootstrap` sentinel) so no one else can self-promote later.

1. Open **https://cornerstone-tms.web.app**. If you're on the "pending" screen, **Sign out**.
2. **Sign in with your website-admin email** (the one that already works at `admin.` / the admin panel).
3. You land straight in as **admin**. From here, add everyone else from **Staff & Access → Invite** — no console work, ever.

> Security: only an existing, vetted website admin can claim it, and only once. A *second* website admin added later can **not** self-promote into the clinic (the sentinel blocks it). If you'd rather do it by hand, you can still add `tms_staff/{your-uid}` `{role:"admin",active:true}` in the Firestore console.

### Step 2 — Point the friendly subdomains (DNS)
Firebase Console → **Hosting** → for each site → **Add custom domain**:
- site **`cornerstone-tms`** → `tms.cornerstonechilddevelopment.in`
- site **`cornerstonecdmhi-portal`** → `portal.cornerstonechilddevelopment.in`

Firebase shows the exact DNS records (usually two `A` records or a `TXT` + `A`). Add them at your domain registrar. SSL auto-provisions (minutes–hours). Until then, the `.web.app` URLs work.

### Step 3 — Authorize the domains for sign-in
Firebase Console → **Authentication → Settings → Authorized domains** → add:
`cornerstone-tms.web.app`, `cornerstonecdmhi-portal.web.app`, and later `tms.` / `portal.cornerstonechilddevelopment.in`.
(Email/password sign-in works without this, but add them to be safe and for any future Google sign-in.)

### Then verify (the 3×3 isolation test)
- A **staff** account works on TMS, and a **parent** account is rejected there.
- A **parent** works on the Portal (sees only their child), and a **staff** account is rejected there.
- A **website admin** manages the website only — no clinical/billing access.

---

## 3. Identity, roles & the invite system (how access works)

Three separate identities, all in the named DB. **Being logged in is never enough — a membership doc is required, and Firestore rules enforce it server-side.**

| Identity collection | Grants access to | Roles |
|---|---|---|
| `admin_users/{uid}` | Website Admin | **owner / admin / editor** |
| `tms_staff/{uid}` | TMS | **admin / senior / therapist** |
| `tms_parent_users/{uid}` | Parent Portal | (parent — sees only their linked child) |

**What each role can do**
- **Website admin:** *owner/admin* manage people, integrations, settings; *editor* edits content only (Access/Integrations/Settings hidden + blocked).
- **TMS:** *admin* = everything incl. financials/config/audit; *senior/therapist* = clinical only (no billing/financials).
- **Parent:** their own child's care plan, sessions, receipts, and **shared** reports — nothing else.

**Two ways to add someone (both live on all panels):**
1. **Invite (proactive, recommended):** an admin enters an email + role → the person creates their account → they're **auto-provisioned with that role on first sign-in**. No second approval.
   - Website: Admin → **Access & Admins** → "Invite a teammate".
   - TMS: **Staff & Access** → "Invite a teammate" (staff) or "Parent portal access" (invite a parent, linked to their family).
2. **Request access (reactive fallback):** someone signs in without an invite → lands on a "pending" screen → appears under the panel's Access page for an admin to **Approve** (with a role) or **Deny**.

**Guards:** the last owner/admin can't be removed or demoted (no lock-out). Invites are listed and revocable. Parent invites copy the family link from the invite, so a parent can't attach to another family's child.

---

## 4. Page map — every app

### App 1 · Public Website (Vercel, public)
Multi-language shells: `/` (English), `/te/*` (Telugu), `/hi/*` (Hindi).

| Path | Page |
|---|---|
| `/` | Home |
| `/about` | About us |
| `/services` | Services overview |
| `/services/therapies/:slug` | Individual therapy page |
| `/conditions/:slug` | Condition page |
| `/book` | Full intake/booking form |
| `/book-appointment` · `/book-consultation` · `/book-assessment` | Quick booking variants |
| `/contact` | Contact form |
| `/refer` | Referral form |
| `/testimonials` | Reviews/testimonials |
| `/blog` · `/blog/:slug` | Blog list + post |
| `/p/:slug` | Custom (CMS) pages |
| `/privacy-policy` · `/terms` · `/cookie-policy` | Legal pages |
| `/preview/:token` | Draft preview |
| `*` | 404 |

> Public forms (book/contact/refer/newsletter) write straight to the shared DB; the TMS reads them under **Leads & Intake**.

### App 2 · Website Admin (Vercel, `admin.` host → `admin.html`)
Login → gated on `admin_users`. Nav (★ = owner/admin only; editors don't see these):

| Group | Pages |
|---|---|
| **Overview** | Dashboard (`/admin`), Analytics |
| **Patients & Bookings** | Appointments, Contacts, Referrals |
| **Content** | CMS / Blog, Translations, Page Builder, Reviews, Comments |
| **Clinic** | Team, Newsletters, Products, ★ Integrations |
| **System** | ★ Access & Admins, Theme Editor, Sitemap, ★ Settings |

Plus: a notification bell (derives from contacts/bookings/appointments/reviews/referrals).

### App 3 · TMS — staff console (Firebase Hosting, `tms.`)
Login → gated on `tms_staff`. Each role lands on its own home. Pages (with who can open them):

| Page | Path | admin | senior | therapist |
|---|---|:--:|:--:|:--:|
| Today (admin home) | `/today` | ✅ | | |
| My Day (therapist home) | `/my-day` | | | ✅ |
| Clinical (senior home) | `/clinical` | | ✅ | |
| Leads & Intake | `/leads` | ✅ | | |
| Schedule | `/schedule` | ✅ | ✅ | ✅ |
| Clients & Children | `/clients` | ✅ | ✅ | ✅ |
| Therapists | `/therapists` | ✅ | ✅ | |
| Care Plans | `/care-plans` | ✅ | ✅ | |
| Assessments | `/assessments` | ✅ | ✅ | |
| Attendance | `/attendance` | ✅ | ✅ | |
| Goals | `/goals` | ✅ | ✅ | ✅ |
| Billing | `/billing` | ✅ | | |
| Reports | `/reports` | ✅ | ✅ | |
| Notifications | `/notifications` | ✅ | | |
| Audit Log | `/audit` | ✅ | | |
| Staff & Access | `/staff` | ✅ | | |
| Settings | `/settings` | ✅ | | |

Plus: top-bar **Notification Center** (9 alert kinds — leads, bookings, low credits, reviews, consent, assessments, invoices, no-shows, leave; several are actionable inline). A "pending approval" screen for not-yet-approved sign-ins.

### App 4 · Parent Portal (Firebase Hosting, `portal.`)
Login → gated on `tms_parent_users`. Single dashboard, scoped to the parent's child:
- Child overview + **care plan** (therapies, plan type, status)
- **Upcoming sessions** / schedule
- **Receipts / invoices**
- **Assessments & reports** — only those staff explicitly **shared to the portal**
- **Notices** strip (next session, payment due, reports available)

---

## 5. Deploy / re-deploy (after any code change)

> Login is already cached (`firebase login` as rajkumar@…). All commands target project `gen-lang-client-0142488280`.

### Backend — Firestore rules (named DB), from the `website` repo
```bash
cd website
firebase deploy --only firestore:rules --project gen-lang-client-0142488280
```

### TMS + Parent Portal, from the `cornerstone` repo
```bash
cd cornerstone
npm install            # first time only
npm run build          # builds dist (TMS) AND dist-portal (portal index = portal.html)
firebase deploy --only hosting --project gen-lang-client-0142488280
```
> **Why `dist-portal`:** Firebase serves a real `/index.html` *before* rewrites, so the portal site needs its own folder whose `index.html` IS the portal app. `npm run build` runs `scripts/prepare-portal-dist.mjs` to produce it automatically.

### Website + Admin (Vercel)
Push to the connected branch (or `vercel --prod`). `vercel.json` routes the `admin.` host to `admin.html`.

### Cloud Functions (DEFERRED — Phase 3, only when budget allows)
```bash
cd website/functions && npm install && npm run build && cd ..
firebase deploy --only functions --project gen-lang-client-0142488280
```
(Will prompt to delete old v1 triggers and create v2 — needs Cloud Run/Eventarc enabled.)

---

## 6. Backend reference

- **Named DB collections** (high level): `admin_users`, `admin_invites`, `admin_access_requests`; `tms_staff`, `tms_invites`, `tms_access_requests`, `tms_parent_users`, `tms_parent_invites`; clinical: `tms_clients`, `tms_children`, `tms_appointments`, `tms_attendance`, `tms_goals`, `tms_assessments`, `tms_care_plans`, `tms_child_packages`, `tms_therapists`; config: `tms_settings`/`tms_services`/`tms_packages`/`tms_holidays`/`tms_workhours`; financial/admin: `tms_invoices`, `tms_leads`, `tms_notifications`, `tms_audit_logs`, `tms_counters`; website content + form collections.
- **Rules file:** `website/firestore.rules` (deployed). Enforces the §3 model + invite self-provisioning.
- **No secrets in the repos** — `firebase-applet-config.json` is the public web config (safe). Functions use default credentials.

---

## 7. What's done vs. pending (phase tracker)

Full detail in **`ROADMAP.md`**. Summary:

- **✅ Phase 1 — Go live:** TMS + Portal deployed. _Left:_ the 3 manual steps in §2 (bootstrap admin, DNS, authorized domains).
- **✅ Phase 2 — Access / invites / roles:** built on all panels. _Polish later:_ read-only "viewer" role, granular per-section permissions, audit-log of access changes.
- **⏸ Phase 3 — Integrations & auto-notifications (DEFERRED, budget):** deploy functions + channel credentials (MSG91/WhatsApp/SendGrid/Razorpay); wire alerts → outbound messages. **Team sends manually for now.**
- **◻ Phase 4 — Polish:** image base64→Storage migration of existing images; therapist performance dashboard; recurring/combo billing model (with Raj); website mobile audit; live rules-unit-test run; App Check + backups + error monitoring.

---

## 8. Quick reference card

| I want to… | Where |
|---|---|
| Add a staff member | TMS → **Staff & Access** → Invite a teammate |
| Give a parent portal access | TMS → **Staff & Access** → Parent portal access → Invite parent |
| Add a website manager | Admin → **Access & Admins** → Invite a teammate |
| Change someone's role | the panel's Access page → role dropdown |
| Re-deploy TMS/Portal after a code change | `cd cornerstone && npm run build && firebase deploy --only hosting` |
| Re-deploy security rules | `cd website && firebase deploy --only firestore:rules` |
| Bootstrap the first TMS admin | Console → Firestore → `tms_staff/{your-uid}` `{role:"admin",active:true}` |
