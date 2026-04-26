import { collectionGroup, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

export function observeClientTickets(clienteId, callback, onError) {
  const q = query(collectionGroup(db, 'numeros'), where('clienteId', '==', clienteId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, path: item.ref.path, ...item.data() })));
  }, onError);
}
