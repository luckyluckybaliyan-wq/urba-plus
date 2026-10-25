import { initializeApp, getApps, getApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import defaultConfig from '../firebase-applet-config.json';

/**
 * Returns a Firebase Admin Firestore instance.
 * Credential priority:
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON env var (inline JSON string) — Vercel / local
 *   2. GOOGLE_APPLICATION_CREDENTIALS env var (path to JSON file) — Cloud Run / GKE
 *   3. Application Default Credentials — GCP-hosted environments
 * Safe to call multiple times — reuses the existing app after the first init.
 */
export function getAdminDb() {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || defaultConfig.projectId;
  const databaseId =
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID ||
    defaultConfig.firestoreDatabaseId;

  let adminApp;
  if (!getApps().length) {
    let credential;
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (saJson) {
      try {
        credential = cert(JSON.parse(saJson));
      } catch {
        console.warn('[firebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON, falling back to ADC');
        credential = applicationDefault();
      }
    } else {
      // GOOGLE_APPLICATION_CREDENTIALS path or GCP metadata server
      credential = applicationDefault();
    }
    adminApp = initializeApp({ credential, projectId });
  } else {
    adminApp = getApp();
  }

  return getFirestore(adminApp, databaseId);
}
