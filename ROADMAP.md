# Cornerstone Platform — Roadmap & Pending Works

The single source of truth for what's done, what's next, and what's parked.
Four surfaces, one Firebase backend (project `gen-lang-client-0142488280`, named DB
`ai-studio-7ad19acf-…`). Repos: `website` (public site + admin), `cornerstone` (TMS + parent portal).

---

## ✅ Done / live
- **Website + admin** hosted on Vercel; `admin.` subdomain routing fixed; admin gated on `admin_users`.
- **Firestore rules deployed** to the named DB (admin gate + content reads work).
- **Admin "Access & Admins" page** — approve requests + manage admins from the UI.
- **TMS**: 15 digitized assessments, Care Plans, scheduling, billing, date-ranged reports,
  assessment-to-assessment tracking, notification center (9 alert kinds), tiered roles
  (admin/senior/therapist), Staff & Access approval queue, mobile-responsive.
- **Parent portal**: split into its own app/bundle, own login, sees only its own child,
  care plan + shared reports + notices.
- **Security**: per-surface identity (`admin_users` / `tms_staff` / `tms_parent_users`),
  Firestore rules tiered, 3×3 rules test written, password toggles, CI secret-scanning.

---

## ▶ PHASE 1 (NOW) — Take TMS + Parent Portal live
*Mirrors what we did for the website. Hosting = Firebase (per `HOSTING-RUNBOOK.md`).*
- [ ] `firebase deploy` the **TMS + portal** builds to two Firebase Hosting sites
      (`cornerstone-tms`, `cornerstone-portal`) → subdomains `tms.` / `portal.`
- [ ] Provision **`tms_staff`** for real staff (admin/senior/therapist) + `tms_parent_users` for parents.
- [ ] Smoke-test the 3×3: staff→tms only, parent→portal only, website-admin→website only.
- [ ] (Their manual part: `firebase hosting:sites:create`, DNS, deploy. My runbook is ready.)

## ▶ PHASE 2 — Access, Invites & Roles (the "fully functional" gap)
*Shopify-style staff management across ALL panels. This is the big missing piece.*
- [ ] **Invite by email** (proactive): admin enters email + role → invite stored → invitee
      signs in → **auto-provisioned** with that role (no manual approval). Pending invites listed.
- [ ] **Add / remove user** from the panel (already partial: approve = add; remove exists).
- [ ] **Request access** (reactive, already built): sign-in → request → approve. Keep as fallback.
- [ ] **Role-specific access / levels** — TMS already tiered (admin/senior/therapist). Add
      **roles to the website admin** (e.g. owner / admin / editor) + gate sections accordingly.
- [ ] **Parent invites**: invite a parent by email, linked to their child, → portal access.
- [ ] Consistent **Access** screen on every panel (TMS has Staff & Access; website admin has
      Access & Admins; portal = parents managed from TMS).
- See "Shopify-inspired model" below.

## ⏸ PHASE 3 — Integrations & Auto-notifications (DEFERRED — budget)
*Team sends notifications MANUALLY for now; not in budget.*
- [ ] `firebase deploy --only functions` (v2 triggers, Cloud Run/Eventarc) — only when ready.
- [ ] Channel credentials (MSG91 / WhatsApp / SendGrid / Razorpay) in the admin Integrations hub.
- [ ] Wire alerts → outbound WhatsApp/email; automations (new booking → auto-message).
- [ ] Payment links, daily digest, webhook receivers.

## ◻ PHASE 4 — Polish & future expansion
- [ ] Image base64→Storage **migration** of existing images (new uploads already fixed).
- [ ] Therapist **performance dashboard** (data already captured).
- [ ] Website→TMS **sync toggle / auto-sync** (manual Import/Onboard works today).
- [ ] Recurring/combo **billing plan model** (pricing rules — with Raj).
- [ ] Full mobile/layout audit of website + admin.
- [ ] Assessment **report-to-portal** for non-shared, granular sharing controls.
- [ ] Live **rules-unit-test** run (`firebase emulators:exec` — needs Java).
- [ ] App Check, Firestore backups, error monitoring (Sentry), email verification flows.

---

## Shopify-inspired access model (design for Phase 2)
Shopify: an **Owner** invites **Staff** by email; each staff account has a **role/permission set**;
invitees **accept the email invite** and set their own password; the last owner can't be removed.
Adopt the same shape with Firebase:

| Concept | Shopify | Cornerstone implementation |
|---|---|---|
| Invite by email | Owner sends invite | `invites/{email}` = `{ email, role, invitedBy, createdAt, status }` |
| Accept invite | Invitee sets password | Invitee signs in (Firebase Auth) → on first load, auth resolver finds the invite for their email → **auto-creates** their `tms_staff` / `admin_users` doc with the invited role → marks invite accepted |
| Request access | (n/a) | Already built — sign-in without invite → pending request → admin approves |
| Roles | Permission sets | TMS: admin/senior/therapist (tiered rules). Website admin: add owner/admin/editor |
| Last-admin guard | Can't remove last owner | Already in the Access pages |
| Audit | Activity log | `tms_audit_logs` exists; extend to access changes |

**Why invites matter:** today a new staffer must sign in *first* (creating a pending request) and
*then* be approved. Invites flip it — the admin invites first, and the person gets the right access
automatically on first sign-in. That's the standard, expected SaaS flow.

---

## Notes
- Functions are **not deployed** yet (Phase 3). Rules ARE deployed.
- Two named Firestore DBs exist; the app uses `ai-studio-7ad19acf-…`.
- Hosting steps for staff/portal: see `HOSTING-RUNBOOK.md`.
