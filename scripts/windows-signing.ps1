#!/usr/bin/env pwsh
<#
    windows-signing.ps1

    Authenticode signing / verification helper for OneType Windows production
    builds. It is invoked in two modes:

      Sign    - called once per file by Tauri's `bundle.windows.signCommand`
                (the `%1` placeholder is the file to sign). Decodes the base64
                PFX from the WINDOWS_CERTIFICATE env var, imports it into the
                CurrentUser\My certificate store, and signs the file with
                `signtool sign` (SHA-256 digest, RFC 3161 timestamp), then
                verifies the result before returning.
      Verify  - run after `tauri build` completes to check that a file carries
                a valid, chain-trusted, SHA-256, RFC 3161 timestamped
                Authenticode signature and to print safe release diagnostics
                (publisher / issuer / expiry / thumbprint).

    Environment variables (never commit certificates or passwords to the repo):

      WINDOWS_CERTIFICATE          base64-encoded PKCS#12 (.pfx) containing the
                                   CA-issued code-signing certificate + private key
      WINDOWS_CERTIFICATE_PASSWORD password for the PFX
      WINDOWS_TIMESTAMP_URL        (optional) RFC 3161 timestamp server, defaults
                                   to http://timestamp.digicert.com
      TAURI_WINDOWS_SIGNTOOL_PATH  (optional) explicit path to signtool.exe;
                                   otherwise it is located from the Windows SDK

    Usage:
      pwsh scripts/windows-signing.ps1 -Action Sign   -File <path>   # tauri signCommand
      pwsh scripts/windows-signing.ps1 -Action Verify -File <path>   # CI / manual verification

    Exits non-zero on any failure so an unsigned/broken artifact fails the build.
    No secrets (PFX contents or password) are ever written to the log.
#>

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Sign', 'Verify')]
  [string]$Action,

  [Parameter(Mandatory = $true)]
  [string]$File
)

$ErrorActionPreference = 'Stop'

function Write-Fail([string]$Message) {
  Write-Host "[windows-signing] ERROR: $Message" -ForegroundColor Red
  exit 1
}

function Get-SigntoolPath {
  if ($env:TAURI_WINDOWS_SIGNTOOL_PATH -and (Test-Path -LiteralPath $env:TAURI_WINDOWS_SIGNTOOL_PATH)) {
    return $env:TAURI_WINDOWS_SIGNTOOL_PATH
  }

  # Prefer the newest installed Windows SDK kit.
  $kitsRoot = $null
  try {
    $kitsRoot = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows Kits\Installed Roots' -Name 'KitsRoot10' -ErrorAction Stop).KitsRoot10
  } catch { }
  if ($kitsRoot -and (Test-Path -LiteralPath $kitsRoot)) {
    $binRoot = Join-Path $kitsRoot 'bin'
    if (Test-Path -LiteralPath $binRoot) {
      foreach ($ver in Get-ChildItem -LiteralPath $binRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^10\.' } | Sort-Object { [version]$_.Name } -Descending) {
        $candidate = Join-Path $ver.FullName 'x64\signtool.exe'
        if (Test-Path -LiteralPath $candidate) { return $candidate }
      }
    }
  }

  foreach ($base in @('C:\Program Files (x86)\Windows Kits\10\bin', 'C:\Program Files\Windows Kits\10\bin')) {
    if (Test-Path -LiteralPath $base) {
      $found = Get-ChildItem -LiteralPath $base -Recurse -Filter 'signtool.exe' -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match '\\x64\\signtool\.exe$' } |
        Sort-Object FullName -Descending | Select-Object -First 1
      if ($found) { return $found.FullName }
    }
  }

  $cmd = Get-Command signtool -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  return $null
}

function Assert-Signed([string]$Path) {
  $signtool = Get-SigntoolPath
  if (-not $signtool) {
    Write-Fail "signtool.exe not found. Install the Windows SDK or set TAURI_WINDOWS_SIGNTOOL_PATH."
  }

  # Chain + Authenticode policy verification. Exit code 0 means the signature
  # is cryptographically valid, the chain builds to a trusted root and the
  # certificate is still valid for the signature date.
  $verifyOut = $null
  $verifyExit = 0
  $previousErrorPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue' # keep stderr from becoming a terminating error
  try {
    $verifyOut = & $signtool verify /pa /v $Path 2>&1
  } finally {
    $ErrorActionPreference = $previousErrorPreference
  }
  $verifyExit = $LASTEXITCODE
  if ($verifyExit -ne 0) {
    foreach ($line in $verifyOut) { Write-Host "  [signtool] $line" }
    Write-Fail "signtool verify /pa /v failed for '$Path' (exit code $verifyExit) - signature not valid or chain not trusted."
  }

  $sig = Get-AuthenticodeSignature -FilePath $Path
  if ($sig.Status -ne 'Valid') {
    Write-Fail "Get-AuthenticodeSignature status is '$($sig.Status)' for '$Path' (expected 'Valid')."
  }
  if (-not $sig.SignerCertificate) {
    Write-Fail "no signer certificate found in '$Path'."
  }
  if (-not $sig.TimeStamperCertificate) {
    Write-Fail "signature on '$Path' is NOT timestamped - an RFC 3161 timestamp is required."
  }

  # Confirm the digest algorithm is SHA-256 when signtool reports it
  # (SDK versions vary between "Digest algorithm:" and "Hash algorithm:").
  $joinedOut = $verifyOut -join "`n"
  $algMatch = [regex]::Match($joinedOut, '(?im)^\s*(?:digest|hash) algorithm\s*:\s*(?<alg>.+)$')
  if ($algMatch.Success -and $algMatch.Groups['alg'].Value -notmatch 'sha.?256') {
    Write-Fail "signature on '$Path' uses digest algorithm '$($algMatch.Groups['alg'].Value.Trim())' - SHA-256 required."
  }

  return $sig
}

