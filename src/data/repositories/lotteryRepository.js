import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { paths } from '../firebase/firestorePaths';

export function observeLotteries(callback, onError) {
  const q = query(collection(db, paths.lotteries), orderBy('dataSorteio', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, onError);
}

export function observeActiveLotteries(callback, onError) {
  const q = query(
    collection(db, paths.lotteries),
    where('status', '==', 'ativo'),
    orderBy('dataSorteio', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, onError);
}

export function observeFinishedLotteries(callback, onError) {
  const q = query(
    collection(db, paths.lotteries),
    where('status', 'in', ['finalizado', 'inativo']),
    orderBy('dataSorteio', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, onError);
}

export async function saveLottery(payload, id) {
  const base = {
    ...payload,
    updatedAt: serverTimestamp()
  };

  if (id) {
    await setDoc(doc(db, paths.lottery(id)), base, { merge: true });
    return id;
  }

  const ref = await addDoc(collection(db, paths.lotteries), {
    ...base,
    status: payload.status || 'ativo',
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function reactivateAllSales(sorteioId) {
  const callable = httpsCallable(functions, 'reativarTodasVendas');
  const result = await callable({ sorteioId });
  return result.data;
}

export async function runOfficialDraw(sorteioId) {
  const callable = httpsCallable(functions, 'realizarSorteio');
  const result = await callable({ sorteioId });
  return result.data;
}
