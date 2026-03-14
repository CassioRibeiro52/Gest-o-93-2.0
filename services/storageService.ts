
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const storageService = {
  /**
   * Salva os dados no Firestore
   */
  async saveData(key: string, data: any): Promise<number> {
    const path = `app_data/${key}`;
    try {
      if (!db) throw new Error("Firestore não configurado");
      const docRef = doc(db, 'app_data', key);
      const timestamp = Date.now();
      await setDoc(docRef, { data, updatedAt: timestamp });
      return timestamp;
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
      console.error("Erro ao salvar no Firestore:", error);
      localStorage.setItem(key, JSON.stringify(data));
      return Date.now();
    }
  },

  /**
   * Recupera os dados do Firestore
   */
  async loadData<T>(key: string): Promise<T | null> {
    const path = `app_data/${key}`;
    try {
      if (!db) throw new Error("Firestore não configurado");
      const docRef = doc(db, 'app_data', key);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data().data as T;
      }
      
      const localData = localStorage.getItem(key);
      return localData ? JSON.parse(localData) as T : null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        handleFirestoreError(error, OperationType.GET, path);
      }
      console.error("Erro ao carregar do Firestore:", error);
      const localData = localStorage.getItem(key);
      return localData ? JSON.parse(localData) as T : null;
    }
  },

  /**
   * Limpa os dados (Zerar sistema)
   */
  async clearAll(userId: string): Promise<void> {
    const keys = [
      `gestao93_customers_${userId}`,
      `gestao93_sales_${userId}`,
      `gestao93_expenses_${userId}`,
      `gestao93_products_${userId}`,
      `gestao93_trash_${userId}`
    ];
    
    for (const key of keys) {
      const path = `app_data/${key}`;
      try {
        if (db) {
          await deleteDoc(doc(db, 'app_data', key));
        }
        localStorage.removeItem(key);
      } catch (error) {
        if (error instanceof Error && error.message.includes('permission')) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
        console.error(`Erro ao deletar ${key}:`, error);
      }
    }
  }
};
