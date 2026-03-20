
import React, { useState, useMemo } from 'react';
import { Sale, CashClosing, PaymentMethod } from '../types';
import { calculateTodayTotals } from '../utils/cashUtils';
import { getLocalDateStr } from '../utils/dateUtils';

interface CashManagerProps {
  sales: Sale[];
  closings: CashClosing[];
  onAddClosing: (closing: Omit<CashClosing, 'id'>) => void;
}

const CashManager: React.FC<CashManagerProps> = ({ sales, closings, onAddClosing }) => {
  const [notes, setNotes] = useState('');

  const todayStr = getLocalDateStr();

  const todayTotals = useMemo(() => {
    return calculateTodayTotals(sales, todayStr);
  }, [sales, todayStr]);

  const handleCloseCash = () => {
    const alreadyClosed = closings.some(c => c.date === todayStr);
    if (alreadyClosed) {
      if (!confirm('Já existe um fechamento para hoje. Deseja criar outro?')) return;
    }

    onAddClosing({
      date: todayStr,
      closedAt: Date.now(),
      totals: todayTotals,
      notes
    });
    setNotes('');
    alert('Caixa fechado com sucesso!');
  };

  const totalToday = todayTotals.cash.dinheiro + todayTotals.cash.cartao_credito + todayTotals.cash.cartao_debito + todayTotals.cash.pix +
                     todayTotals.credit.dinheiro + todayTotals.credit.cartao_credito + todayTotals.credit.cartao_debito + todayTotals.credit.pix;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Fluxo de Caixa Diário</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Resumo de entradas do dia: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase">Entradas de Hoje</h3>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Vendas À Vista</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center bg-white p-2 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Dinheiro</p>
                  <p className="text-xs font-black text-slate-900">R$ {todayTotals.cash.dinheiro.toFixed(2)}</p>
                </div>
                <div className="text-center bg-white p-2 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase">PIX</p>
                  <p className="text-xs font-black text-slate-900">R$ {todayTotals.cash.pix.toFixed(2)}</p>
                </div>
                <div className="text-center bg-white p-2 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Crédito</p>
                  <p className="text-xs font-black text-slate-900">R$ {todayTotals.cash.cartao_credito.toFixed(2)}</p>
                </div>
                <div className="text-center bg-white p-2 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Débito</p>
                  <p className="text-xs font-black text-slate-900">R$ {todayTotals.cash.cartao_debito.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Recebimentos A Prazo</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center bg-white p-2 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Dinheiro</p>
                  <p className="text-xs font-black text-slate-900">R$ {todayTotals.credit.dinheiro.toFixed(2)}</p>
                </div>
                <div className="text-center bg-white p-2 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase">PIX</p>
                  <p className="text-xs font-black text-slate-900">R$ {todayTotals.credit.pix.toFixed(2)}</p>
                </div>
                <div className="text-center bg-white p-2 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Crédito</p>
                  <p className="text-xs font-black text-slate-900">R$ {todayTotals.credit.cartao_credito.toFixed(2)}</p>
                </div>
                <div className="text-center bg-white p-2 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Débito</p>
                  <p className="text-xs font-black text-slate-900">R$ {todayTotals.credit.cartao_debito.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-900 p-4 rounded-2xl text-white text-center shadow-lg">
              <p className="text-[10px] font-black uppercase text-indigo-300 mb-1">Total Geral do Dia</p>
              <p className="text-2xl font-black">R$ {totalToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="pt-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Observações do Fechamento</label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: Sangria realizada, diferença de centavos..."
              rows={3}
            />
            <button 
              onClick={handleCloseCash}
              className="w-full mt-4 bg-emerald-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition shadow-lg active:scale-95"
            >
              Realizar Fechamento de Hoje
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase">Histórico de Fechamentos</h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-3">
            {closings.length === 0 ? (
              <p className="text-[10px] text-slate-400 text-center py-12 italic">Nenhum fechamento registrado ainda.</p>
            ) : (
              closings.sort((a, b) => b.closedAt - a.closedAt).map(closing => (
                <div key={closing.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-[10px] font-black text-slate-900 uppercase">{new Date(closing.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">Fechado às {new Date(closing.closedAt).toLocaleTimeString()}</p>
                    </div>
                    <p className="text-sm font-black text-emerald-600">
                      R$ {(closing.totals.cash.dinheiro + closing.totals.cash.cartao_credito + closing.totals.cash.cartao_debito + closing.totals.cash.pix +
                           closing.totals.credit.dinheiro + closing.totals.credit.cartao_credito + closing.totals.credit.cartao_debito + closing.totals.credit.pix).toFixed(2)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[8px] font-bold text-slate-500 uppercase">
                    <div>À Vista: R$ {(closing.totals.cash.dinheiro + closing.totals.cash.cartao_credito + closing.totals.cash.cartao_debito + closing.totals.cash.pix).toFixed(2)}</div>
                    <div>A Prazo: R$ {(closing.totals.credit.dinheiro + closing.totals.credit.cartao_credito + closing.totals.credit.cartao_debito + closing.totals.credit.pix).toFixed(2)}</div>
                  </div>
                  {closing.notes && (
                    <p className="mt-2 text-[9px] text-slate-600 italic border-t border-slate-200 pt-2">{closing.notes}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashManager;
