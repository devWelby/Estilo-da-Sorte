param(
  [switch]$SkipTests,
  [switch]$SkipLint,
  [switch]$DryRun,
  [string]$ProjectId = 'estilo-da-sorte-5f684'
)

$ErrorActionPreference = 'Stop'

function Step($message) {
  Write-Host "`n==> $message" -ForegroundColor Cyan
}

Step "Verificando dependencias locais"
if (-not (Test-Path 'package.json')) { throw 'package.json nao encontrado na raiz do projeto.' }
if (-not (Test-Path 'functions/package.json')) { throw 'functions/package.json nao encontrado.' }

if (-not $SkipLint) {
  Step "Executando lint"
  npm run lint
}

if (-not $SkipTests) {
  Step "Executando testes em emuladores"
  npm run test:emulators
}

Step "Publicando Firestore (rules + indexes)"
if ($DryRun) {
  Write-Host "[DRY-RUN] firebase deploy --project $ProjectId --only firestore" -ForegroundColor Yellow
} else {
  firebase deploy --project $ProjectId --only firestore
}

Step "Publicando Cloud Functions"
if ($DryRun) {
  Write-Host "[DRY-RUN] firebase deploy --project $ProjectId --only functions" -ForegroundColor Yellow
} else {
  firebase deploy --project $ProjectId --only functions
}

Step "Deploy DEV finalizado"
Write-Host "Projeto: $ProjectId" -ForegroundColor Green
