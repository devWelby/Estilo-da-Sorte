import { collection, getDocs, limit, onSnapshot, orderBy, query, startAfter, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { paths } from '../firebase/firestorePaths';

export function observeSellerSales(vendedorId, callback, onError) {
  const q = query(
    collection(db, paths.sales),
    where('vendedorId', '==', vendedorId),
    orderBy('criadoEm', 'desc'),
    limit(100)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, onError);
}

export async function getSellerSalesPage(vendedorId, cursor = null, pageSize = 20) {
  const constraints = [
    where('vendedorId', '==', vendedorId),
    orderBy('criadoEm', 'desc'),
    limit(pageSize)
  ];
  if (cursor) constraints.splice(2, 0, startAfter(cursor));

  const q = query(collection(db, paths.sales), ...constraints);
  const snapshot = await getDocs(q);
  const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  const nextCursor = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : null;

  return {
    items,
    nextCursor,
    hasMore: snapshot.docs.length === pageSize
  };
}

export function observePendingSalesCount(vendedorId, callback, onError) {
  const qStatus = query(
    collection(db, paths.sales),
    where('vendedorId', '==', vendedorId),
    where('status', '==', 'pendente')
  );
  const qLegacy = query(
    collection(db, paths.sales),
    where('vendedorId', '==', vendedorId),
    where('statusPagamento', '==', 'pendente')
  );

  let statusDocs = new Map();
  let legacyDocs = new Map();

  const emit = () => {
    const merged = new Set([...statusDocs.keys(), ...legacyDocs.keys()]);
    callback(merged.size);
  };

  const unsubStatus = onSnapshot(qStatus, (snapshot) => {
    statusDocs = new Map(snapshot.docs.map((docSnap) => [docSnap.id, true]));
    emit();
  }, onError);

  const unsubLegacy = onSnapshot(qLegacy, (snapshot) => {
    legacyDocs = new Map(snapshot.docs.map((docSnap) => [docSnap.id, true]));
    emit();
  }, onError);

  return () => {
    unsubStatus();
    unsubLegacy();
  };
}

export function observeLotterySales(sorteioId, callback, onError) {
  const q = query(
    collection(db, paths.sales),
    where('sorteioId', '==', sorteioId),
    orderBy('criadoEm', 'desc'),
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
  const callable = httpsCallable(functions, 'exportarVendasCSV');
  const result = await callable({ sorteioId });
  return result.data;
}
