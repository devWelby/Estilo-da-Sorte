export function formatCurrency(value = 0) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

export function formatDate(value) {
  if (!value) return '-';
  const date = value?.toDate ? value.toDate() : new Date(value);
  return date.toLocaleDateString('pt-BR');
}

export function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

export function getCpfInitialPassword(cpf = '') {
  const digits = onlyDigits(cpf);
  return digits.slice(-6);
}

export function normalizeSearch(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}
