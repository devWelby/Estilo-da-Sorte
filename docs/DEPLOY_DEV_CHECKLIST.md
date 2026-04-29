# Checklist de Deploy DEV

Projeto alvo (default): `estilo-da-sorte-5f684`

## Pre-requisitos

- Firebase CLI autenticado (`firebase login`)
- Projeto correto no `.firebaserc`
- Dependencias instaladas:
  - `npm install`
  - `cd functions && npm install && cd ..`

## Deploy automatizado (recomendado)

Deploy completo com validacoes:

```bash
npm run deploy:dev
```

Opcoes do script PowerShell:

- Pular lint:

```powershell
./scripts/deploy-dev.ps1 -SkipLint
```

- Pular testes:

```powershell
./scripts/deploy-dev.ps1 -SkipTests
```

- Validar sem publicar:

```powershell
./scripts/deploy-dev.ps1 -SkipLint -SkipTests -DryRun
```

- Informar outro projeto:

```powershell
./scripts/deploy-dev.ps1 -ProjectId seu-projeto-dev
```

## Pipeline executado pelo script

1. `npm run lint`
2. `npm run test:emulators`
3. `firebase deploy --only firestore`
4. `firebase deploy --only functions`

## Validacao pos deploy

- Abrir app em `start:prod` e validar login por perfil
- Executar uma venda pendente e confirmar pagamento
- Validar push de teste no painel admin
- Conferir logs de funcoes:

```bash
firebase functions:log --project estilo-da-sorte-5f684
```

## Rollback rapido

- Reaplicar versao anterior de `functions` e `firestore.rules` via git e redeploy:

```bash
git checkout <commit-anterior> -- functions firestore.rules firestore.indexes.json
npm run deploy:dev
```
