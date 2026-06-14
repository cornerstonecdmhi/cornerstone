# Cornerstone TMS

Therapies Management System for **Cornerstone Child Development & Mental Health Institute**.
A role-based, mobile-first clinic operations app (React + Vite) on Firebase, served at
`tms.cornerstonecdmhi.com`. Shares the same Firebase project as the public website.

## Stack
- React 18 + TypeScript + Vite
- React Router (role-based routing)
- Firebase (Auth + Firestore named DB + Cloud Functions)
- Plain CSS design system

## Modules
Today · My Day · Clinical · Leads & Intake (+ Website Inbox) · Schedule (availability/slot engine,
Rajkumar booking gate) · Clients & Children · Therapists · Attendance · Assessments · Goals (GAS) ·
Billing (invoices + packages/credits) · Reports · Notifications (WhatsApp/email) · Audit Log · Settings ·
Parent Portal (separate login).

## Develop
```bash
npm install
npm run dev        # http://localhost:5174  (set VITE_FAKE_AUTH=1 in .env.local for demo data)
npm run build      # type-check + production build
```

## Deploy
See `DEPLOY.md` — deploys the Cloud Functions + Firestore rules (named DB) and hosts the app.
Backend functions live in the `cornerstone-clinic/functions` project (shared Firebase).

## Key facts
- India self-pay; clinical services GST-exempt → invoices show 0% tax.
- DPDP-first (verifiable parental consent, no profiling of children).
- Rajkumar (RCI-licensed) is the clinical gate: every child is assessed by him before therapist assignment.
- Demo mode (`VITE_FAKE_AUTH=1`) uses in-memory sample data; production uses Firestore.
