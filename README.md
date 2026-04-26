# Estilo da Sorte — React Native + Firebase

Projeto base completo para um aplicativo de gestão de rifas/sorteios com perfis **Admin**, **Vendedor** e **Cliente**.

Este pacote foi gerado a partir do escopo enviado: React Native com JavaScript, Firebase Authentication, Firestore, Cloud Functions, regras de segurança, login dev, fluxo de vendas, painel administrativo, vendedores, clientes, resultados e métricas.

> Observação: este ZIP é uma base funcional e organizada para iniciar/testar o projeto. Ele não substitui o repositório original caso você já tenha telas em Kotlin/Android Studio. Para migrar ou conectar com um app Kotlin existente, use as Cloud Functions e o modelo de dados deste projeto como backend.

## Estrutura

```txt
estilo-da-sorte-rn-firebase/
├── App.js
├── app.json
├── package.json
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── functions/
│   ├── index.js
│   ├── package.json
│   └── seedEmulator.js
└── src/
    ├── app/
    ├── config/
    ├── constants/
    ├── context/
    ├── data/
    ├── domain/
    ├── hooks/
    ├── navigation/
    ├── presentation/
    └── utils/
```

## Requisitos

- Node.js 20+
- npm
- Expo CLI via `npx expo`
- Firebase CLI: `npm install -g firebase-tools`
- Conta/projeto Firebase, ou emuladores locais para teste.

## Como rodar localmente com emuladores

1. Instale as dependências do app:

```bash
npm install
```

2. Instale as dependências das Cloud Functions:

```bash
cd functions
npm install
cd ..
```

3. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

4. Inicie os emuladores:

```bash
npm run emulators
```

5. Em outro terminal, rode o seed de dados:

```bash
npm run seed
```

6. Inicie o app:

```bash
npm start
```

Depois escolha Android/iOS/Web conforme o Expo mostrar.

## Logins dev criados pelo seed

| Perfil | E-mail | Senha |
|---|---|---|
| Admin | admin@dev.local | 123456 |
| Vendedor | vendedor@dev.local | 123456 |
| Cliente | cliente@dev.local | 123456 |

No app, em modo desenvolvimento, a tela de login mostra botões rápidos para entrar como cada perfil.

## Principais fluxos implementados

- Autenticação por Firebase Auth.
- Carregamento do perfil em `usuarios/{uid}`.
- Navegação condicional por perfil.
- Login dev controlado por flag.
- Listagem de sorteios ativos/inativos.
- Edição/criação de sorteios pelo Admin.
- Lista de vendedores, detalhe do vendedor e resumo de distribuição/vendas.
- Badge de pendências do Vendedor em tempo real.
- Criação de cliente sem derrubar sessão do vendedor via Cloud Function `criarCliente`.
- Criação de venda via Cloud Function `criarVenda` com transação.
- Confirmação/cancelamento de pagamento via transação.
- Expiração automática de pendências por Cloud Scheduler.
- Sorteio oficial com `crypto.randomInt` na Cloud Function `realizarSorteio`.
- Exportação CSV básica por Cloud Function `exportarVendasCsv`.
- Regras Firestore com leitura por perfil e escrita sensível bloqueada no cliente.

## Comandos úteis

```bash
npm start              # inicia Expo
npm run android        # abre no Android
npm run emulators      # sobe Auth, Firestore e Functions em modo local
npm run seed           # cria usuários e dados fake no emulador
npm run lint           # validação simples do JS
```

## Próximos passos recomendados

1. Criar o projeto Firebase real e preencher `.env` com as chaves.
2. Publicar as Functions com `firebase deploy --only functions`.
3. Publicar regras e índices: `firebase deploy --only firestore`.
4. Substituir o logo placeholder por `assets/logo.png`.
5. Ajustar máscaras de CPF/telefone e validações específicas do seu negócio.
6. Adaptar a identidade visual para ficar igual às telas enviadas.
