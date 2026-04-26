import { createCustomer } from '../../data/repositories/customerRepository';
import { onlyDigits } from '../../utils/formatters';

export async function registerCustomer({ nome, email, cpf, telefone }) {
  const cpfDigits = onlyDigits(cpf);
  if (!nome?.trim()) throw new Error('Informe o nome do cliente.');
  if (!email?.trim()) throw new Error('Informe o e-mail do cliente.');
  if (cpfDigits.length !== 11) throw new Error('CPF deve ter 11 dígitos.');
  return createCustomer({ nome: nome.trim(), email: email.trim(), cpf: cpfDigits, telefone });
}
