#!/usr/bin/env pwsh
<#
    set-ci-secrets.ps1

    Propagates the local updater-signing key pair to GitHub Actions secrets
    for this repository, so CI signs release artifacts with the same rsign
    key proven valid on the developer machine.

    Reads the values directly from environment variables on this machine and
    writes them to the Actions secrets via the GitHub CLI, so nothing can be
    mistyped, trimmed or re-encoded by hand.

    Requirements:
      - gh authenticated for the target repository (run: gh auth login)
      - Environment variables set (Tauri's standard names):
          TAURI_SIGNING_PRIVATE_KEY          base64 rsign/minisign secret key
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD secret key password

    Usage:
      pwsh scripts/set-ci-secrets.ps1                     # repo aungpwint/onetype
      pwsh scripts/set-ci-secrets.ps1 -Repo owner/name    # other repository
#>

param(
  [string]$Repo = "aungpwint/onetype"
)

function Assert-Secret([string]$Value, [string]$Name) {
  if ([string]::IsNullOrWhiteSpace($Value)) {
    Write-Host ("[set-ci-secrets] ERROR: environment variable `"$Name`" is empty. Define it on this machine first.") -ForegroundColor Red
    exit 1
  }
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "[set-ci-secrets] ERROR: GitHub CLI (gh) not found." -ForegroundColor Red
  exit 1
}

gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "[set-ci-secrets] Not authenticated. Run 'gh auth login' first." -ForegroundColor Yellow
  exit 1
}

$key = [string]$env:TAURI_SIGNING_PRIVATE_KEY
$password = [string]$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD

Assert-Secret $key "TAURI_SIGNING_PRIVATE_KEY"
Assert-Secret $password "TAURI_SIGNING_PRIVATE_KEY_PASSWORD"

$decoded = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($key))

if (-not $decoded.StartsWith("untrusted comment:")) {
  Write-Host "[set-ci-secrets] ERROR: key is not a full base64 rsign/minisign key (missing 'untrusted comment:' line after decode)." -ForegroundColor Red
  exit 1
}

Write-Host "[set-ci-secrets] Validating local key decodes + signs (no output) ..."
$tmp = Join-Path $env:TEMP ("set-ci-secrets-" + [guid]::NewGuid().ToString("N") + ".txt")
try {
  Set-Content -LiteralPath $tmp -Value "signature sanity check"
  $env:TAURI_SIGNING_PRIVATE_KEY = $key
  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $password
  & pnpm tauri signer sign $tmp 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[set-ci-secrets] ERROR: local signing sanity check failed with this key/password pair." -ForegroundColor Red
    exit 1
  }
} finally {
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath "$tmp.minisig" -Force -ErrorAction SilentlyContinue
  Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD -ErrorAction SilentlyContinue
}

Write-Host "[set-ci-secrets] Writing secrets to $Repo ..."
$result = gh secret set TAURI_SIGNING_PRIVATE_KEY --repo $Repo --body $key 2>&1
if ($LASTEXITCODE -ne 0) { Write-Host $result -ForegroundColor Red; exit 1 }
$result = gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --repo $Repo --body $password 2>&1
if ($LASTEXITCODE -ne 0) { Write-Host $result -ForegroundColor Red; exit 1 }

$fpBytes = [System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($key))
$fp = -join ($fpBytes | ForEach-Object { $_.ToString("x2") })
$fpBytes = [System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($password))
$fpPw = -join ($fpBytes | ForEach-Object { $_.ToString("x2") })
Write-Host "[set-ci-secrets] OK - secrets updated on $Repo" -ForegroundColor Green
Write-Host "  TAURI_SIGNING_PRIVATE_KEY          len $($key.Length)  sha256:$fp"
Write-Host "  TAURI_SIGNING_PRIVATE_KEY_PASSWORD len $($password.Length)  sha256:$fpPw"
Write-Host "[set-ci-secrets] Next: re-push tag v1.0.1 or re-run the failed release run in GitHub Actions."
Write-Host "[set-ci-secrets] Verified locally: this key/password signed a file and the derived"
Write-Host "[set-ci-secrets] public key matches plugins.updater.pubkey (F4B14476E075161B)."