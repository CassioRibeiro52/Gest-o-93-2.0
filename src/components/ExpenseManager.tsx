
import React, { useState, useEffect } from 'react';
import { Expense } from '../types';

interface ExpenseManagerProps {
  expenses: Expense[];
  onAdd: (description: string, amount: number, date: string) => void;
  onDelete: (id: string) => void;
}

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ expenses, onAdd, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).reverse();

  const filteredExpenses = expenses.filter(exp => {
    if (!exp.date) return true;
    // Parse YYYY-MM-DD safely by adding a time component or splitting
    const [year, month, day] = exp.date.split('-').map(Number);
    return (month - 1) === selectedMonth && year === selectedYear;
  });

  const totalExpenses = filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0);

  useEffect(() => {
    // When selected month or year changes, update the default date for new expenses
    const now = new Date();
    const day = now.getMonth() === selectedMonth && now.getFullYear() === selectedYear 
      ? String(now.getDate()).padStart(2, '0') 
      : '01';
    const monthStr = String(selectedMonth + 1).padStart(2, '0');
    setDate(`${selectedYear}-${monthStr}-${day}`);
  }, [selectedMonth, selectedYear]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amount <= 0) return;
    onAdd(description, amount, date);
    setDescription('');
    setAmount(0);
    setShowAdd(false);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    onDelete(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase italic mb-2">Excluir Despesa?</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Esta ação não pode ser desfeita. Deseja continuar?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest transition text-xs"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-widest transition text-xs shadow-lg shadow-rose-200"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Gestão de Despesas</h2>
          <p className="text-sm text-slate-500">Controle seus custos fixos e variáveis mês a mês.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold uppercase text-slate-600 px-2 py-1 outline-none cursor-pointer"
            >
              {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold uppercase text-slate-600 px-2 py-1 outline-none cursor-pointer border-l border-slate-200"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-rose-700 transition shadow-sm"
          >
            {showAdd ? 'Cancelar' : 'Nova Despesa'}
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1">Total de Despesas em {months[selectedMonth]}</p>
          <p className="text-3xl font-black text-rose-600">
            R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-3 bg-white rounded-2xl text-rose-600 border border-rose-200">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição *</label>
              <input 
                type="text" 
                value={description} 
                required
                onChange={e => setDescription(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                placeholder="Ex: Aluguel, Internet, MEI..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$) *</label>
              <input 
                type="number" 
                step="0.01"
                value={amount || ''} 
                required
                onChange={e => setAmount(Number(e.target.value))} 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-black"
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data *</label>
              <input 
                type="date" 
                value={date} 
                required
                onChange={e => setDate(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="bg-rose-600 text-white px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-rose-700 transition shadow-lg shadow-rose-100">
              Salvar Despesa
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExpenses.map(expense => (
          <div key={expense.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group hover:border-rose-200 transition">
             <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-slate-800">{expense.description}</h4>
                  {expense.category === 'refund' && <span className="text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-black uppercase">Estorno</span>}
                </div>
                <p className="text-lg font-black text-rose-600">R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                {expense.date && <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(expense.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}
             </div>
             <button 
                onClick={() => setConfirmDeleteId(expense.id)}
                className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </button>
          </div>
        ))}
        {filteredExpenses.length === 0 && !showAdd && (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-dashed border-slate-200 text-slate-400">
            Nenhuma despesa cadastrada para {months[selectedMonth]} de {selectedYear}.
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseManager;
