import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "";

let app;
if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  } catch (e) {
    console.error("Erro ao inicializar Firebase:", e);
  }
}

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : null;

import { doc, getDocFromCache, getDocFromServer } from 'firebase/firestore';

async function testConnection() {
  if (!db) return;
  try {
    // Test connection to Firestore
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // If we get "permission-denied", it means we ARE connected but just don't have access,
    // which is expected for an unauthenticated connection test.
    // We only care if the error indicates a configuration issue (offline/unreachable).
    if (error instanceof Error && (
      error.message.includes('the client is offline') || 
      error.message.includes('failed-precondition') ||
      error.message.includes('unreachable')
    )) {
      console.error("Please check your Firebase configuration. The client is offline or unreachable.");
    }
  }
}

if (isFirebaseConfigured) {
  testConnection();
}

export { isFirebaseConfigured, firebaseConfig };
