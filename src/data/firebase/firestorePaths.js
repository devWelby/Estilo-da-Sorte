export const paths = {
  setting: (id) => `configuracoes/${id}`,
  settings: 'configuracoes',
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
