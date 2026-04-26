# Arquitetura

O projeto usa uma separação simples por camadas:

- `presentation`: telas e componentes visuais.
- `navigation`: rotas por perfil.
- `context`: sessão/autenticação.
- `hooks`: listeners em tempo real, busca com debounce e estado de UI.
- `domain/services`: regras de uso do app, validações simples e orquestração.
- `data/repositories`: acesso a Firebase SDK e chamadas às Cloud Functions.
- `functions`: backend sensível com Admin SDK e transações.

## Modelo de dados principal

```txt
usuarios/{uid}
sorteios/{sorteioId}
sorteios/{sorteioId}/numeros/{numero}
sorteios/{sorteioId}/participantes/{clienteId}
vendas/{vendaId}
auditoria/{logId}
```

## Por que usar Cloud Functions para vendas?

Mesmo que o app consiga escrever no Firestore, venda de números, confirmação de pagamento, cancelamento e sorteio oficial são operações sensíveis. Por isso, as regras bloqueiam escrita direta em `vendas` e o backend usa transações para evitar que dois vendedores vendam o mesmo número.

## Offline-first

O Firestore SDK fica preparado para cache local. Para operações críticas, o app trata erro de indisponibilidade mostrando uma mensagem amigável e permitindo nova tentativa.
