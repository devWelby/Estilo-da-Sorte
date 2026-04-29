import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { ENV } from '../../config/env';

export async function bootstrapDevData() {
  const callable = httpsCallable(functions, 'bootstrapDevData');
  const result = await callable({ secret: ENV.devBootstrapSecret });
  return result.data;
}

