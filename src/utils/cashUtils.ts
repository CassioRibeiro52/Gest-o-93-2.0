
import { Sale } from '../types';

export const calculateTodayTotals = (sales: Sale[], dateStr: string) => {
  const totals = {
    cash: { dinheiro: 0, cartao_credito: 0, cartao_debito: 0, pix: 0 },
    credit: { dinheiro: 0, cartao_credito: 0, cartao_debito: 0, pix: 0 }
  };

  sales.forEach(sale => {
    sale.installments.forEach(inst => {
      (inst.payments || []).forEach(payment => {
        if (payment.date === dateStr) {
          const method = (payment.method || 'dinheiro') as keyof typeof totals.cash;
          // Migração simples: se o método for 'cartao' (antigo), joga para 'cartao_credito'
          const safeMethod = method === ('cartao' as any) ? 'cartao_credito' : method;
          
          if (sale.type === 'cash') {
            if (totals.cash[safeMethod] !== undefined) {
              totals.cash[safeMethod] += payment.amount;
            }
          } else {
            if (totals.credit[safeMethod] !== undefined) {
              totals.credit[safeMethod] += payment.amount;
            }
          }
        }
      });
    });
  });

  return totals;
};
