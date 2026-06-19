param(
  [string]$Subject = "CN=Martin A. Meunier",
  [int]$Years = 3,
  [string]$ExportDirectory = "$PSScriptRoot\..\certificates",
  [switch]$TrustForCurrentUser
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $ExportDirectory | Out-Null

$cert = New-SelfSignedCertificate `
  -Type CodeSigningCert `
  -Subject $Subject `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -KeyAlgorithm RSA `
  -KeyLength 3072 `
  -HashAlgorithm SHA256 `
  -KeyUsage DigitalSignature `
  -NotAfter (Get-Date).AddYears($Years)

$password = Read-Host "Mot de passe du fichier PFX" -AsSecureString
$pfxPath = Join-Path $ExportDirectory "assistant-ai-self-signed.pfx"
$cerPath = Join-Path $ExportDirectory "assistant-ai-self-signed.cer"

Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password | Out-Null
Export-Certificate -Cert $cert -FilePath $cerPath | Out-Null

if ($TrustForCurrentUser) {
  Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\CurrentUser\Root" | Out-Null
  Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\CurrentUser\TrustedPublisher" | Out-Null
}

Write-Host ""
Write-Host "Certificat autosigne cree."
Write-Host "Sujet      : $($cert.Subject)"
Write-Host "Empreinte  : $($cert.Thumbprint)"
Write-Host "PFX        : $pfxPath"
Write-Host "CER public : $cerPath"
Write-Host ""
Write-Host "La configuration Tauri utilise le script scripts/sign-windows.ps1 pour signer avec ce certificat."
Write-Host "Gardez le fichier PFX prive. Ne le commitez pas."
