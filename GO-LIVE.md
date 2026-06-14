# Go-live runbook — three-surface security model (final pre-launch phase)

Supersedes the auth/hosting steps in `DEPLOY.md` (which predates the security pass).
Three audience-scoped surfaces, one Firebase project (`gen-lang-client-0142488280`),
one named Firestore DB. Hosting is the **last** step before going live.

| Surface | App | Subdomain | Who can sign in |
|---|---|---|---|
| Website + admin | `cornerstone-clinic` | `www.` / `admin.` | `admin_users` |
| TMS (staff) | `cornerstone-tms` (`index.html`) | `tms.` | `tms_staff` |
| Parent portal | `cornerstone-tms` (`portal.html`) | `portal.` | `tms_parent_users` |

Access is enforced **server-side** (Firestore rules + Cloud Functions), so it holds
even if the UI is bypassed. Separate logins/URLs are clarity only.

## 1. Provision staff BEFORE deploying the new rules (avoids lockout)
The rules now gate the TMS on `tms_staff/{uid}` — **not** `admin_users`. Create a
`tms_staff` doc per real staff member, keyed by their Firebase Auth UID:
```
tms_staff/<uid> = { name: "Rajkumar", role: "admin",     active: true }
tms_staff/<uid> = { name: "...",      role: "senior",    active: true }
tms_staff/<uid> = { name: "...",      role: "therapist", active: true }
```
Auto-migrate-then-tighten: copy each `admin_users` member into `tms_staff` as
`role:"admin"` so no one is locked out, then demote individuals to `senior`/`therapist`.
Tiering: **admin** = financials/billing/config/audit; **senior/therapist** = clinical only.

## 2. Verify the rules — the breach proof (needs Java + firebase-tools)
```
cd cornerstone-clinic
npm i -D @firebase/rules-unit-testing firebase
firebase emulators:exec --only firestore "node firestore-rules.test.mjs"
```
Must print `ALL RULES TESTS PASSED`. Asserts the 3×3 matrix: website admin gets
nothing in TMS; senior/therapist get no financials; a parent gets only their own
child (and only *shared* assessment reports); unauth gets nothing.

## 3. Deploy rules + functions (from cornerstone-clinic)
```
cd cornerstone-clinic
firebase deploy --only firestore:rules     # ensure it targets the NAMED db — see DEPLOY.md Step 2
firebase deploy --only functions:tmsSaveInvoice,functions:tmsDeleteInvoice,functions:tmsBookSlot,functions:tmsIngestLead,functions:tmsAvailableSlots
```
Optional anti-spam: set `TMS_INGEST_KEY` (functions env) and have the website send
header `x-tms-key` — `tmsBookSlot` and `tmsIngestLead` then reject anonymous writes.

## 4. Create the two Hosting sites + deploy (from cornerstone-tms)
```
cd cornerstone-tms
firebase hosting:sites:create cornerstone-tms
firebase hosting:sites:create cornerstone-portal
npm run build      # dist/index.html (TMS) + dist/portal.html (portal)
firebase deploy --only hosting:tms,hosting:portal
```
`firebase.json` (hosting targets) and `.firebaserc` (target→site map) are already in
this folder. Then add custom domains in the console: `tms.` → `cornerstone-tms`,
`portal.` → `cornerstone-portal`, and set DNS. (Website/admin deploy from cornerstone-clinic.)

## 5. Final live 3×3 check
- Staff at `tms.` works; a parent account is rejected there.
- Parent at `portal.` sees only their own child; a staff account is rejected.
- senior/therapist see clinical data but **no** Revenue / Create-invoice.
- A website admin cannot read any `tms_*` data.

## Notes
- `ParentLogin` "Staff login →" links to `/login`; repoint to the `tms.` URL once subdomains exist (cosmetic).
- Recurring/combo **pricing model** is intentionally deferred and must be fully customizable when built.
