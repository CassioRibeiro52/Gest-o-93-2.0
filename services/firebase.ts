import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Verifica se as chaves mínimas estão presentes
const isFirebaseConfigured = 
  !!firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'TODO_KEYHERE' && 
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
export const db = app ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : null;

// Ativar persistência offline
if (db) {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a a time.
      console.warn('Persistência falhou: múltiplas abas abertas.');
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.warn('Persistência não suportada pelo navegador.');
    }
  });
}

export { isFirebaseConfigured, firebaseConfig };

// Teste de conexão removido para evitar logs confusos
// async function testConnection() { ... }
// testConnection();
