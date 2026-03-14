
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
  const errorMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorMsg,
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
  console.error(`[Firestore ${operationType.toUpperCase()}] Erro em ${path}:`, errorMsg);
  console.error('Detalhes do Erro:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

export const storageService = {
  /**
   * Salva os dados no Firestore
   */
  async saveData(key: string, data: any): Promise<number> {
    const path = `app_data/${key}`;
    try {
      if (!db) {
        console.warn("Firestore não inicializado. Salvando apenas localmente.");
        localStorage.setItem(key, JSON.stringify(data));
        return Date.now();
      }
      
      const docRef = doc(db, 'app_data', key);
      const timestamp = Date.now();
      
      // Tenta salvar no Firestore
      await setDoc(docRef, { 
        data: JSON.parse(JSON.stringify(data)), // Garante que é serializável
        updatedAt: timestamp 
      });
      
      // Também salva localmente para redundância
      localStorage.setItem(key, JSON.stringify(data));
      return timestamp;
    } catch (error: any) {
      console.error(`Erro crítico ao salvar ${key}:`, error.message || error);
      
      // Salva localmente como fallback
      localStorage.setItem(key, JSON.stringify(data));
      
      // Propaga o erro para o App.tsx se for algo que impeça a sincronização
      if (error.code === 'permission-denied') {
        console.error("ERRO DE PERMISSÃO: Verifique se as regras do Firestore estão corretas e se o usuário está logado.");
        handleFirestoreError(error, OperationType.WRITE, path);
      } else if (error.message?.includes('offline') || error.message?.includes('network')) {
        console.error("ERRO DE CONEXÃO: O cliente parece estar offline.");
        handleFirestoreError(error, OperationType.WRITE, path);
      } else {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
      
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
