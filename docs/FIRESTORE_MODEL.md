# Modelo Firestore

## usuarios/{uid}

```js
{
  nome: 'Iris Vendedora',
  email: 'vendedor@dev.local',
  tipo: 'admin' | 'vendedor' | 'cliente',
  cpf: 'somente para cliente',
  telefone: '',
  codigo: 'L020 (100)',
  totalRecebido: 300,
  totalVendido: 0,
  createdAt,
  updatedAt
}
```

## sorteios/{sorteioId}

```js
{
  dataSorteio,
  dataSorteioText: '18/04/2026',
  premioPrincipal: 'Pop 2022',
  premioDinheiro: 10000,
  valorBilhete: 2,
  chances: 20,
  status: 'ativo' | 'inativo' | 'finalizado',
  vendasAtivas: true,
  metricas: {
    distribuidos: 25000,
    vendidos: 18456,
    pagos: 18456,
    pendentes: 0,
    valorPago: 36912,
    valorPendente: 0
  },
  resultado: {
    numero: '763587',
    ganhadorNome: 'Alan Gesso',
    vendedorNome: 'Iris'
  }
}
```

## sorteios/{sorteioId}/numeros/{numero}

```js
{
  status: 'disponivel' | 'reservado' | 'vendido',
  clienteId,
  vendedorId,
  vendaId,
  updatedAt
}
```

## vendas/{vendaId}

```js
{
  sorteioId,
  numero,
  clienteId,
  clienteNome,
  vendedorId,
  vendedorNome,
  valor,
  statusPagamento: 'pendente' | 'pago' | 'cancelada',
  createdAt,
  expiresAt,
  updatedAt
}
```
