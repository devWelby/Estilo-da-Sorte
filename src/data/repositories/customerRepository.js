import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { paths } from '../firebase/firestorePaths';

export function observeCustomers(callback, onError) {
  const q = query(collection(db, paths.users), where('tipo', '==', 'cliente'), orderBy('nome'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, onError);
}

export async function createCustomer(payload) {
  const callable = httpsCallable(functions, 'criarCliente');
  const result = await callable(payload);
  return result.data;
}
