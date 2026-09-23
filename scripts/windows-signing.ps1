#!/usr/bin/env pwsh
<#
    windows-signing.ps1

    Authenticode signing / verification helper for OneType Windows builds. It
    is invoked in two modes:

      Sign    - called once per file by Tauri's `bundle.windows.signCommand`
                (the `%1` placeholder is the file to sign). WHEN a CA-issued
                code-signing certificate is configured:

                  WINDOWS_CERTIFICATE          base64 PKCS#12 (.pfx)
                  WINDOWS_CERTIFICATE_PASSWORD password for the PFX

                the file is Authenticode-signed with `signtool` (SHA-256
                digest + RFC 3161 timestamp) and re-verified. When the
                certificate is NOT configured the file is SKIPPED (exit 0) with
                an explicit "unsigned" notice, so plain local `pnpm tauri
                build` runs and open-source CI builds stay unsigned and
                unblocked. Windows signing is OPTIONAL; it is never a hard
                requirement for an open-source release.

      Verify  - run after `tauri build` to report the REAL signing status of a
                file and to print safe release diagnostics. If the file is
                Authenticode-signed it is verified strictly (valid signature,
                trusted chain, embedded publisher, SHA-256 digest, RFC 3161
                timestamp). If the file is unsigned, an explicit "unsigned"
                status is reported and the script exits 0 UNLESS -RequireSigned
                was passed (then it fails, so CI can hard-verify the "signed"
                mode). The script never claims an unsigned file is signed.

    Environment variables (never commit certificates, passwords or tokens):

      WINDOWS_CERTIFICATE          base64-encoded PKCS#12 (.pfx) containing a
                                   CA-issued code-signing certificate + private
                                   key. If unset, Sign skips the file (unsigned
                                   build with a clear notice); Verify of an
                                   unsigned file reports 'unsigned'.
      WINDOWS_CERTIFICATE_PASSWORD password for the PFX
      WINDOWS_TIMESTAMP_URL        (optional) RFC 3161 timestamp server,
                                   defaults to http://timestamp.digicert.com
      WINDOWS_SIGN_DESCRIPTION     (optional) description stamped into the signed
                                   file (the /d value). Defaults to the product
                                   string below. The *publisher* shown by Windows
                                   always comes from the certificate subject, not
                                   from this string.
      WINDOWS_EXPECTED_PUBLISHER   (optional) expected publisher name that MUST
                                   appear in the signing certificate subject of
                                   every signed artifact (or pass
                                   -ExpectedPublisher). The release workflow sets
                                   it from the WINDOWS_EXPECTED_PUBLISHER
                                   repository variable and independently enforces
                                   one consistent publisher across all artifacts.
      TAURI_WINDOWS_SIGNTOOL_PATH  (optional) explicit path to signtool.exe;
                                   otherwise it is located from the Windows SDK

    Usage:
      powershell scripts/windows-signing.ps1 -Action Sign   -File <path>   # tauri signCommand
      pwsh scripts/windows-signing.ps1 -Action Verify -File <path>          # unsigned → clears, signed → strict verify
      pwsh scripts/windows-signing.ps1 -Action Verify -File <path> -RequireSigned -ExpectedPublisher "Acme Corp"

    Exit codes:
      0 - success. For Sign with no certificate this is an explicit "unsigned"
          (the build continues honestly unblocked). For Verify of an unsigned
          file without -RequireSigned, also 0 (the status is reported).
      1 - any real failure: signing was configured but failed, verification
          failed, a signed file was required but missing, etc.

    No secrets (PFX contents, passwords, tokens) are ever written to the log.

    SmartScreen note: a correctly signed installer lets Windows identify the
    publisher from the embedded certificate (no more "Unknown publisher"). It
    does NOT grant an instant reputation score: even a freshly signed, trusted
    OV/EV certificate can still show "Windows protected your PC" /
    "Microsoft Defender SmartScreen prevented an unrecognized app from
    starting" until SmartScreen reputation accumulates through consistent
    releases and real downloads. That is expected behavior, not a signing
    defect; do not recommend disabling SmartScreen or Defender as a
    workaround. There is no free configuration that makes SmartScreen warnings
    disappear immediately for a brand-new identity.
