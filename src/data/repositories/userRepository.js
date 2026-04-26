import { collection, doc, getDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { paths } from '../firebase/firestorePaths';

export async function getUserProfile(uid) {
  const snapshot = await getDoc(doc(db, paths.user(uid)));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export function observeUserProfile(uid, callback, onError) {
  return onSnapshot(doc(db, paths.user(uid)), (snapshot) => {
    callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
  }, onError);
}

export function observeUsersByType(type, callback, onError) {
  const q = query(collection(db, paths.users), where('tipo', '==', type), orderBy('nome'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, onError);
}
