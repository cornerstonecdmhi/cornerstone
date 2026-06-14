# Cornerstone TMS — Deploy Runbook

> ⚠️ **Auth & hosting model updated by the security pass — see [`GO-LIVE.md`](GO-LIVE.md).**
> TMS access is now gated by **`tms_staff`** (roles admin/senior/therapist), **not** `admin_users`
> (Step 3 below is superseded). The app is now two Vite entries (`index.html` = TMS staff app,
> `portal.html` = parent portal) deployed to **two** Hosting sites (`tms.` / `portal.`), so Step 4's
> single-site `public/index.html` approach is superseded too. The Cloud Functions / notifications /
> ingest details below are still accurate.

This sets up the **cloud invoice system**: a Cloud Function "API layer" that writes
invoices + audit logs to your **named** Firestore database, gated to your staff.

> You run these steps with your own Firebase login (`firebase login`). I build the code;
> you deploy and test, because I can't (and shouldn't) hold your Firebase credentials.

Project: **gen-lang-client-0142488280** · Named DB: **ai-studio-7ad19acf-dc74-4f98-9053-eddd942047d3**

---

## What was added (in your `cornerstone-clinic` repo)
| File | Change |
|---|---|
| `functions/src/tms.ts` | **New.** Callable functions `tmsSaveInvoice` + `tmsDeleteInvoice` (atomic numbering, server-computed totals, audit logs). Targets the **named** DB. |
| `functions/src/index.ts` | One line added: `export * from './tms';` |
| `firestore.rules` | Added `tms_invoices`, `tms_audit_logs`, `tms_counters` (Functions write / admin read) and `tms_settings`, `tms_services` (admin read+write). |

---

## Step 1 — Deploy the Cloud Functions
```bash
cd cornerstone-clinic/functions
npm install          # if not already
npm run build        # tsc — already verified to compile
cd ..
firebase deploy --only functions:tmsSaveInvoice,functions:tmsDeleteInvoice,functions:tmsIngestLead,functions:tmsSendNotification,functions:tmsAvailableSlots,functions:tmsBookSlot
```
Verify in Firebase Console → Functions that all six appear.

**Website booking sync (`tmsAvailableSlots` + `tmsBookSlot`):** the public website calls these to
show live availability and book into the TMS calendar (single source of truth):
- `GET tmsAvailableSlots?date=YYYY-MM-DD&discipline=Speech%20Therapy&durationMin=45`
  → `{ therapists:[{ therapistId, therapistName, slots:[…] }] }`
- `POST tmsBookSlot` `{ date, time, therapistId, service, durationMin, parentName, phone, email, childName, fee, paymentStatus }`
  → re-checks the slot is free, creates a `Requested`/`source=website` appointment + lead → `{ ok, id }` (or `409 slot_taken`).
Both are public (CORS open) and read/write the named DB via the Admin SDK.

**WhatsApp / SMS / email (`tmsSendNotification`):** reuses your existing integration engine
(`executeAction`: MSG91 `send_whatsapp`/`send_sms`, WhatsApp Cloud API `send_template`,
SendGrid `send_email`). To actually send, the relevant provider must be **enabled with
credentials in the `integrations` collection** (managed from your website admin → Integrations):
- `integrations/msg91` → `{ enabled:true, credentials:{ authKey, whatsappNumber, senderId } }`
- `integrations/whatsapp_cloud` → `{ enabled:true, credentials:{ phoneNumberId, accessToken, templateName } }`
- `integrations/sendgrid` → `{ enabled:true, credentials:{ apiKey, fromEmail } }`
WhatsApp messages outside the 24-hour window need a Meta-approved template. The TMS
Notifications screen composes + sends and logs each send to `tms_notifications`.

**Website integration (`tmsIngestLead`):** an HTTPS endpoint your website POSTs to on
enquiry/booking/payment. Body (JSON): `parentName, phone, email, childName, concern,
service, source, appointmentDate, appointmentTime, fee, paymentStatus, notes`. It creates a
doc in `tms_leads` (named DB) so website bookings + paid appointments appear under **Leads
& Intake** in the TMS. Optional security: set `TMS_INGEST_KEY` (functions env) and send it
as the `x-tms-key` header from the website. The Leads screen reports website-sourced paid
appointments + revenue.

## Step 2 — Deploy the Firestore rules to the NAMED database  ⚠️ read this
Your `firebase.json` currently has the **single-object** firestore form:
```json
"firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" }
```
That deploys rules to the **(default)** database. **Your TMS data lives in the named DB
`ai-studio-…`**, so the rules must be applied there. Two options:

**Option A (recommended) — multi-database form in `firebase.json`:**
```json
"firestore": [
  { "database": "(default)", "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
  { "database": "ai-studio-7ad19acf-dc74-4f98-9053-eddd942047d3", "rules": "firestore.rules", "indexes": "firestore.indexes.json" }
]
```
then:
```bash
firebase deploy --only firestore:rules
```

**Option B —** paste `firestore.rules` into Firebase Console → Firestore → (select the
`ai-studio-…` database) → Rules → Publish.

> ❗ Please confirm where your **existing** website rules are applied. If your current
> `firebase.json` only targets `(default)` but your app uses the named DB, your named DB
> may be running on different (possibly open) rules — worth checking while you're here.

## Step 3 — Make sure your staff are admins
The functions + rules authorise a user only if their UID exists in **`admin_users`** (in
the named DB). For each staff member who should issue invoices:
1. Create their login: Firebase Console → Authentication → Add user (email + password).
2. Copy their **User UID**.
3. Firestore (named DB) → `admin_users` → add a document with **ID = that UID** (any fields,
   e.g. `{ name: "...", role: "admin" }`).

## Step 4 — Host the app on the subdomain  *(front-end delivered next)*
The standalone invoice app (`cornerstone-tms/public/index.html`) will:
- show a **login screen** (Firebase Auth),
- call `tmsSaveInvoice` to save, and read `tms_invoices` live from Firestore.

Hosting options:
- **Firebase Hosting (multi-site):** `firebase hosting:sites:create cornerstone-tms`,
  add a `hosting` target pointing `public: cornerstone-tms/public`, `firebase deploy --only hosting`,
  then add the custom domain `tms.cornerstonecdmhi.com` in Console → Hosting → Add custom domain
  (add the DNS record they give you).
- **Vercel** (like your website): point a project at `cornerstone-tms/public`, set the domain.

## Step 5 — Test
1. Open the hosted URL → log in with an `admin_users` account.
2. Create an invoice → confirm a doc appears in `tms_invoices` with a `number` like `INV-2526-0001`.
3. Confirm a matching entry in `tms_audit_logs` (action `create`, your email, timestamp).
4. Save again / edit → number stays; a new `update` audit entry appears.

---

## Data model (named DB)
- `tms_invoices/{id}` — full invoice + server-computed totals + `createdBy`/`updatedBy`.
- `tms_audit_logs/{auto}` — `{ action, entity, invoiceId, number, by, at, summary }`.
- `tms_counters/{PREFIX-FY}` — `{ value }` sequential counter (e.g. `INV-2526`).
- `tms_settings/{id}` — clinic details, bank/UPI, logo, prefixes (admin-managed).
- `tms_services/{id}` — service catalog + prices + tax treatment.
