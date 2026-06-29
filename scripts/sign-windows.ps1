param(
  [Parameter(Mandatory = $true)]
  [string]$File,
  [string]$Subject = "CN=Martin A. Meunier"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $File)) {
  throw "Fichier introuvable a signer : $File"
}

$cert = Get-ChildItem "Cert:\CurrentUser\My" |
  Where-Object { $_.Subject -eq $Subject -and $_.HasPrivateKey } |
  Sort-Object NotAfter -Descending |
  Select-Object -First 1

if (-not $cert) {
  Write-Warning "Aucun certificat de signature trouve pour '$Subject'. Fichier laisse non signe : $File"
  exit 0
}

$windowsKits = Join-Path ${env:ProgramFiles(x86)} "Windows Kits\10\bin"
$signtool = Get-ChildItem -Path $windowsKits -Filter "signtool.exe" -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -match "\\x64\\signtool\.exe$" } |
  Sort-Object FullName -Descending |
  Select-Object -First 1

if (-not $signtool) {
  Write-Warning "signtool.exe est introuvable. Fichier laisse non signe : $File"
  exit 0
}

& $signtool.FullName sign `
  /fd SHA256 `
  /sha1 $cert.Thumbprint `
  /tr "http://timestamp.digicert.com" `
  /td SHA256 `
  $File

if ($LASTEXITCODE -ne 0) {
  throw "La signature Windows a echoue pour : $File"
}
