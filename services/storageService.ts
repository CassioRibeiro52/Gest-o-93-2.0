
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export enum OperationType {
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
    try {
      if (!db) {
        localStorage.setItem(key, JSON.stringify(data));
        return Date.now();
      }
      
      const docRef = doc(db, 'app_data', key);
      const timestamp = Date.now();
      
      try {
        await setDoc(docRef, { 
          data: JSON.parse(JSON.stringify(data)),
          updatedAt: timestamp 
        });
      } catch (error: any) {
        if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
          handleFirestoreError(error, OperationType.WRITE, `app_data/${key}`);
        }
        throw error;
      }
      
      localStorage.setItem(key, JSON.stringify(data));
      return timestamp;
    } catch (error) {
      console.error(`Erro ao salvar ${key}:`, error);
      localStorage.setItem(key, JSON.stringify(data));
      return Date.now();
    }
  },

  /**
   * Recupera os dados do Firestore
   */
  async loadData<T>(key: string): Promise<T | null> {
    try {
      if (!db) {
        const localData = localStorage.getItem(key);
        return localData ? JSON.parse(localData) as T : null;
      }
      
      const docRef = doc(db, 'app_data', key);
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (error: any) {
        if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
          handleFirestoreError(error, OperationType.GET, `app_data/${key}`);
        }
        throw error;
      }
      
      if (docSnap.exists()) {
        const cloudData = docSnap.data().data as T;
        localStorage.setItem(key, JSON.stringify(cloudData));
        return cloudData;
      }
      
      const localData = localStorage.getItem(key);
      return localData ? JSON.parse(localData) as T : null;
    } catch (error) {
      console.error(`Erro ao carregar ${key}:`, error);
      const localData = localStorage.getItem(key);
      return localData ? JSON.parse(localData) as T : null;
    }
  },

  /**
   * Limpa os dados
   */
  async clearAll(userId: string): Promise<void> {
    const keys = [
      `gestao93_customers_${userId}`,
      `gestao93_sales_${userId}`,
      `gestao93_expenses_${userId}`,
      `gestao93_products_${userId}`,
      `gestao93_trash_${userId}`,
      `gestao93_condicionais_${userId}`
    ];
    
    for (const key of keys) {
      try {
        if (db) {
          try {
            await deleteDoc(doc(db, 'app_data', key));
          } catch (error: any) {
            if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
              handleFirestoreError(error, OperationType.DELETE, `app_data/${key}`);
            }
            throw error;
          }
        }
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Erro ao deletar ${key}:`, error);
      }
    }
  }
};
