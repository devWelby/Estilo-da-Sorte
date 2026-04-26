export const paths = {
  user: (uid) => `usuarios/${uid}`,
  users: 'usuarios',
  lotteries: 'sorteios',
  lottery: (id) => `sorteios/${id}`,
  lotteryNumbers: (sorteioId) => `sorteios/${sorteioId}/numeros`,
  lotteryNumber: (sorteioId, numero) => `sorteios/${sorteioId}/numeros/${numero}`,
  participants: (sorteioId) => `sorteios/${sorteioId}/participantes`,
  sales: 'vendas',
  audits: 'auditoria'
};
