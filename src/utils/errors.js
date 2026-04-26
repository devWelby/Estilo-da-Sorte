export function friendlyFirebaseError(error) {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) {
    return 'E-mail ou senha inválidos.';
  }
  if (code.includes('auth/user-not-found')) {
    return 'Usuário não encontrado.';
  }
  if (code.includes('auth/email-already-exists') || code.includes('already-exists')) {
    return 'Este e-mail já está cadastrado.';
  }
  if (code.includes('unavailable') || message.includes('UNAVAILABLE')) {
    return 'Sem conexão. Tente novamente.';
  }
  if (code.includes('permission-denied')) {
    return 'Você não tem permissão para executar esta ação.';
  }
  return message || 'Não foi possível concluir a operação.';
}
