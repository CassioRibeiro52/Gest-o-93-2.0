import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const sanitize = (val: any) => {
  if (typeof val !== 'string') return val;
  // Remove espaços, aspas no início/fim e vírgulas no final
  return val.trim().replace(/^["']|["']$/g, '').replace(/,$/, '');
};

const firebaseConfig = {
  apiKey: sanitize(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: sanitize(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: sanitize(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: sanitize(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: sanitize(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: sanitize(import.meta.env.VITE_FIREBASE_APP_ID)
};

// Verifica se as chaves mínimas estão presentes e não são placeholders
const isFirebaseConfigured = 
  !!firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'undefined' && 
  firebaseConfig.apiKey.length > 10 &&
  !!firebaseConfig.projectId;

let app = null;
try {
  if (isFirebaseConfigured) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
} catch (error) {
  console.error("Erro ao inicializar Firebase:", error);
}

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export { isFirebaseConfigured };
