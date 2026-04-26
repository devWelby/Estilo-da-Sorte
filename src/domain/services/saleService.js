import { createSale, confirmPayment, cancelSale } from '../../data/repositories/salesRepository';

export async function sellTicket({ sorteioId, numero, clienteId, valor }) {
  if (!sorteioId) throw new Error('Selecione um sorteio.');
  if (!numero) throw new Error('Informe o número.');
  if (!clienteId) throw new Error('Informe o cliente.');
  return createSale({ sorteioId, numero: String(numero).trim(), clienteId, valor: Number(valor || 0) });
}

export async function markSaleAsPaid(vendaId) {
  if (!vendaId) throw new Error('Venda inválida.');
  return confirmPayment(vendaId);
}

export async function releaseSale(vendaId) {
  if (!vendaId) throw new Error('Venda inválida.');
  return cancelSale(vendaId);
}
