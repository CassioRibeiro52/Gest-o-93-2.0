
import { useState, useEffect, useCallback, useRef } from 'react';
import { Customer, Sale, User, Expense, Product, TrashItem, PaymentStatus, Condicional, CashierClosure } from '../types';
import { storageService } from '../services/storageService';
import { db, auth as firebaseAuth } from '../services/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  deleteDoc, 
  writeBatch,
  getDoc,
  updateDoc
} from 'firebase/firestore';

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
  const currentUser = firebaseAuth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const useAppData = (user: User | null, showNotification: (message: string, type?: 'success' | 'error' | 'info') => void) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [condicionais, setCondicionais] = useState<Condicional[]>([]);
  const [cashierClosures, setCashierClosures] = useState<CashierClosure[]>([]);
  const [trashSales, setTrashSales] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const isMounted = useRef(false);

  // Initial load and Firestore listeners
  useEffect(() => {
    if (!user || !db) {
      setCustomers([]);
      setSales([]);
      setExpenses([]);
      setProducts([]);
      setTrashSales([]);
      setCondicionais([]);
      setCashierClosures([]);
      setLoading(false);
      setIsInitialLoadComplete(false);
      return;
    }

    const userId = user.id;
    setLoading(true);

    // Local data load as fallback/initial state
    const loadLocalData = async () => {
      try {
        const tutorialSeen = await storageService.loadData<string>(`gestao93_tutorial_seen_${userId}`);
        if (!tutorialSeen) setShowTutorial(true);

        const [loadedCustomers, loadedSales, loadedExpenses, loadedProducts, loadedTrash, loadedCondicionais, loadedClosures] = await Promise.all([
          storageService.loadData<Customer[]>(`gestao93_customers_${userId}`),
          storageService.loadData<Sale[]>(`gestao93_sales_${userId}`),
          storageService.loadData<Expense[]>(`gestao93_expenses_${userId}`),
          storageService.loadData<Product[]>(`gestao93_products_${userId}`),
          storageService.loadData<TrashItem[]>(`gestao93_trash_${userId}`),
          storageService.loadData<Condicional[]>(`gestao93_condicionais_${userId}`),
          storageService.loadData<CashierClosure[]>(`gestao93_closures_${userId}`)
        ]);

        if (loadedCustomers) setCustomers(loadedCustomers);
        if (loadedSales) setSales(loadedSales);
        if (loadedExpenses) setExpenses(loadedExpenses);
        if (loadedProducts) setProducts(loadedProducts);
        if (loadedCondicionais) setCondicionais(loadedCondicionais);
        if (loadedClosures) setCashierClosures(loadedClosures);
        if (loadedTrash) setTrashSales(loadedTrash);
      } catch (e) {
        console.error("Erro ao carregar dados locais:", e);
      }
    };

    loadLocalData();

    // Firestore Listeners
    const unsubscribers: (() => void)[] = [];

    const setupListener = (collectionName: string, setter: (data: any[]) => void) => {
      const path = `users/${userId}/${collectionName}`;
      const q = query(collection(db!, path));
      
      const unsub = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data());
        setter(data);
        
        // Save to local storage for offline use
        storageService.saveData(`gestao93_${collectionName}_${userId}`, data).catch(console.error);
        
        setLastSyncTime(Date.now());
        setSyncStatus('synced');
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        setSyncStatus('error');
      });
      
      unsubscribers.push(unsub);
    };

    setupListener('customers', setCustomers);
    setupListener('sales', setSales);
    setupListener('expenses', setExpenses);
    setupListener('products', setProducts);
    setupListener('condicionais', setCondicionais);
    setupListener('cashierClosures', setCashierClosures);
    setupListener('trashSales', setTrashSales);

    setIsInitialLoadComplete(true);
    isMounted.current = true;
    setLoading(false);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user]);

  // Auto-save (now only for user profile and tutorial status)
  useEffect(() => {
    if (loading || !user || !isMounted.current || !isInitialLoadComplete) return;

    const autoSave = async () => {
      try {
        const userId = user.id;
        await storageService.saveData(`gestao93_current_user_${userId}`, user);
      } catch (err) {
        console.error("Falha no Auto-Save do perfil:", err);
      }
    };

    const timer = setTimeout(autoSave, 5000);
    return () => clearTimeout(timer);
  }, [user, loading, isInitialLoadComplete]);

  const handleUpdateSale = useCallback(async (updatedSale: Sale) => {
    if (!user || !db) return;
    const path = `users/${user.id}/sales/${updatedSale.id}`;
    try {
      await setDoc(doc(db, path), updatedSale);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }, [user]);

  const handleAddProduct = useCallback(async (newProduct: Omit<Product, 'id'>) => {
    if (!user || !db) return;
    const existingIndex = products.findIndex(p => p.sku.toUpperCase() === newProduct.sku.toUpperCase());
    
    if (existingIndex !== -1) {
      const existing = products[existingIndex];
      const totalOldCost = Math.max(0, existing.stock) * existing.costPrice;
      const totalNewCost = newProduct.stock * newProduct.costPrice;
      const totalStock = Math.max(0, existing.stock) + newProduct.stock;
      
      const weightedAverageCost = totalStock > 0 ? (totalOldCost + totalNewCost) / totalStock : newProduct.costPrice;
      
      const updated: Product = {
        ...existing,
        stock: totalStock,
        costPrice: weightedAverageCost,
        price: newProduct.price,
        name: newProduct.name
      };
      
      const path = `users/${user.id}/products/${updated.id}`;
      try {
        await setDoc(doc(db, path), updated);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    } else {
      const id = Math.random().toString(36).substr(2, 9);
      const product: Product = { ...newProduct, id };
      const path = `users/${user.id}/products/${id}`;
      try {
        await setDoc(doc(db, path), product);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    }
  }, [user, products]);

  const handleUpdateProduct = useCallback(async (updatedProduct: Product) => {
    if (!user || !db) return;
    const path = `users/${user.id}/products/${updatedProduct.id}`;
    try {
      await setDoc(doc(db, path), updatedProduct);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }, [user]);

  const handleDeleteProduct = useCallback(async (id: string) => {
    if (!user || !db) return;
    const path = `users/${user.id}/products/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }, [user]);

  const handleAddCustomer = useCallback(async (c: Omit<Customer, 'id' | 'createdAt'>) => {
    if (!user || !db) return;
    const id = Math.random().toString(36).substr(2, 9);
    const customer: Customer = { ...c, id, createdAt: Date.now() };
    const path = `users/${user.id}/customers/${id}`;
    try {
      await setDoc(doc(db, path), customer);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }, [user]);

  const handleUpdateCustomer = useCallback(async (updated: Customer) => {
    if (!user || !db) return;
    const path = `users/${user.id}/customers/${updated.id}`;
    try {
      await setDoc(doc(db, path), updated);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }, [user]);

  const handleDeleteCustomer = useCallback(async (id: string) => {
    if (!user || !db) return;
    const path = `users/${user.id}/customers/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }, [user]);

  const handleAddSale = useCallback(async (s: Omit<Sale, 'id'>) => {
    if (!user || !db) return;
    const batch = writeBatch(db);

    const isSameMonthYear = (d1: string, d2: string) => {
      const [y1, m1] = d1.split('-').map(Number);
      const [y2, m2] = d2.split('-').map(Number);
      return m1 === m2 && y1 === y2;
    };

    let saleToSave: Sale;

    if (s.type === 'credit' && s.customerId !== 'BALCAO') {
      const existingSaleIndex = sales.findIndex(prev => 
        prev.customerId === s.customerId && 
        prev.type === 'credit' && 
        prev.status !== PaymentStatus.PAID &&
        isSameMonthYear(prev.date, s.date)
      );

      if (existingSaleIndex !== -1) {
        const existingSale = sales[existingSaleIndex];
        const updatedItems = [...existingSale.items, ...s.items];
        const updatedBaseAmount = existingSale.baseAmount + s.baseAmount;
        const updatedTotalAmount = existingSale.totalAmount + s.totalAmount;
        const updatedTotalCost = existingSale.totalCost + s.totalCost;
        const updatedNetAmount = existingSale.netAmount + s.netAmount;
        
        const mergedInstallments = [...existingSale.installments];

        s.installments.forEach(newInst => {
          const newMonthYear = newInst.dueDate.substring(0, 7);
          const idx = mergedInstallments.findIndex(ei => ei.dueDate.startsWith(newMonthYear));
          
          if (idx !== -1) {
            const target = mergedInstallments[idx];
            const newAmount = target.amount + newInst.amount;
            const newPaidAmount = target.paidAmount + newInst.paidAmount;
            
            mergedInstallments[idx] = {
              ...target,
              amount: newAmount,
              paidAmount: newPaidAmount,
              status: newPaidAmount >= newAmount ? PaymentStatus.PAID : (newPaidAmount > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PENDING)
            };
          } else {
            mergedInstallments.push({ ...newInst, saleId: existingSale.id });
          }
        });

        mergedInstallments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

        saleToSave = {
          ...existingSale,
          items: updatedItems,
          baseAmount: updatedBaseAmount,
          totalAmount: updatedTotalAmount,
          totalCost: updatedTotalCost,
          netAmount: updatedNetAmount,
          description: `Consolidada: ${updatedItems.map(i => i.description.split('-')[1] || i.description).join(', ').substring(0, 100)}`,
          installments: mergedInstallments,
          status: PaymentStatus.PARTIAL
        };
      } else {
        const newId = Math.random().toString(36).substr(2, 9);
        saleToSave = { ...s, id: newId };
      }
    } else {
      const newId = Math.random().toString(36).substr(2, 9);
      saleToSave = { ...s, id: newId };
    }

    const salePath = `users/${user.id}/sales/${saleToSave.id}`;
    batch.set(doc(db, salePath), saleToSave);

    // Update product stock
    if (s.items && s.items.length > 0) {
      s.items.forEach(item => {
        if (item.productId) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const productPath = `users/${user.id}/products/${product.id}`;
            batch.update(doc(db, productPath), { stock: Math.max(0, product.stock - item.quantity) });
          }
        }
      });
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch-sale');
    }
  }, [user, sales, products]);

  const handleAddCondicional = useCallback(async (c: Omit<Condicional, 'id'>) => {
    if (!user || !db) return;
    const batch = writeBatch(db);
    const newId = Math.random().toString(36).substr(2, 9);
    const condicional: Condicional = { ...c, id: newId };
    
    const condPath = `users/${user.id}/condicionais/${newId}`;
    batch.set(doc(db, condPath), condicional);
    
    c.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const productPath = `users/${user.id}/products/${product.id}`;
        batch.update(doc(db, productPath), { stock: Math.max(0, product.stock - item.quantity) });
      }
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch-condicional');
    }
  }, [user, products]);

  const handleUpdateCondicional = useCallback(async (updated: Condicional) => {
    if (!user || !db) return;
    const batch = writeBatch(db);
    const old = condicionais.find(c => c.id === updated.id);
    if (!old) return;

    const condPath = `users/${user.id}/condicionais/${updated.id}`;
    batch.set(doc(db, condPath), updated);

    updated.items.forEach(newItem => {
      const oldItem = old.items.find(oi => oi.id === newItem.id);
      if (oldItem) {
        const diff = newItem.returnedQuantity - (oldItem.returnedQuantity || 0);
        if (diff !== 0) {
          const product = products.find(p => p.id === newItem.productId);
          if (product) {
            const productPath = `users/${user.id}/products/${product.id}`;
            batch.update(doc(db, productPath), { stock: product.stock + diff });
          }
        }
      }
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch-update-condicional');
    }
  }, [user, condicionais, products]);

  const handleConvertToSale = useCallback(async (condicional: Condicional, saleData: Omit<Sale, 'id'>) => {
    if (!user || !db) return;
    const batch = writeBatch(db);
    
    // Add sale
    const saleId = Math.random().toString(36).substr(2, 9);
    const sale: Sale = { ...saleData, id: saleId };
    const salePath = `users/${user.id}/sales/${saleId}`;
    batch.set(doc(db, salePath), sale);

    // Update condicional status
    const condPath = `users/${user.id}/condicionais/${condicional.id}`;
    batch.update(doc(db, condPath), { status: 'converted' });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch-convert-sale');
    }
  }, [user]);

  const handleDeleteCondicional = useCallback(async (id: string) => {
    if (!user || !db) return;
    const batch = writeBatch(db);
    const cond = condicionais.find(c => c.id === id);
    if (!cond) return;

    cond.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const productPath = `users/${user.id}/products/${product.id}`;
        batch.update(doc(db, productPath), { stock: product.stock + (item.quantity - (item.returnedQuantity || 0)) });
      }
    });

    const condPath = `users/${user.id}/condicionais/${id}`;
    batch.delete(doc(db, condPath));

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch-delete-condicional');
    }
  }, [user, condicionais, products]);

  const handleDeleteSale = useCallback(async (id: string, isRefund: boolean = false) => {
    if (!user || !db) return;
    const batch = writeBatch(db);
    const saleToDelete = sales.find(s => s.id === id);
    if (!saleToDelete) return;

    // Add to trash
    const trashId = Math.random().toString(36).substr(2, 9);
    const trashItem: TrashItem = { id: trashId, sale: saleToDelete, deletedAt: Date.now() };
    const trashPath = `users/${user.id}/trashSales/${trashId}`;
    batch.set(doc(db, trashPath), trashItem);

    // Restore product stock
    if (saleToDelete.productId || (saleToDelete.items && saleToDelete.items.length > 0)) {
      if (saleToDelete.productId) {
        const product = products.find(p => p.id === saleToDelete.productId);
        if (product) {
          const productPath = `users/${user.id}/products/${product.id}`;
          batch.update(doc(db, productPath), { stock: product.stock + 1 });
        }
      }
      if (saleToDelete.items && saleToDelete.items.length > 0) {
        saleToDelete.items.forEach(item => {
          if (item.productId) {
            const product = products.find(p => p.id === item.productId);
            if (product) {
              const productPath = `users/${user.id}/products/${product.id}`;
              batch.update(doc(db, productPath), { stock: product.stock + item.quantity });
            }
          }
        });
      }
    }

    // Handle refund as expense
    if (isRefund) {
      const totalAlreadyPaid = saleToDelete.installments.reduce((acc, inst) => acc + inst.paidAmount, 0);
      if (totalAlreadyPaid > 0) {
        const customerName = saleToDelete.customerId === 'BALCAO' ? 'Cliente Balcão' : 'Cliente';
        const expenseId = Math.random().toString(36).substr(2, 9);
        const expense: Expense = {
          id: expenseId,
          description: `ESTORNO (DEVOLUÇÃO): ${customerName}`,
          amount: totalAlreadyPaid,
          category: 'refund',
          date: new Date().toISOString().split('T')[0]
        };
        const expensePath = `users/${user.id}/expenses/${expenseId}`;
        batch.set(doc(db, expensePath), expense);
      }
    }

    // Delete sale
    const salePath = `users/${user.id}/sales/${id}`;
    batch.delete(doc(db, salePath));

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch-delete-sale');
    }
  }, [user, sales, products]);

  const handleRestoreSale = useCallback(async (trashId: string) => {
    if (!user || !db) return;
    const batch = writeBatch(db);
    const item = trashSales.find(i => i.id === trashId);
    if (!item) return;

    // Restore sale
    const salePath = `users/${user.id}/sales/${item.sale.id}`;
    batch.set(doc(db, salePath), item.sale);

    // Update product stock
    if (item.sale.productId || (item.sale.items && item.sale.items.length > 0)) {
      if (item.sale.productId) {
        const product = products.find(p => p.id === item.sale.productId);
        if (product) {
          const productPath = `users/${user.id}/products/${product.id}`;
          batch.update(doc(db, productPath), { stock: Math.max(0, product.stock - 1) });
        }
      }
      if (item.sale.items && item.sale.items.length > 0) {
        item.sale.items.forEach(saleItem => {
          if (saleItem.productId) {
            const product = products.find(p => p.id === saleItem.productId);
            if (product) {
              const productPath = `users/${user.id}/products/${product.id}`;
              batch.update(doc(db, productPath), { stock: Math.max(0, product.stock - saleItem.quantity) });
            }
          }
        });
      }
    }

    // Delete from trash
    const trashPath = `users/${user.id}/trashSales/${trashId}`;
    batch.delete(doc(db, trashPath));

    try {
      await batch.commit();
      showNotification('Venda restaurada com sucesso!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch-restore-sale');
    }
  }, [user, trashSales, products, showNotification]);

  const handlePermanentDelete = useCallback(async (trashId: string) => {
    if (!user || !db) return;
    const path = `users/${user.id}/trashSales/${trashId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }, [user]);

  const handleAddExpense = useCallback(async (description: string, amount: number, date: string, category: 'fixed' | 'refund' | 'other' = 'fixed') => {
    if (!user || !db) return;
    const id = Math.random().toString(36).substr(2, 9);
    const expense: Expense = { id, description, amount, category, date };
    const path = `users/${user.id}/expenses/${id}`;
    try {
      await setDoc(doc(db, path), expense);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }, [user]);

  const handleDeleteExpense = useCallback(async (id: string) => {
    if (!user || !db) return;
    const path = `users/${user.id}/expenses/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }, [user]);

  const handleAddClosure = useCallback(async (closure: CashierClosure) => {
    if (!user || !db) return;
    const path = `users/${user.id}/cashierClosures/${closure.id}`;
    try {
      await setDoc(doc(db, path), closure);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }, [user]);

  const clearUserData = useCallback(async () => {
    if (!user || !db) return;
    try {
      const batch = writeBatch(db);
      
      // We'd need to list all docs to delete them in a batch, 
      // but for simplicity and safety, we'll just clear local storage 
      // and inform the user that cloud data remains (or implement a full wipe).
      // A full wipe would require fetching all IDs first.
      
      await storageService.clearAll();
      showNotification("Banco de dados local limpo. Os dados na nuvem permanecem vinculados à sua conta.", "info");
    } catch (err) {
      console.error("Erro ao limpar dados:", err);
      showNotification("Erro ao limpar dados.", "error");
    }
  }, [user, showNotification]);

  const handleImport = useCallback(async (data: any) => {
    if (!user || !db) return;
    try {
      setSyncStatus('syncing');
      const batch = writeBatch(db);
      const userId = user.id;

      // Helper to add collection to batch
      const addToBatch = (collectionName: string, items: any[]) => {
        items.forEach(item => {
          const docRef = doc(db!, `users/${userId}/${collectionName}/${item.id}`);
          batch.set(docRef, item);
        });
      };

      if (data.customers) addToBatch('customers', data.customers);
      if (data.sales) addToBatch('sales', data.sales);
      if (data.products) addToBatch('products', data.products);
      if (data.expenses) addToBatch('expenses', data.expenses);
      if (data.condicionais) addToBatch('condicionais', data.condicionais);
      if (data.cashierClosures) addToBatch('cashierClosures', data.cashierClosures);
      if (data.trashSales) addToBatch('trashSales', data.trashSales);

      await batch.commit();
      
      // Also update local storage
      await Promise.all([
        storageService.saveData(`gestao93_customers_${userId}`, data.customers || []),
        storageService.saveData(`gestao93_sales_${userId}`, data.sales || []),
        storageService.saveData(`gestao93_expenses_${userId}`, data.expenses || []),
        storageService.saveData(`gestao93_products_${userId}`, data.products || []),
        storageService.saveData(`gestao93_trash_${userId}`, data.trashSales || []),
        storageService.saveData(`gestao93_condicionais_${userId}`, data.condicionais || []),
        storageService.saveData(`gestao93_closures_${userId}`, data.cashierClosures || [])
      ]);

      setLastSyncTime(Date.now());
      setSyncStatus('synced');
      showNotification('Backup importado e sincronizado com sucesso!', 'success');
    } catch (err) {
      console.error("Erro ao importar backup:", err);
      setSyncStatus('error');
      showNotification('Erro ao importar backup.', 'error');
      throw err;
    }
  }, [user, showNotification]);

  const handleSync = useCallback(async () => {
    if (!user || !db) return;
    setSyncStatus('syncing');
    try {
      // Force write everything to Firestore
      const batch = writeBatch(db);
      const userId = user.id;

      const addToBatch = (collectionName: string, items: any[]) => {
        items.forEach(item => {
          const docRef = doc(db!, `users/${userId}/${collectionName}/${item.id}`);
          batch.set(docRef, item);
        });
      };

      addToBatch('customers', customers);
      addToBatch('sales', sales);
      addToBatch('expenses', expenses);
      addToBatch('products', products);
      addToBatch('trashSales', trashSales);
      addToBatch('condicionais', condicionais);
      addToBatch('cashierClosures', cashierClosures);

      await batch.commit();
      
      setLastSyncTime(Date.now());
      setSyncStatus('synced');
      showNotification('Sincronização forçada concluída!', 'success');
    } catch (e) {
      setSyncStatus('error');
      showNotification('Erro ao sincronizar.', 'error');
    }
  }, [user, customers, sales, expenses, products, trashSales, condicionais, cashierClosures, showNotification]);

  return {
    customers,
    sales,
    expenses,
    products,
    condicionais,
    cashierClosures,
    trashSales,
    loading,
    syncStatus,
    lastSyncTime,
    showTutorial, setShowTutorial,
    handleUpdateSale,
    handleAddProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    handleAddCustomer,
    handleUpdateCustomer,
    handleDeleteCustomer,
    handleAddSale,
    handleAddCondicional,
    handleUpdateCondicional,
    handleConvertToSale,
    handleDeleteCondicional,
    handleDeleteSale,
    handleRestoreSale,
    handlePermanentDelete,
    handleAddExpense,
    handleDeleteExpense,
    handleAddClosure,
    clearUserData,
    handleImport,
    handleSync
  };
};
