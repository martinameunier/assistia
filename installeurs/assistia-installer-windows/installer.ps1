param(
  [string]$CertificatePath,
  [string]$InstallerPath
)

<#
Installe le certificat public de signature de l'application sur la machine,
puis lance l'installateur Windows genere pour Assistia.

Execution recommandee depuis PowerShell en administrateur :
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
  .\installer.ps1

Avec certificat :
  .\installer.ps1 -CertificatePath .\assistant-ai-self-signed.cer

Avec installateur explicite :
  .\installer.ps1 -InstallerPath ".\assitia-installer.exe"
#>

$ErrorActionPreference = "Stop"

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)

  return $principal.IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
  )
}

if (-not (Test-Administrator)) {
  Write-Host "Ce script doit etre lance dans PowerShell en administrateur." -ForegroundColor Red
  Write-Host "Clic droit sur PowerShell, puis 'Executer en tant qu'administrateur'."
  exit 1
}

function Resolve-CertificatePath {
  param(
    [string]$Path
  )

  $candidatePaths = @()

  if (-not [string]::IsNullOrWhiteSpace($Path)) {
    $candidatePaths += $Path

    if (-not [System.IO.Path]::IsPathRooted($Path)) {
      $candidatePaths += (Join-Path $PSScriptRoot $Path)
    }
  }

  $candidatePaths += @(
    (Join-Path $PSScriptRoot "assistant-ai-self-signed.cer"),
    (Join-Path $PSScriptRoot "..\certificates\assistant-ai-self-signed.cer"),
    (Join-Path $PSScriptRoot "..\..\certificates\assistant-ai-self-signed.cer")
  )

  foreach ($candidatePath in $candidatePaths) {
    if (Test-Path $candidatePath) {
      return (Resolve-Path $candidatePath).Path
    }
  }

  return $null
}

function Install-ApplicationCertificate {
  param(
    [string]$Path
  )

  if ([string]::IsNullOrWhiteSpace($Path)) {
    throw "Aucun certificat d'application trouve. Utilisez -CertificatePath pour fournir le chemin du fichier .cer."
  }

  Write-Host "Installation du certificat d'application :" -ForegroundColor Cyan
  Write-Host $Path

  $certificate = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($Path)
  Write-Host "Sujet     : $($certificate.Subject)"
  Write-Host "Empreinte : $($certificate.Thumbprint)"

  Import-Certificate `
    -FilePath $Path `
    -CertStoreLocation "Cert:\LocalMachine\Root" | Out-Null

  Import-Certificate `
    -FilePath $Path `
    -CertStoreLocation "Cert:\LocalMachine\TrustedPublisher" | Out-Null

  Write-Host "Certificat ajoute a Autorites de certification racines de confiance." -ForegroundColor Green
  Write-Host "Certificat ajoute a Editeurs approuves." -ForegroundColor Green
}

function Resolve-InstallerPath {
  param(
    [string]$Path
  )

  if ([string]::IsNullOrWhiteSpace($Path)) {
    $Path = Join-Path $PSScriptRoot "assistia-installer.exe"
  }

  if (-not [string]::IsNullOrWhiteSpace($Path)) {
    $candidatePaths = @($Path)

    if (-not [System.IO.Path]::IsPathRooted($Path)) {
      $candidatePaths += (Join-Path $PSScriptRoot $Path)
    }

    foreach ($candidatePath in $candidatePaths) {
      if (Test-Path $candidatePath) {
        return (Resolve-Path $candidatePath).Path
      }
    }

    throw "Installateur introuvable : $Path"
  }
}

function Start-ApplicationInstaller {
  param(
    [string]$Path
  )

  Write-Host ""
  Write-Host "Lancement de l'installateur Assistia :" -ForegroundColor Cyan
  Write-Host $Path

  $extension = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()

  if ($extension -eq ".msi") {
    $process = Start-Process `
      -FilePath "msiexec.exe" `
      -ArgumentList @("/i", "`"$Path`"") `
      -Wait `
      -PassThru
  } else {
    $process = Start-Process `
      -FilePath $Path `
      -Wait `
      -PassThru
  }

  $successExitCodes = @(0, 3010)

  if ($null -ne $process.ExitCode -and $process.ExitCode -notin $successExitCodes) {
    throw "L'installateur s'est termine avec le code $($process.ExitCode)."
  }

  if ($process.ExitCode -eq 3010) {
    Write-Host "Installation terminee. Un redemarrage Windows est recommande." -ForegroundColor Yellow
  } else {
    Write-Host "Installation terminee." -ForegroundColor Green
  }
}

$resolvedCertificatePath = Resolve-CertificatePath -Path $CertificatePath
Install-ApplicationCertificate -Path $resolvedCertificatePath

$resolvedInstallerPath = Resolve-InstallerPath -Path $InstallerPath
Start-ApplicationInstaller -Path $resolvedInstallerPath
