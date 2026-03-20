
import React, { useState, useEffect, useCallback, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { View, Customer, Sale, User, Expense, Product, TrashItem, PaymentStatus, Installment, Condicional, CashClosing } from './types';
import Dashboard from './components/Dashboard';
import CustomerList from './components/CustomerList';
import SalesManager from './components/SalesManager';
import CondicionalManager from './components/CondicionalManager';
import Agenda from './components/Agenda';
import Settings from './components/Settings';
import Landing from './components/Landing';
import Tutorial from './components/Tutorial';
import ExpenseManager from './components/ExpenseManager';
import InventoryManager from './components/InventoryManager';
import TrashManager from './components/TrashManager';
import RefundManager from './components/RefundManager';
import CashManager from './components/CashManager';
import { storageService } from './services/storageService';
import { auth, isFirebaseConfigured } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Login from './components/Login';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      try {
        const parsedError = JSON.parse(this.state.error?.message || "");
        if (parsedError.error && parsedError.operationType) {
          errorMessage = `Erro de permissão no banco de dados (${parsedError.operationType}). Por favor, contate o suporte.`;
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
          <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 shadow-2xl border border-white/10 text-center">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="text-2xl font-black uppercase italic mb-4">Ops! Algo deu errado</h2>
            <p className="text-slate-400 text-sm mb-8">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black uppercase tracking-widest transition shadow-lg shadow-indigo-500/20"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [condicionais, setCondicionais] = useState<Condicional[]>([]);
  const [trashSales, setTrashSales] = useState<TrashItem[]>([]);
  const [cashClosings, setCashClosings] = useState<CashClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const isMounted = useRef(false);
  const initialLoadAttempted = useRef(false);

  const FASHION_IMAGE_URL = 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=2000';

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthLoading(false);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
          email: firebaseUser.email || '',
        };
        setUser(userData);
        
        const userId = firebaseUser.uid;
        setLoading(true);
        
        try {
          console.log("Iniciando carregamento de dados para o usuário:", userId);
          const tutorialSeen = await storageService.loadData<string>(`gestao93_tutorial_seen_${userId}`);
          if (!tutorialSeen) setShowTutorial(true);

          const [loadedCustomers, loadedSales, loadedExpenses, loadedProducts, loadedTrash, loadedCondicionais, loadedClosings] = await Promise.all([
            storageService.loadData<Customer[]>(`gestao93_customers_${userId}`),
            storageService.loadData<Sale[]>(`gestao93_sales_${userId}`),
            storageService.loadData<Expense[]>(`gestao93_expenses_${userId}`),
            storageService.loadData<Product[]>(`gestao93_products_${userId}`),
            storageService.loadData<TrashItem[]>(`gestao93_trash_${userId}`),
            storageService.loadData<Condicional[]>(`gestao93_condicionais_${userId}`),
            storageService.loadData<CashClosing[]>(`gestao93_closings_${userId}`)
          ]);

          setCustomers(loadedCustomers || []);
          setSales(loadedSales || []);
          setExpenses(loadedExpenses || []);
          setProducts(loadedProducts || []);
          setCondicionais(loadedCondicionais || []);
          setCashClosings(loadedClosings || []);
          
          const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
          const validTrash = (loadedTrash || []).filter((item: TrashItem) => (Date.now() - item.deletedAt) < thirtyDaysInMs);
          setTrashSales(validTrash);
          
          setIsInitialLoadComplete(true);
          initialLoadAttempted.current = true;
          console.log("Dados carregados com sucesso.");
        } catch (e) {
          console.error("Erro crítico ao carregar dados do Firestore:", e);
          // Se falhar o carregamento inicial, não marcamos como completo para evitar sobrescrever dados da nuvem com vazios
          setSyncStatus('error');
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setCustomers([]);
        setSales([]);
        setExpenses([]);
        setProducts([]);
        setTrashSales([]);
        setLoading(false);
      }
      setAuthLoading(false);
      isMounted.current = true;
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading || !user || !isMounted.current || !isInitialLoadComplete) return;

    const autoSave = async () => {
      try {
        setSyncStatus('syncing');
        const userId = user.id;
        
        console.log("Auto-saving data...");
        const results = await Promise.all([
          storageService.saveData(`gestao93_customers_${userId}`, customers),
          storageService.saveData(`gestao93_sales_${userId}`, sales),
          storageService.saveData(`gestao93_expenses_${userId}`, expenses),
          storageService.saveData(`gestao93_products_${userId}`, products),
          storageService.saveData(`gestao93_trash_${userId}`, trashSales),
          storageService.saveData(`gestao93_condicionais_${userId}`, condicionais),
          storageService.saveData(`gestao93_closings_${userId}`, cashClosings),
          storageService.saveData(`gestao93_current_user_${userId}`, user)
        ]);

        setLastSyncTime(results[0]);
        setSyncStatus('synced');
      } catch (err) {
        console.error("Falha no Auto-Save:", err);
        setSyncStatus('error');
      }
    };

    const timer = setTimeout(autoSave, 1500); // Aumentado para 1.5s para evitar excesso de escritas
    return () => clearTimeout(timer);
  }, [customers, sales, expenses, products, trashSales, user, loading, isInitialLoadComplete]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setActiveView('dashboard');
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const handleUpdateSale = (updatedSale: Sale) => {
    setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));
  };

  const handleAddProduct = (newProduct: Omit<Product, 'id'>) => {
    setProducts(prev => {
      const existingIndex = prev.findIndex(p => p.sku.toUpperCase() === newProduct.sku.toUpperCase());
      
      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        const totalOldCost = Math.max(0, existing.stock) * existing.costPrice;
        const totalNewCost = newProduct.stock * newProduct.costPrice;
        const totalStock = Math.max(0, existing.stock) + newProduct.stock;
        
        const weightedAverageCost = totalStock > 0 ? (totalOldCost + totalNewCost) / totalStock : newProduct.costPrice;
        
        const updated = [...prev];
        updated[existingIndex] = {
          ...existing,
          stock: totalStock,
          costPrice: weightedAverageCost,
          price: newProduct.price,
          name: newProduct.name
        };
        return updated;
      }
      
      return [...prev, { ...newProduct, id: Math.random().toString(36).substr(2, 9) }];
    });
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleAddSale = (s: Omit<Sale, 'id'>) => {
    const isSameMonthYear = (d1: string, d2: string) => {
      const date1 = new Date(d1);
      const date2 = new Date(d2);
      return date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
    };

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

        mergedInstallments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        const mergedSale: Sale = {
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

        const otherSales = sales.filter((_, idx) => idx !== existingSaleIndex);
        setSales([mergedSale, ...otherSales]);
        
        if (s.items && s.items.length > 0) {
          s.items.forEach(item => {
            if (item.productId) {
              setProducts(prev => prev.map(p => 
                p.id === item.productId ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p
              ));
            }
          });
        }
        return;
      }
    }

    const newId = Math.random().toString(36).substr(2, 9);
    setSales(prev => [{ ...s, id: newId }, ...prev]);

    if (s.items && s.items.length > 0) {
      s.items.forEach(item => {
        if (item.productId) {
          setProducts(prev => prev.map(p => 
            p.id === item.productId ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p
          ));
        }
      });
    }
  };

  const handleAddCondicional = (c: Omit<Condicional, 'id'>) => {
    const newId = Math.random().toString(36).substr(2, 9);
    setCondicionais(prev => [{ ...c, id: newId }, ...prev]);
    
    // Deduct from stock
    c.items.forEach(item => {
      setProducts(prev => prev.map(p => 
        p.id === item.productId ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p
      ));
    });
  };

  const handleUpdateCondicional = (updated: Condicional) => {
    const old = condicionais.find(c => c.id === updated.id);
    if (!old) return;

    // Adjust stock based on returned items
    updated.items.forEach(newItem => {
      const oldItem = old.items.find(oi => oi.id === newItem.id);
      if (oldItem) {
        const diff = newItem.returnedQuantity - oldItem.returnedQuantity;
        if (diff !== 0) {
          setProducts(prev => prev.map(p => 
            p.id === newItem.productId ? { ...p, stock: p.stock + diff } : p
          ));
        }
      }
    });

    setCondicionais(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleConvertToSale = (condicional: Condicional, saleData: Omit<Sale, 'id'>) => {
    handleAddSale(saleData);
    setCondicionais(prev => prev.map(c => c.id === condicional.id ? { ...c, status: 'converted' } : c));
  };

  const handleDeleteCondicional = (id: string) => {
    const cond = condicionais.find(c => c.id === id);
    if (!cond) return;

    // Return all items to stock
    cond.items.forEach(item => {
      setProducts(prev => prev.map(p => 
        p.id === item.productId ? { ...p, stock: p.stock + (item.quantity - item.returnedQuantity) } : p
      ));
    });

    setCondicionais(prev => prev.filter(c => c.id !== id));
  };

  const handleDeleteSale = useCallback((id: string, isRefund: boolean = false) => {
    const saleToDelete = sales.find(s => s.id === id);
    if (!saleToDelete) return;

    setTrashSales(prevTrash => [
      { id: Math.random().toString(36).substr(2, 9), sale: saleToDelete, deletedAt: Date.now() },
      ...prevTrash
    ]);

    if (saleToDelete.productId || (saleToDelete.items && saleToDelete.items.length > 0)) {
      setProducts(prevProducts => {
        let updated = [...prevProducts];
        
        if (saleToDelete.productId) {
          updated = updated.map(p => p.id === saleToDelete.productId ? { ...p, stock: p.stock + 1 } : p);
        }

        if (saleToDelete.items && saleToDelete.items.length > 0) {
          saleToDelete.items.forEach(item => {
            if (item.productId) {
              updated = updated.map(p => p.id === item.productId ? { ...p, stock: p.stock + item.quantity } : p);
            }
          });
        }
        return updated;
      });
    }

    if (isRefund) {
      const totalAlreadyPaid = saleToDelete.installments.reduce((acc, inst) => acc + inst.paidAmount, 0);
      if (totalAlreadyPaid > 0) {
        const customer = customers.find(c => c.id === saleToDelete.customerId);
        const customerName = customer ? customer.name : (saleToDelete.customerId === 'BALCAO' ? 'Cliente Balcão' : 'Desconhecido');
        
        setExpenses(prev => [{
          id: Math.random().toString(36).substr(2, 9),
          description: `ESTORNO (DEVOLUÇÃO): ${customerName}`,
          amount: totalAlreadyPaid,
          category: 'refund',
          date: new Date().toISOString().split('T')[0]
        }, ...prev]);
      }
    }

    setSales(prev => prev.filter(s => s.id !== id));
  }, [sales, customers]);

  const handleRestoreSale = useCallback((trashId: string) => {
    const item = trashSales.find(i => i.id === trashId);
    if (!item) return;

    if (item.sale.productId || (item.sale.items && item.sale.items.length > 0)) {
      setProducts(prevProducts => {
        let updated = [...prevProducts];
        
        if (item.sale.productId) {
          updated = updated.map(p => p.id === item.sale.productId ? { ...p, stock: Math.max(0, p.stock - 1) } : p);
        }

        if (item.sale.items && item.sale.items.length > 0) {
          item.sale.items.forEach(saleItem => {
            if (saleItem.productId) {
              updated = updated.map(p => p.id === saleItem.productId ? { ...p, stock: Math.max(0, p.stock - saleItem.quantity) } : p);
            }
          });
        }
        return updated;
      });
    }

    setSales(prev => [item.sale, ...prev]);
    setTrashSales(prev => prev.filter(i => i.id !== trashId));
    alert('Venda restaurada com sucesso!');
  }, [trashSales]);

  const handlePermanentDelete = useCallback((trashId: string) => {
    setTrashSales(prev => prev.filter(i => i.id !== trashId));
  }, []);

  const clearUserData = async () => {
    if (!user) return;
    if (window.confirm("Tem certeza que deseja zerar todos os dados? Esta ação não pode ser desfeita.")) {
      await storageService.clearAll(user.id);
      setCustomers([]);
      setSales([]);
      setExpenses([]);
      setProducts([]);
      setTrashSales([]);
      setCashClosings([]);
      alert("Banco de dados limpo com sucesso.");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-950">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          <p className="text-indigo-300 text-xs font-black uppercase tracking-widest">Verificando Acesso...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard sales={sales} customers={customers} expenses={expenses} products={products} />;
      case 'customers': return <CustomerList customers={customers} sales={sales} onAdd={(c) => setCustomers(prev => [...prev, { ...c, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now() }])} onDelete={(id) => setCustomers(prev => prev.filter(c => c.id !== id))} />;
      case 'sales-cash': return <SalesManager mode="cash" sales={sales} customers={customers} products={products} onAddSale={handleAddSale} onUpdateSale={handleUpdateSale} onDeleteSale={handleDeleteSale} />;
      case 'sales-credit': return <SalesManager mode="credit" sales={sales} customers={customers} products={products} onAddSale={handleAddSale} onUpdateSale={handleUpdateSale} onDeleteSale={handleDeleteSale} />;
      case 'condicional': return <CondicionalManager condicionais={condicionais} customers={customers} products={products} onAddCondicional={handleAddCondicional} onUpdateCondicional={handleUpdateCondicional} onConvertToSale={handleConvertToSale} onDeleteCondicional={handleDeleteCondicional} />;
      case 'refunds': return <RefundManager sales={sales} customers={customers} expenses={expenses} onRefund={(id) => handleDeleteSale(id, true)} onManualRefund={(desc, amount) => setExpenses(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), description: `ESTORNO: ${desc}`, amount, category: 'refund', date: new Date().toISOString().split('T')[0] }])} />;
      case 'inventory': return <InventoryManager products={products} onAdd={handleAddProduct} onDelete={(id) => setProducts(prev => prev.filter(p => p.id !== id))} onUpdate={handleUpdateProduct} />;
      case 'expenses': return <ExpenseManager expenses={expenses} onAdd={(description, amount) => setExpenses(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), description, amount, category: 'fixed', date: new Date().toISOString().split('T')[0] }])} onDelete={(id) => setExpenses(prev => prev.filter(e => e.id !== id))} />;
      case 'agenda': return <Agenda sales={sales} customers={customers} onUpdateSale={handleUpdateSale} />;
      case 'trash': return <TrashManager trashItems={trashSales} customers={customers} onRestore={handleRestoreSale} onDeletePermanent={handlePermanentDelete} />;
      case 'cash-closing': return <CashManager sales={sales} closings={cashClosings} onAddClosing={(c) => setCashClosings(prev => [{ ...c, id: Math.random().toString(36).substr(2, 9) }, ...prev])} />;
      case 'settings': return (
        <Settings 
          user={user} 
          customers={customers} 
          sales={sales} 
          products={products} 
          cashClosings={cashClosings}
          syncStatus={syncStatus}
          lastSyncTime={lastSyncTime}
          isFirebaseConfigured={isFirebaseConfigured}
          onSync={async () => {
            if (user) {
              setSyncStatus('syncing');
              try {
                const results = await Promise.all([
                  storageService.saveData(`gestao93_customers_${user.id}`, customers),
                  storageService.saveData(`gestao93_sales_${user.id}`, sales),
                  storageService.saveData(`gestao93_expenses_${user.id}`, expenses),
                  storageService.saveData(`gestao93_products_${user.id}`, products),
                  storageService.saveData(`gestao93_trash_${user.id}`, trashSales),
                  storageService.saveData(`gestao93_condicionais_${user.id}`, condicionais),
                  storageService.saveData(`gestao93_closings_${user.id}`, cashClosings),
                  storageService.saveData(`gestao93_current_user_${user.id}`, user)
                ]);
                setLastSyncTime(results[0]);
                setSyncStatus('synced');
                alert('Sincronização concluída!');
              } catch (e) {
                setSyncStatus('error');
                alert('Erro ao sincronizar.');
              }
            }
          }}
          onUpdateProfile={setUser} 
          onImport={(data) => { 
            setCustomers(data.customers); 
            setSales(data.sales); 
            setProducts(data.products || []); 
            if (data.cashClosings) setCashClosings(data.cashClosings);
          }} 
          onClear={clearUserData} 
        />
      );
      default: return <Dashboard sales={sales} customers={customers} expenses={expenses} products={products} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative">
      <div className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-50" style={{ backgroundImage: `url(${FASHION_IMAGE_URL})` }} />
      {showTutorial && <Tutorial activeView={activeView} onClose={async () => { await storageService.saveData(`gestao93_tutorial_seen_${user.id}`, 'true'); setShowTutorial(false); }} />}
      <nav className="w-full md:w-64 bg-indigo-950 text-white flex flex-col shrink-0 z-50 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 p-6 flex items-center gap-3 border-b border-indigo-900/50">
          <div className="bg-indigo-600 p-2 rounded-xl shrink-0 border border-white/20 shadow-lg">
             <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black italic uppercase text-white truncate">
              Gestão <span className="text-purple-400">93</span>
            </h1>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></div>
              <span className="text-[8px] font-black uppercase text-indigo-300">
                {syncStatus === 'synced' 
                  ? (lastSyncTime ? `Sincronizado ${new Date(lastSyncTime).toLocaleTimeString()}` : 'Nuvem Sincronizada') 
                  : syncStatus === 'error' ? 'Erro de Conexão' : 'Gravando...'}
              </span>
            </div>
          </div>
        </div>
        <div className="relative z-10 flex-1 py-4 space-y-1 px-3 overflow-y-auto no-scrollbar">
          <NavItem id="nav-dashboard" icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" label="Início" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
          <NavItem id="nav-cash-closing" icon="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" label="Caixa" active={activeView === 'cash-closing'} onClick={() => setActiveView('cash-closing')} />
          <NavItem id="nav-inventory" icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" label="Estoque" active={activeView === 'inventory'} onClick={() => setActiveView('inventory')} />
          <NavItem id="nav-customers" icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" label="Clientes" active={activeView === 'customers'} onClick={() => setActiveView('customers')} />
          <NavItem id="nav-sales-cash" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" label="À Vista" active={activeView === 'sales-cash'} onClick={() => setActiveView('sales-cash')} />
          <NavItem id="nav-sales-credit" icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2V12a2 2 0 002 2z" label="A Prazo" active={activeView === 'sales-credit'} onClick={() => setActiveView('sales-credit')} />
          <NavItem id="nav-condicional" icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H9m1 1h4a1 1 0 011 1v1a1 1 0 01-1 1H10a1 1 0 01-1-1V7a1 1 0 011-1z" label="Condicional" active={activeView === 'condicional'} onClick={() => setActiveView('condicional')} />
          <NavItem id="nav-refunds" icon="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2z" label="Estornos" active={activeView === 'refunds'} onClick={() => setActiveView('refunds')} />
          <NavItem id="nav-agenda" icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" label="Agenda" active={activeView === 'agenda'} onClick={() => setActiveView('agenda')} />
          <NavItem id="nav-expenses" icon="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" label="Despesas" active={activeView === 'expenses'} onClick={() => setActiveView('expenses')} />
          <NavItem id="nav-trash" icon="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" label="Lixeira" active={activeView === 'trash'} onClick={() => setActiveView('trash')} />
          <NavItem id="nav-settings" icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" label="Ajustes" active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
        </div>
        <div className="relative z-10 p-4 bg-black/30 border-t border-indigo-900/50">
           <div className="flex items-center gap-3 p-3 bg-black/20 rounded-2xl border border-white/10 shadow-inner backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg italic shrink-0 overflow-hidden shadow-lg border border-white/20">
                {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <span className="text-white">{user.name.charAt(0)}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black truncate text-white uppercase">{user.name}</p>
                <p className="text-[8px] text-indigo-300 font-bold uppercase tracking-tighter">Boutique Premium</p>
              </div>
              <button onClick={handleLogout} className="text-indigo-200 hover:text-rose-400 transition transform hover:scale-110">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
              </button>
           </div>
        </div>
      </nav>
      <main className="relative flex-1 p-4 md:p-8 overflow-y-auto h-screen z-10">
        <div className="max-w-6xl mx-auto pb-12 relative">{renderView()}</div>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ id?: string; icon: string; label: string; active: boolean; onClick: () => void; }> = ({ id, icon, label, active, onClick }) => (
  <button id={id} onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 relative group ${active ? 'bg-indigo-600 text-white shadow-xl translate-x-1 border border-white/10' : 'text-indigo-100 hover:bg-white/10 hover:text-white'}`}>
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} /></svg>
    <span className={`text-sm font-bold tracking-tight whitespace-nowrap ${active ? 'font-black' : ''}`}>{label}</span>
    {active && <div className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]"></div>}
  </button>
);

export default () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
