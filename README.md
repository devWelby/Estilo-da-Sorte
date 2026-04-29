# Estilo da Sorte RN + Firebase

Aplicativo React Native (Expo) com backend Firebase para operacao de rifas/sorteios com perfis `admin`, `vendedor` e `cliente`.

## Arquitetura

Estrutura em camadas:

- `src/presentation`: telas, componentes e navegacao
- `src/domain`: regras de negocio e servicos
- `src/data`: repositorios Firebase
- `functions`: Cloud Functions (backend serverless)

## Modelo Firestore

Colecoes principais:

- `configuracoes/app`: metadados gerais da aplicacao
- `configuracoes/sorteio_atual`: ponteiro para sorteio corrente
- `configuracoes/versao_app`: `versaoAtual`, `urlAtualizacao`, `forcarAtualizacao`
- `configuracoes/limites`: limites dinamicos (ex.: expiracao de pendencias)
- `configuracoes/versao_banco`: versionamento de schema (`schemaVersion`)
- `usuarios/{uid}`: dados publicos de perfil (`nome`, `email`, `tipo`, `telefone`, timestamps)
- `usuarios/{uid}/pushTokens/{tokenId}`: tokens FCM ativos por usuario
- `usuarios_privados/{uid}`: dados sensiveis (`cpf`, `cpfMascarado`)
- `sorteios/{sorteioId}`: metadados do sorteio (`codigoSorteio`, `status`, `statusLegado`, `ganhadorId`, `metrics`)
- `sorteios/{sorteioId}/numeros/{numeroId}`: cartela (`status`, `clienteId`, `vendaId`, `sorteioId`, `reservadoEm`, `expiracaoReserva`)
- `sorteios/{sorteioId}/participantes/{clienteId}`: consolidado (`quantidadeNumeros`, `valorTotal`, `ultimaCompraEm`, `vendasIds`)
- `sorteios/{sorteioId}/metrics/current`: snapshot de metricas
- `vendas/{vendaId}`: vendas (`status`, `statusPagamento`, `statusVenda`, `quantidade`, `valorUnitario`, `valorTotal`, `comissaoAplicada`)
- `auditoria/{logId}`: trilha de auditoria de operacoes criticas

Documento de referencia (analise completa + modelo profissional v3):

- `docs/FIRESTORE_MODELO_PROFISSIONAL_V3.md`

Status de negocio:

- Sorteio: `rascunho`, `aberto`, `pausado`, `emSorteio`, `finalizado`, `cancelado`
- Numero: `disponivel`, `reservado`, `vendido`
- Venda/Pagamento: `pendente`, `pago`, `cancelado`, `estornado`

Compatibilidade de transicao:

- Campo novo principal: `vendas.status`
- Campos legados mantidos durante migracao: `statusPagamento` e `statusVenda`
- Cloud Functions escrevem os 3 campos de forma sincronizada para evitar quebra no front-end legado

## Regras e Indices

Arquivos versionados:

- `firestore.rules`
- `firestore.indexes.json`

Deploy:

```bash
firebase deploy --only firestore
```

## Cloud Functions

Callables principais (`functions/index.js`):

- `criarCliente`
- `listarClientes`
- `criarVenda`
- `confirmarPagamento`
- `cancelarVenda`
- `realizarSorteio`
- `exportarVendasCSV`
- `recalcularMetricasSorteio`
- `reativarTodasVendas`
- `migrarSchemaFirestore`
- `registrarTokenPush`
- `removerTokenPush`
- `enviarNotificacaoTeste`
- `bootstrapDevData` (somente emulator, para auto-recuperacao de base dev)

Triggers:

- `expirarPendencias` (cron a cada 5 minutos)
- `notificarMudancaVenda` (onUpdate em `vendas/{vendaId}`)

Deploy:

```bash
firebase deploy --only functions
```

## Cloud Messaging

Fluxo atual:

1. App registra token via callable `registrarTokenPush`.
2. Admin pode enviar push de teste para si pelo botao em `AdminHome`.
3. Mudancas de `statusPagamento` em vendas disparam push automatico para vendedor e cliente.

## Endurecimento de seguranca (PR1)

- `criarCliente` e `criarVendedor` agora usam senha temporaria aleatoria forte (nao derivada de CPF).
- Novos usuarios saem com `mustChangePassword: true` (perfil + custom claims) para fluxo de troca obrigatoria.
- Callables criticas possuem rate limit por usuario autenticado:
  - `criarCliente`, `criarVendedor`, `criarVenda`, `confirmarPagamento`, `cancelarVenda`, `realizarSorteio`, `exportarVendasCSV`, `reativarTodasVendas`.