$resolved = $null
try {
  $resolved = (Resolve-Path -LiteralPath $File -ErrorAction Stop).Path
} catch {
  Write-Fail "file not found: $File"
}
if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) {
  Write-Fail "not a file: $resolved"
}

if ($Action -eq 'Sign') {
  $certB64 = [string]$env:WINDOWS_CERTIFICATE
  if ([string]::IsNullOrWhiteSpace($certB64)) {
    Write-Fail "production signing requires the WINDOWS_CERTIFICATE env var (base64 PFX of a CA-issued code-signing certificate). Set it on this machine (see RELEASE.md section 7) - refusing to produce an unsigned production build."
  }
  $certPassword = [string]$env:WINDOWS_CERTIFICATE_PASSWORD
  if ([string]::IsNullOrWhiteSpace($certPassword)) {
    Write-Fail "production signing requires the WINDOWS_CERTIFICATE_PASSWORD env var. Set it on this machine (see RELEASE.md section 7)."
  }

  $pfxPath = Join-Path $env:TEMP ("onetype-signing-" + [guid]::NewGuid().ToString('N') + '.pfx')
  try {
    try {
      [System.IO.File]::WriteAllBytes($pfxPath, [System.Convert]::FromBase64String($certB64))
    } catch {
      Write-Fail "WINDOWS_CERTIFICATE is not valid base64 for a PFX (expected a base64-encoded .pfx, see RELEASE.md section 7)."
    }

    $securePassword = ConvertTo-SecureString -String $certPassword -AsPlainText -Force
    $imported = $null
    try {
      $imported = Import-PfxCertificate -FilePath $pfxPath -CertStoreLocation 'Cert:\CurrentUser\My' -Password $securePassword -Exportable:$false
    } catch {
      Write-Fail "failed to import PFX into the CurrentUser\My store (bad password or invalid container): $($_.Exception.Message)"
    }
    Write-Host "[windows-signing] PFX imported OK - thumbprint $($imported.Thumbprint), subject '$($imported.Subject)'. Signing $resolved"

    $signtool = Get-SigntoolPath
    if (-not $signtool) {
      Write-Fail "signtool.exe not found. Install the Windows SDK or set TAURI_WINDOWS_SIGNTOOL_PATH."
    }

    $timestampUrl = 'http://timestamp.digicert.com'
    if ($env:WINDOWS_TIMESTAMP_URL) { $timestampUrl = $env:WINDOWS_TIMESTAMP_URL }

    $signArgs = @(
      'sign',
      '/f', $pfxPath,
      '/p', $certPassword,
      '/fd', 'SHA256',
      '/tr', $timestampUrl,
      '/td', 'SHA256',
      '/d', 'OneType',
      '/du', 'https://github.com/aungpwint/onetype',
      $resolved
    )
    & $signtool @signArgs
    if ($LASTEXITCODE -ne 0) {
      Write-Fail "signtool sign failed for '$resolved' (exit code $LASTEXITCODE)."
    }

    # Re-verify the freshly signed file before the build continues.
    $null = Assert-Signed $resolved
    Write-Host "[windows-signing] signed and verified OK: $resolved"
  } finally {
    Remove-Item -LiteralPath $pfxPath -Force -ErrorAction SilentlyContinue
  }
}
else {
  $sig = Assert-Signed $resolved
  $cert = $sig.SignerCertificate
  $stamp = $sig.TimeStamperCertificate

  Write-Host "--- Windows Authenticode signature diagnostics: $resolved"
  Write-Host "  Status:              $($sig.Status)"
  Write-Host "  Publisher (subject): $($cert.Subject)"
  Write-Host "  Issuer:              $($cert.Issuer)"
  Write-Host "  Cert thumbprint:     $($cert.Thumbprint)"
  Write-Host "  Cert validity:       $($cert.NotBefore.ToString('yyyy-MM-dd'))  to  $($cert.NotAfter.ToString('yyyy-MM-dd'))"
  Write-Host "  Digest algorithm:    SHA-256"
  Write-Host "  Timestamp:           $($stamp.Subject)"
  Write-Host "--- verified OK: $resolved"
}