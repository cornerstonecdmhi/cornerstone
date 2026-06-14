import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Shared Cornerstone Firebase project (same as the website).
// Web config values are safe to ship to the browser; access is controlled by
// Firestore security rules + Auth, not by hiding these.
const firebaseConfig = {
  projectId: 'gen-lang-client-0142488280',
  appId: '1:939602389890:web:e58cd6352691fa9bbd3d9b',
  apiKey: 'AIzaSyAhJ9GE56Fv1vgkDfokk9eYV9kaqdYCJPc',
  authDomain: 'gen-lang-client-0142488280.firebaseapp.com',
  storageBucket: 'gen-lang-client-0142488280.firebasestorage.app',
  messagingSenderId: '939602389890',
};

// The TMS uses the SAME named Firestore database as the website.
export const FIRESTORE_DB_ID = 'ai-studio-7ad19acf-dc74-4f98-9053-eddd942047d3';

// Demo/preview mode: use in-memory sample data instead of Firestore.
// Turns on with VITE_FAKE_AUTH=1 in dev (the shell preview). Off in production.
export const DEMO = import.meta.env.DEV && import.meta.env.VITE_FAKE_AUTH === '1';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, FIRESTORE_DB_ID);
export const functions = getFunctions(app);

// Callable wrappers for the invoice API layer (functions/src/tms.ts)
export const callSaveInvoice = httpsCallable(functions, 'tmsSaveInvoice');
export const callDeleteInvoice = httpsCallable(functions, 'tmsDeleteInvoice');
// WhatsApp / SMS / email send (reuses the existing integration engine)
export const callSendNotification = httpsCallable(functions, 'tmsSendNotification');
