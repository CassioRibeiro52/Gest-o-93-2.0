
import React, { useState, useMemo } from 'react';
import { Sale, PaymentMethod, CashierClosure, User, Customer, Expense, TrashItem } from '../types';

interface CashierManagerProps {
  sales: Sale[];
  trashSales: TrashItem[];
  customers: Customer[];
  expenses: Expense[];
  closures: CashierClosure[];
  onAddClosure: (closure: CashierClosure) => void;
  user: User;
}

const CashierManager: React.FC<CashierManagerProps> = ({ sales, trashSales, customers, expenses, closures, onAddClosure, user }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const dailyData = useMemo(() => {
    const breakdown = {
      dinheiro: 0,
      cartao_credito: 0,
      cartao_debito: 0,
      pix: 0
    };

    let total = 0;

    const allSales = [...sales, ...trashSales.map(t => t.sale)];

    allSales.forEach(sale => {
      sale.installments.forEach(inst => {
        if (inst.payments && inst.payments.length > 0) {
          inst.payments.forEach(p => {
            if (p.date === selectedDate) {
              breakdown[p.method] += p.amount;
              total += p.amount;
            }
          });
        } else if (inst.paymentDate === selectedDate) {
          // Fallback for old data
          breakdown['dinheiro'] += inst.paidAmount;
          total += inst.paidAmount;
        }
      });
    });

    const dailyExpenses = expenses
      .filter(exp => exp.date === selectedDate)
      .reduce((acc, exp) => acc + exp.amount, 0);

    return { breakdown, total, dailyExpenses, netBalance: total - dailyExpenses };
  }, [sales, expenses, selectedDate]);

  const currentClosure = useMemo(() => {
    return closures.find(c => c.date === selectedDate);
  }, [closures, selectedDate]);

  const handleCloseCashier = () => {
    if (currentClosure) return;
    
    if (window.confirm(`Deseja realmente fechar o caixa do dia ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}?`)) {
      const newClosure: CashierClosure = {
        id: Math.random().toString(36).substr(2, 9),
        date: selectedDate,
        closedAt: Date.now(),
        closedBy: user.name,
        totalAmount: dailyData.total,
        breakdown: { ...dailyData.breakdown }
      };
      onAddClosure(newClosure);
      alert('Caixa fechado com sucesso!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="backdrop-blur-sm bg-white/30 p-2 rounded-xl">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Fechamento de Caixa</h2>
          <p className="text-sm text-slate-700 font-bold uppercase tracking-wider">Controle Diário de Entradas</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white/80 p-2 rounded-2xl shadow-sm border border-slate-200">
          <label className="text-[10px] font-black uppercase text-slate-400 px-2">Data do Fechamento:</label>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-xs font-black uppercase text-indigo-900 outline-none cursor-pointer"
          />
        </div>
      </div>

      <div className={`p-10 rounded-[3rem] shadow-2xl border relative overflow-hidden transition-all duration-500 ${
        currentClosure 
          ? 'bg-emerald-900 border-emerald-400/20 text-white' 
          : 'bg-indigo-950 border-indigo-400/20 text-white'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em]">Total Recebido no Dia</p>
              {currentClosure && (
                <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                  Caixa Fechado
                </span>
              )}
            </div>
            <h3 className={`text-6xl font-black tracking-tighter ${currentClosure ? 'text-white' : 'text-emerald-400'}`}>
              {formatCurrency(dailyData.total)}
            </h3>
            <div className="mt-4 flex gap-6">
              <div>
                <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest">Despesas do Dia</p>
                <p className="text-xl font-black text-rose-400">{formatCurrency(dailyData.dailyExpenses)}</p>
              </div>
              <div className="border-l border-white/10 pl-6">
                <p className="text-[10px] font-black text-sky-300 uppercase tracking-widest">Saldo Líquido</p>
                <p className="text-xl font-black text-sky-400">{formatCurrency(dailyData.netBalance)}</p>
              </div>
            </div>
            <p className="text-indigo-400 text-[9px] font-bold uppercase mt-4 italic">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {currentClosure && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-[10px] font-black uppercase text-emerald-300">
                  Fechado por: <span className="text-white">{currentClosure.closedBy}</span>
                </p>
                <p className="text-[9px] font-bold text-emerald-400 uppercase">
                  Em: {new Date(currentClosure.closedAt).toLocaleString('pt-BR')}
                </p>
              </div>
            )}
          </div>

          {!currentClosure && (
            <button 
              onClick={handleCloseCashier}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest transition transform hover:scale-105 shadow-xl shadow-emerald-500/20"
            >
              Fechar Caixa do Dia
            </button>
          )}
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Dinheiro', amount: dailyData.breakdown.dinheiro, color: 'emerald', icon: '💵', desc: 'Entradas em Espécie' },
          { label: 'Cartão Crédito', amount: dailyData.breakdown.cartao_credito, color: 'indigo', icon: '💳', desc: 'Vendas no Crédito' },
          { label: 'Cartão Débito', amount: dailyData.breakdown.cartao_debito, color: 'blue', icon: '🏧', desc: 'Vendas no Débito' },
          { label: 'PIX', amount: dailyData.breakdown.pix, color: 'cyan', icon: '📱', desc: 'Transferências Instantâneas' }
        ].map(item => (
          <div key={item.label} className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 transition-all hover:scale-[1.02] group">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-${item.color}-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner`}>
                {item.icon}
              </div>
              <div className={`px-3 py-1 bg-${item.color}-50 rounded-full border border-${item.color}-100`}>
                <p className={`text-[8px] font-black text-${item.color}-600 uppercase tracking-widest`}>
                  {currentClosure ? 'Fechado' : 'Confirmado'}
                </p>
              </div>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{item.label}</p>
            <h4 className={`text-2xl font-black text-slate-900 mb-2`}>{formatCurrency(item.amount)}</h4>
            <p className="text-[9px] text-slate-400 font-bold uppercase italic">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-4">
          <div>
            <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.3em]">Detalhamento de Entradas</h4>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Lista de todos os recebimentos do dia</p>
          </div>
          <button 
            onClick={() => window.print()}
            className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-lg"
          >
            Imprimir Relatório
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Forma</th>
                <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(() => {
                const allPayments = [
                  ...sales.flatMap(sale => 
                    sale.installments.flatMap(inst => 
                      (inst.payments || []).filter(p => p.date === selectedDate).map(p => ({
                        id: p.id,
                        customer: sale.customerId === 'BALCAO' ? '🛒 Venda Balcão' : (customers.find(c => c.id === sale.customerId)?.name || 'Cliente'),
                        method: p.method,
                        amount: p.amount,
                        type: 'receiv' as const
                      }))
                    )
                  ),
                  ...trashSales.flatMap(item => 
                    item.sale.installments.flatMap(inst => 
                      (inst.payments || []).filter(p => p.date === selectedDate).map(p => ({
                        id: p.id,
                        customer: `🗑️ (EXCLUÍDA) ${item.sale.customerId === 'BALCAO' ? 'Venda Balcão' : (customers.find(c => c.id === item.sale.customerId)?.name || 'Cliente')}`,
                        method: p.method,
                        amount: p.amount,
                        type: 'receiv' as const
                      }))
                    )
                  ),
                  ...expenses.filter(exp => exp.date === selectedDate).map(exp => ({
                    id: exp.id,
                    customer: `💸 ${exp.description}`,
                    method: 'Despesa',
                    amount: -exp.amount,
                    type: 'expense' as const
                  }))
                ].sort((a, b) => a.id.localeCompare(b.id));

                if (allPayments.length > 0) {
                  return allPayments.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 text-xs font-black text-slate-800 uppercase">
                        {item.customer}
                      </td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          item.type === 'expense' ? 'bg-rose-100 text-rose-700' :
                          item.method === 'dinheiro' ? 'bg-emerald-100 text-emerald-700' :
                          item.method === 'pix' ? 'bg-cyan-100 text-cyan-700' :
                          'bg-indigo-100 text-indigo-700'
                        }`}>
                          {item.method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`py-4 text-xs font-black text-right ${item.type === 'expense' ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ));
                } else {
                  return (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-slate-400 text-[10px] font-black uppercase italic tracking-widest">
                        Nenhum recebimento ou despesa registrado para esta data.
                      </td>
                    </tr>
                  );
                }
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CashierManager;
