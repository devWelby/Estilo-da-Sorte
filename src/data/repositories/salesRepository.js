import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { paths } from '../firebase/firestorePaths';

export function observeSellerSales(vendedorId, callback, onError) {
  const q = query(
    collection(db, paths.sales),
    where('vendedorId', '==', vendedorId),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, onError);
}

export function observePendingSalesCount(vendedorId, callback, onError) {
  const q = query(
    collection(db, paths.sales),
    where('vendedorId', '==', vendedorId),
    where('statusPagamento', '==', 'pendente')
  );
  return onSnapshot(q, (snapshot) => callback(snapshot.size), onError);
}

export function observeLotterySales(sorteioId, callback, onError) {
  const q = query(
    collection(db, paths.sales),
    where('sorteioId', '==', sorteioId),
    orderBy('createdAt', 'desc'),
    limit(300)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, onError);
}

export async function createSale(payload) {
  const callable = httpsCallable(functions, 'criarVenda');
  const result = await callable(payload);
  return result.data;
}

export async function confirmPayment(vendaId) {
  const callable = httpsCallable(functions, 'confirmarPagamento');
  const result = await callable({ vendaId });
  return result.data;
}

export async function cancelSale(vendaId) {
  const callable = httpsCallable(functions, 'cancelarVenda');
  const result = await callable({ vendaId });
  return result.data;
}

export async function exportSalesCsv(sorteioId) {
  const callable = httpsCallable(functions, 'exportarVendasCsv');
  const result = await callable({ sorteioId });
  return result.data;
}
