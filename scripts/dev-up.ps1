param(
  [switch]$NoSeed,
  [switch]$NoExpo,
  [switch]$CleanPorts
)

$ErrorActionPreference = 'Stop'

function Test-PortOpen {
  param(
    [Parameter(Mandatory=$true)][string]$Address,
    [Parameter(Mandatory=$true)][int]$Port
  )

  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $asyncResult = $client.BeginConnect($Address, $Port, $null, $null)
    $connected = $asyncResult.AsyncWaitHandle.WaitOne(1000, $false)
    if (-not $connected) {
      $client.Close()
      return $false
    }
    $client.EndConnect($asyncResult) | Out-Null
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

function Wait-Port {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][string]$Address,
    [Parameter(Mandatory=$true)][int]$Port,
    [int]$TimeoutSec = 90
  )

  $start = Get-Date
  while ((Get-Date) -lt $start.AddSeconds($TimeoutSec)) {
    if (Test-PortOpen -Address $Address -Port $Port) {
      Write-Host "[ok] $Name em $Address`:$Port" -ForegroundColor Green
      return $true
    }
    Start-Sleep -Milliseconds 600
  }

  Write-Host "[erro] Timeout aguardando $Name em $Address`:$Port" -ForegroundColor Red
  return $false
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

Write-Host "[dev:up] Workspace: $repoRoot" -ForegroundColor Cyan

# Permite uso: npm run dev:up clear
if ($args -contains 'clear') {
  $CleanPorts = $true
}

if ($CleanPorts) {
  Write-Host "[dev:up] Limpando portas de emuladores..." -ForegroundColor Yellow
  npm run test:kill-ports
}

$requiredPorts = @(
  @{ Name = 'Auth Emulator'; Address = '127.0.0.1'; Port = 9199 },
  @{ Name = 'Firestore Emulator'; Address = '127.0.0.1'; Port = 8180 },
  @{ Name = 'Functions Emulator'; Address = '127.0.0.1'; Port = 5101 },
  @{ Name = 'Emulator UI'; Address = '127.0.0.1'; Port = 4100 }
)

$allRunning = $true
foreach ($item in $requiredPorts) {
  if (-not (Test-PortOpen -Address $item.Address -Port $item.Port)) {
    $allRunning = $false
    break
  }
}

$emulatorProcess = $null
if (-not $allRunning) {
  Write-Host "[dev:up] Subindo Emulator Suite..." -ForegroundColor Yellow
  $emulatorProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm run emulators' -WorkingDirectory $repoRoot -PassThru

  foreach ($item in $requiredPorts) {
    $ok = Wait-Port -Name $item.Name -Address $item.Address -Port $item.Port -TimeoutSec 120
    if (-not $ok) {
      if ($emulatorProcess -and -not $emulatorProcess.HasExited) {
        Stop-Process -Id $emulatorProcess.Id -Force
      }
      throw "Nao foi possivel inicializar os emuladores."
    }
  }
} else {
  Write-Host '[dev:up] Emuladores ja estavam ativos.' -ForegroundColor Green
}

if (-not $NoSeed) {
  Write-Host '[dev:up] Executando seed (idempotente)...' -ForegroundColor Yellow
  npm run seed
}

if ($NoExpo) {
  Write-Host '[dev:up] Finalizado sem Expo (flag -NoExpo).' -ForegroundColor Cyan
  exit 0
}

Write-Host '[dev:up] Iniciando Expo em modo dev...' -ForegroundColor Yellow
$env:EXPO_PUBLIC_USE_FIREBASE_EMULATORS = 'true'
npm run start:dev
