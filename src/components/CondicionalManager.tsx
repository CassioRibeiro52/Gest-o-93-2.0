
import React, { useState, useMemo } from 'react';
import { Customer, Product, Condicional, CondicionalItem, Sale, PaymentStatus, Installment, PaymentMethod } from '../types';

interface CondicionalManagerProps {
  condicionais: Condicional[];
  customers: Customer[];
  products: Product[];
  onAddCondicional: (condicional: Omit<Condicional, 'id'>) => void;
  onUpdateCondicional: (condicional: Condicional) => void;
  onConvertToSale: (condicional: Condicional, saleData: Omit<Sale, 'id'>) => void;
  onDeleteCondicional: (id: string) => void;
}

const CondicionalManager: React.FC<CondicionalManagerProps> = ({ 
  condicionais, 
  customers, 
  products, 
  onAddCondicional, 
  onUpdateCondicional, 
  onConvertToSale,
  onDeleteCondicional 
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [cart, setCart] = useState<Omit<CondicionalItem, 'id' | 'returnedQuantity'>[]>([]);
  const [productSearch, setProductSearch] = useState('');
  
  const [selectedCondicionalId, setSelectedCondicionalId] = useState<string | null>(null);
  
  // Checkout states for conversion
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'cash' | 'credit'>('cash');
  const [discount, setDiscount] = useState(0);
  const [numInstallments, setNumInstallments] = useState(1);
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const term = productSearch.toLowerCase();
    return products.filter(p => 
      p.sku.toLowerCase().includes(term) || 
      p.name.toLowerCase().includes(term)
    ).slice(0, 5);
  }, [productSearch, products]);

  const addToCart = (p: Product) => {
    const existing = cart.find(item => item.productId === p.id);
    if (existing) {
      setCart(cart.map(item => item.productId === p.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, {
        productId: p.id,
        description: `${p.sku} - ${p.name}`,
        price: p.price,
        costPrice: p.costPrice,
        quantity: 1
      }]);
    }
    setProductSearch('');
  };

  const removeFromCart = (productId: string) => setCart(cart.filter(i => i.productId !== productId));

  const handleAddCondicional = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || cart.length === 0) {
      alert("Selecione um cliente e adicione produtos.");
      return;
    }

    onAddCondicional({
      customerId,
      items: cart.map(item => ({
        ...item,
        id: Math.random().toString(36).substr(2, 5),
        returnedQuantity: 0
      })),
      totalAmount: cart.reduce((acc, item) => acc + (item.price * item.quantity), 0),
      date: new Date().toISOString().split('T')[0],
      status: 'open'
    });

    setShowAdd(false);
    setCustomerId('');
    setCart([]);
  };

  const handleReturnItem = (condicional: Condicional, itemId: string, qty: number) => {
    const updatedItems = condicional.items.map(item => {
      if (item.id === itemId) {
        return { ...item, returnedQuantity: Math.min(item.quantity, Math.max(0, qty)) };
      }
      return item;
    });
    onUpdateCondicional({ ...condicional, items: updatedItems });
  };

  const handleConvertClick = (condicional: Condicional) => {
    setSelectedCondicionalId(condicional.id);
    setShowCheckout(true);
  };

  const handleFinalizeSale = (condicional: Condicional) => {
    const itemsToSale = condicional.items
      .filter(item => item.quantity > item.returnedQuantity)
      .map(item => ({
        id: Math.random().toString(36).substr(2, 5),
        productId: item.productId,
        description: item.description,
        price: item.price,
        costPrice: item.costPrice,
        quantity: item.quantity - item.returnedQuantity
      }));

    if (itemsToSale.length === 0) {
      alert("Não há itens para vender (todos foram devolvidos).");
      return;
    }

    const baseAmount = itemsToSale.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalCost = itemsToSale.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);
    const totalAmount = Math.max(0, baseAmount - discount);
    const todayStr = new Date().toISOString().split('T')[0];

    const installments: Installment[] = [];
    if (checkoutMode === 'cash') {
      installments.push({
        id: Math.random().toString(36).substr(2, 9),
        saleId: '',
        amount: totalAmount,
        paidAmount: totalAmount,
        dueDate: todayStr,
        paymentDate: todayStr,
        status: PaymentStatus.PAID,
        payments: [{ id: Math.random().toString(36).substr(2, 9), amount: totalAmount, date: todayStr, method: paymentMethod }]
      });
    } else {
      const baseValue = Math.floor((totalAmount / numInstallments) * 100) / 100;
      const lastValue = Number((totalAmount - (baseValue * (numInstallments - 1))).toFixed(2));
      const [year, month, day] = firstDueDate.split('-').map(Number);

      for (let i = 0; i < numInstallments; i++) {
        let targetMonth = (month - 1) + i;
        let targetYear = year;
        while (targetMonth > 11) { targetMonth -= 12; targetYear += 1; }
        const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const actualDay = Math.min(day, lastDayOfMonth);
        const installmentDate = new Date(targetYear, targetMonth, actualDay);

        installments.push({
          id: Math.random().toString(36).substr(2, 9),
          saleId: '',
          amount: i === numInstallments - 1 ? lastValue : baseValue,
          paidAmount: 0,
          dueDate: installmentDate.toISOString().split('T')[0],
          status: PaymentStatus.PENDING
        });
      }
    }

    onConvertToSale(condicional, {
      customerId: condicional.customerId,
      items: itemsToSale,
      description: `CONVERTIDO DE CONDICIONAL: ${itemsToSale.map(i => i.description).join(', ')}`.substring(0, 100),
      baseAmount,
      discount,
      totalAmount,
      netAmount: totalAmount,
      totalCost,
      date: todayStr,
      installments,
      status: checkoutMode === 'cash' ? PaymentStatus.PAID : PaymentStatus.PENDING,
      type: checkoutMode
    });

    setShowCheckout(false);
    setSelectedCondicionalId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Condicional (Pré-Venda)</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Produtos em aprovação com o cliente</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-amber-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition shadow-lg active:scale-95"
        >
          {showAdd ? 'Cancelar' : 'Nova Condicional'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAddCondicional} className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Cliente</label>
                <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none">
                  <option value="">Selecionar Cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3">Adicionar Produtos do Estoque</label>
                <div className="relative mb-4">
                  <input 
                    type="text" 
                    placeholder="Pesquisar por Código ou Nome..." 
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none shadow-sm"
                  />
                  {filteredProducts.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-50">
                      {filteredProducts.map(p => (
                        <button key={p.id} type="button" onClick={() => addToCart(p)} className="w-full p-3 text-left hover:bg-amber-50 transition flex justify-between items-center group">
                          <div className="min-w-0">
                            <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mr-2 uppercase">{p.sku}</span>
                            <span className="text-[10px] font-bold text-slate-800 uppercase">{p.name}</span>
                          </div>
                          <span className="text-[10px] font-black text-amber-600">Estoque: {p.stock}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                  {cart.map(item => (
                    <div key={item.productId} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-800 uppercase truncate">{item.description}</p>
                        <p className="text-[9px] font-bold text-slate-400">Qtd: {item.quantity} x R$ {item.price.toFixed(2)}</p>
                      </div>
                      <button type="button" onClick={() => removeFromCart(item.productId)} className="text-rose-500 p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                  {cart.length === 0 && <p className="text-[10px] text-slate-400 text-center py-4 italic">Nenhum produto selecionado.</p>}
                </div>
              </div>
            </div>
            <div className="bg-amber-900 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-center items-center text-center">
              <svg className="w-12 h-12 mb-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <h3 className="text-xl font-black uppercase italic mb-2">Criar Pré-Venda</h3>
              <p className="text-xs text-amber-200 font-medium">Os produtos sairão do estoque temporariamente até que o cliente decida o que levar.</p>
              <button type="submit" className="mt-6 bg-white text-amber-900 px-10 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-amber-50 transition active:scale-95">Confirmar Saída</button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {condicionais.filter(c => c.status === 'open').map(cond => {
          const customer = customers.find(c => c.id === cond.customerId);
          const isExpanded = selectedCondicionalId === cond.id;
          
          return (
            <div key={cond.id} className={`bg-white rounded-3xl shadow-sm border transition-all duration-300 ${isExpanded ? 'border-amber-400 ring-4 ring-amber-50' : 'border-slate-100'}`}>
              <div className="p-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-amber-100 text-amber-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase">{customer?.name || 'Cliente Desconhecido'}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{new Date(cond.date).toLocaleDateString('pt-BR')} • {cond.items.length} Itens</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedCondicionalId(isExpanded ? null : cond.id)}
                    className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-100 transition"
                  >
                    {isExpanded ? 'Fechar' : 'Gerenciar'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-50 space-y-6 animate-in slide-in-from-top-2">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produtos em Condicional</h4>
                    {cond.items.map(item => (
                      <div key={item.id} className="flex flex-col md:flex-row justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-slate-800 uppercase truncate">{item.description}</p>
                          <p className="text-[9px] font-bold text-slate-400">Levou: {item.quantity} • Devolvidos: {item.returnedQuantity} • Preço: R$ {item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Devolver:</label>
                          <input 
                            type="number" 
                            min="0" 
                            max={item.quantity} 
                            value={item.returnedQuantity}
                            onChange={(e) => handleReturnItem(cond, item.id, Number(e.target.value))}
                            className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-center outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col md:flex-row gap-3">
                    <button 
                      onClick={() => handleConvertClick(cond)}
                      className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition active:scale-95"
                    >
                      Fechar Venda (Vender o que ficou)
                    </button>
                    <button 
                      onClick={() => onDeleteCondicional(cond.id)}
                      className="px-8 py-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-600 hover:text-white transition"
                    >
                      Cancelar Tudo
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {condicionais.filter(c => c.status === 'open').length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-black uppercase text-xs">Nenhuma condicional em aberto</p>
          </div>
        )}
      </div>

      {/* Checkout Modal for Conversion */}
      {showCheckout && selectedCondicionalId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-indigo-900 p-8 text-white relative">
              <button onClick={() => setShowCheckout(false)} className="absolute top-6 right-6 text-white/50 hover:text-white transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter">Fechamento de Venda</h3>
              <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mt-1">Convertendo condicional em venda final</p>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                <button 
                  onClick={() => setCheckoutMode('cash')}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${checkoutMode === 'cash' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  À Vista
                </button>
                <button 
                  onClick={() => setCheckoutMode('credit')}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${checkoutMode === 'credit' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  A Prazo
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Desconto (R$)</label>
                  <input type="number" value={discount || ''} onChange={e => setDiscount(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                {checkoutMode === 'credit' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Parcelas</label>
                    <input type="number" min="1" value={numInstallments} onChange={e => setNumInstallments(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
              </div>

              {checkoutMode === 'cash' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Forma de Pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'dinheiro', label: 'Dinheiro' },
                      { id: 'cartao_credito', label: 'CC' },
                      { id: 'cartao_debito', label: 'CD' },
                      { id: 'pix', label: 'PIX' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase transition border ${
                          paymentMethod === m.id 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                            : 'bg-white text-slate-400 border-slate-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={() => handleFinalizeSale(condicionais.find(c => c.id === selectedCondicionalId)!)}
                className="w-full bg-indigo-900 text-white py-5 rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-indigo-950 transition active:scale-95"
              >
                Finalizar e Gerar {checkoutMode === 'cash' ? 'Recibo' : 'Carnê'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CondicionalManager;
