import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

export async function registerPushToken(token, platform = 'android') {
  const callable = httpsCallable(functions, 'registrarTokenPush');
  const result = await callable({ token, platform });
  return result.data;
}

export async function removePushToken(token) {
  const callable = httpsCallable(functions, 'removerTokenPush');
  const result = await callable({ token });
  return result.data;
}

export async function sendTestNotification(userId, title, body, data = {}) {
  const callable = httpsCallable(functions, 'enviarNotificacaoTeste');
  const result = await callable({ userId, title, body, data });
  return result.data;
}