- `devLogin` fica bloqueado fora de `__DEV__` + emulador + flag `EXPO_PUBLIC_DEV_LOGIN_ENABLED`.

Variavel opcional para registrar token manual em dev:

```env
EXPO_PUBLIC_DEV_FCM_TOKEN=
```

## Testes (Emulator Suite)

Scripts:

- `npm run test:rules`
- `npm run test:functions`
- `npm run test:emulators`

Prerequisito importante:

- Use Java LTS (`17` ou `21`) para o Firestore Emulator. Java muito novo (ex.: `26`) pode encerrar o emulador com `exit code 1`.

Conteudo da suite:

- `tests/rules/firestore.rules.test.js`: acesso por perfil, `collectionGroup`, transicao de pagamento
- `tests/functions/functions.emulator.test.js`: criar cliente, corrida de venda no mesmo numero, transicao invalida

Observacao: o `test:emulators` exige Firestore Emulator inicializando corretamente em Java suportado. Se houver erro de porta/Java no ambiente local, rode ao menos `test:rules` (ja funcional) e ajuste sua JDK para uma versao suportada pelo Firebase Emulator Suite.

## Migracao Incremental de Schema

Passos recomendados sem quebra:

1. Deploy de regras, indices e functions novas.
2. Executar `migrarSchemaFirestore` em lotes no ambiente de dev ate `hasMore=false`.
3. Validar telas principais (venda, pendencias, bilhetes, dashboard).
4. Repetir no ambiente de producao em janela controlada.

Exemplo de chamada (admin autenticado no app):

- Callable: `migrarSchemaFirestore`
- Payload sugerido: `{ \"batchSize\": 120, \"cursor\": {} }`
- Reutilizar `nextCursor` da resposta nas chamadas seguintes.

Opcoes da migracao:

- `removePublicPii` (default `true`): remove `cpfCliente/telefoneCliente` de `numeros` e `cpf/telefone` de `participantes`
- `enrichAuditMetadata` (default `true`): adiciona `entidadeTipo`, `entidadeId` e `source` em `auditoria`

## Deploy DEV

Script unico de deploy com validacoes:

```bash
npm run deploy:dev
```

Versao rapida (sem lint e sem testes):

```bash
npm run deploy:dev:quick
```

Validacao sem publicar:

```bash
npm run deploy:dev:dry-run
```

Checklist detalhado:

- `docs/DEPLOY_DEV_CHECKLIST.md`

## Desenvolvimento Local

### 1) Instalar dependencias

```bash
npm install
cd functions
npm install
cd ..
```

### 2) Configurar ambiente

```bash
copy .env.example .env
```

### 3) Subir emuladores

```bash
npm run emulators
```

### 4) Seed dev

```bash
npm run seed
```

### 5) Rodar app

```bash
npm run start:dev
```

Opcao recomendada (tudo em um comando):

```bash
npm run dev:up
```

O `dev:up` faz:

- sobe emuladores (se nao estiverem ativos),
- valida portas (`9199`, `8180`, `5101`, `4100`),
- executa seed idempotente,
- inicia o Expo em modo dev.

Variantes:

```bash
npm run dev:up:clean   # limpa portas antes de subir
npm run dev:infra      # sobe infra + seed sem abrir Expo
```

Para conectar no projeto real:

```bash
npm run start:prod
```

## Login Dev

Em modo de desenvolvimento, a tela de login mostra botoes de acesso rapido.

Auto-recuperacao implementada:

- Se os usuarios dev nao existirem no Auth Emulator, o app executa `bootstrapDevData` automaticamente e tenta login novamente.
- Isso evita o erro recorrente de `Usuario nao encontrado` quando a base local foi limpa.

Contas criadas pelo seed:

- Admin: `admin@dev.local` / `123456`
- Vendedor: `vendedor@dev.local` / `123456`
- Cliente: `cliente@dev.local` / `123456`

Variavel usada no bootstrap dev:

- `EXPO_PUBLIC_DEV_BOOTSTRAP_SECRET` (deve combinar com `DEV_BOOTSTRAP_SECRET` nas Functions; por padrao: `estilo-local-bootstrap`).

## Fluxos principais

- Criacao de cliente sem derrubar sessao do vendedor
- Venda transacional com reserva de numero
- Confirmacao/cancelamento de pendencias
- Expiracao automatica de pendencias
- Sorteio oficial com aleatoriedade no backend
- Exportacao CSV de vendas pagas
- Dashboard com metricas agregadas
- Push de teste e notificacoes automaticas de mudanca de status de venda
