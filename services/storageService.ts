
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

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
      
      await setDoc(docRef, { 
        data: JSON.parse(JSON.stringify(data)),
        updatedAt: timestamp 
      });
      
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
      const docSnap = await getDoc(docRef);
      
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
          await deleteDoc(doc(db, 'app_data', key));
        }
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Erro ao deletar ${key}:`, error);
      }
    }
  }
};
