import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

export async function listCustomers() {
  const callable = httpsCallable(functions, 'listarClientes');
  const result = await callable();
  return result.data?.clientes || [];
}

export async function createCustomer(payload) {
  const callable = httpsCallable(functions, 'criarCliente');
  const result = await callable(payload);
  return result.data;
}