#>

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Sign', 'Verify')]
  [string]$Action,

  [Parameter(Mandatory = $true)]
  [string]$File,

  # Optional expected publisher: a human/company name that MUST appear in the
  # signing certificate subject of every signed file (case-insensitive
  # substring match). Defaults to the WINDOWS_EXPECTED_PUBLISHER env var; when
  # empty the check is skipped (the release workflow still enforces a
  # consistent publisher across all artifacts independently). This is how CI
  # fails on an "unexpected publisher" - e.g. a wrong certificate accidentally
  # configured in the secrets.
  [string]$ExpectedPublisher = $env:WINDOWS_EXPECTED_PUBLISHER,

  # When set (CI signed-mode verification), Verify FAILS if the file is not
  # Authenticode-signed. When unset, Verify reports the real status and exits 0
  # for an unsigned file (honest open-source release support).
  [switch]$RequireSigned
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
  if ($ExpectedPublisher) {
    $subject = [string]$sig.SignerCertificate.Subject
    if ($subject -notmatch [regex]::Escape($ExpectedPublisher)) {
      Write-Fail "unexpected publisher on '$Path': certificate subject '$subject' does not contain the expected publisher '$ExpectedPublisher'."
    }
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
  $certPassword = [string]$env:WINDOWS_CERTIFICATE_PASSWORD
  if ([string]::IsNullOrWhiteSpace($certB64) -or [string]::IsNullOrWhiteSpace($certPassword)) {
    Write-Host "[windows-signing] UNSIGNED: WINDOWS_CERTIFICATE / WINDOWS_CERTIFICATE_PASSWORD are not set - SKIPPING Authenticode signing for $resolved."
    Write-Host "[windows-signing] This Windows artifact is UNSIGNED. Windows/Edge may show 'Unknown publisher' and SmartScreen may warn on first launch."
    Write-Host "::notice::SIGNING_STATUS=unsigned"
    exit 0
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

    # The description/URL fields are stamped into the signature and surface in
    # Windows file properties and install prompts as publication metadata. The
    # publisher *name* itself always comes from the certificate subject.
    $signDescription = if ($env:WINDOWS_SIGN_DESCRIPTION) {
      $env:WINDOWS_SIGN_DESCRIPTION
    } else {
      'OneType - English and Myanmar typing tutor for students and classrooms'
    }

    $signArgs = @(
      'sign',
      '/f', $pfxPath,
      '/p', $certPassword,
      '/fd', 'SHA256',
      '/tr', $timestampUrl,
      '/td', 'SHA256',
      '/d', $signDescription,
      '/du', 'https://github.com/aungpwint/onetype',
      $resolved
    )
    & $signtool @signArgs
    if ($LASTEXITCODE -ne 0) {
      Write-Fail "signtool sign failed for '$resolved' (exit code $LASTEXITCODE)."
    }

    # Re-verify the freshly signed file before the build continues.
    $null = Assert-Signed $resolved
    Write-Host "::notice::SIGNING_STATUS=signed"
    Write-Host "[windows-signing] signed and verified OK: $resolved"
  } finally {
    Remove-Item -LiteralPath $pfxPath -Force -ErrorAction SilentlyContinue
  }
}
else {
  $sig = Get-AuthenticodeSignature -FilePath $resolved
  $isSigned = ($sig.Status -ne 'NotSigned') -and ($null -ne $sig.SignerCertificate)

  if (-not $isSigned -and $RequireSigned) {
    Write-Fail "signature verification was REQUIRED (-RequireSigned) but '$resolved' is UNSIGNED."
  }

  if (-not $isSigned) {
    Write-Host "--- Windows Authenticode signature diagnostics: $resolved"
    Write-Host "  Status:              unsigned (no Authenticode signature present)"
    Write-Host "::notice::SIGNING_STATUS=unsigned"
    Write-Host "--- UNSIGNED artifact: $resolved"
    exit 0
  }

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
  Write-Host "::notice::SIGNING_STATUS=signed"
  Write-Host "--- verified OK: $resolved"
}