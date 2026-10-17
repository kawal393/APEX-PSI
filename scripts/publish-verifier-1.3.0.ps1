# Publish the free PSI verifiers, in the order that cannot leave the public face broken.
# ASCII only: Windows PowerShell 5.1 reads files without a BOM as ANSI, and non-ASCII
# characters in a script body break parsing.
#
# Why the order matters: apex-psi-verifier@1.2.0 is live on npm right now and it does NOT
# check Ed25519 signatures - a forged seal passes it. Publishing 1.3.0 without deprecating
# 1.2.0 leaves strangers installing a verifier that cannot tell them whether a receipt is
# authentic. So this script publishes, deprecates, then re-reads the registry and prints
# what it now says. Nothing here is a secret: it uses your existing npm login session and
# the PyPI credentials in your environment or ~/.pypirc.
#
# Run:     powershell -NoProfile -ExecutionPolicy Bypass -File scripts\publish-verifier-1.3.0.ps1
# Dry run: add -DryRun   (checks everything, publishes nothing)

param(
    [string]$Version = "1.3.0",
    [string]$NpmTarball = "D:\ApexEmpire\release\1.3.0\apex-psi-verifier-1.3.0.tgz",
    [string]$DistDir = "D:\ApexEmpire\release\1.3.0",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Step([string]$m) { Write-Host ""; Write-Host "=== $m ===" -ForegroundColor Cyan }
function Fail([string]$m) { Write-Host "STOP: $m" -ForegroundColor Red; exit 1 }
function Guard([string]$m) { if ($LASTEXITCODE -ne 0) { Fail "$m (exit $LASTEXITCODE)" } }

Step "Preflight"
# cmd /c is deliberate: in Windows PowerShell 5.1, redirecting a native command's stderr
# inside the session turns every warning into a terminating error when
# $ErrorActionPreference is Stop, which would abort this script before its own message.
$npmUser = (cmd /c "npm whoami 2>&1") | Select-Object -Last 1
$npmRc = $LASTEXITCODE
if ($npmRc -ne 0) {
    Fail "npm is not logged in on this machine (it said: $npmUser). Run 'npm login' with the account that owns apex-psi-verifier, then re-run this script."
}
Write-Host "npm logged in as: $npmUser"

$artifacts = @(
    $NpmTarball,
    (Join-Path $DistDir "psi_verifier-$Version.tar.gz"),
    (Join-Path $DistDir "psi_verifier-$Version-py3-none-any.whl")
)
foreach ($f in $artifacts) {
    if (-not (Test-Path $f)) {
        Fail "missing artifact: $f. Build first: npm run build; npm pack in packages\psi-verifier, and python -m build in packages\psi-verifier-py."
    }
}
Get-ChildItem $DistDir -File | ForEach-Object {
    $h = (Get-FileHash -Algorithm SHA256 $_.FullName).Hash.Substring(0, 16)
    Write-Host ("  {0}  {1} bytes  sha256={2}" -f $_.Name, $_.Length, $h)
}

$existing = (cmd /c "npm view apex-psi-verifier@$Version version 2>&1") | Select-Object -Last 1
if ($existing -match [regex]::Escape($Version)) {
    Write-Host "npm already serves $Version - publish step will be skipped"
    $skipNpm = $true
} else {
    Write-Host "npm does not serve $Version yet (registry said: $existing)"
    $skipNpm = $false
}

if ($DryRun) { Step "Dry run - stopping here, nothing was published"; exit 0 }

if (-not $skipNpm) {
    Step "Publish $Version to npm from the verified tarball"
    npm publish $NpmTarball --access public
    Guard "npm publish failed"
}

Step "Deprecate every release before $Version"
# The message is the point of this step: anyone installing the old version must be told
# out loud that it cannot authenticate a seal.
npm deprecate "apex-psi-verifier@<$Version" "Does not verify the Ed25519 signature (rule R11): a forged seal passes it. Install $Version or later."
Guard "npm deprecate failed"

Step "Publish to PyPI"
python -m pip show twine *> $null
if ($LASTEXITCODE -ne 0) { python -m pip install --quiet twine }
python -m twine upload --repository pypi (Join-Path $DistDir "psi_verifier-$Version.tar.gz") (Join-Path $DistDir "psi_verifier-$Version-py3-none-any.whl")
Guard "twine upload failed (are TWINE_USERNAME / TWINE_PASSWORD set, or ~/.pypirc configured?)"

Step "Re-read the registries - what a stranger gets now"
npm view "apex-psi-verifier@$Version" version license
Guard "npm cannot resolve $Version after publish"
Write-Host "deprecated notice on 1.2.0:"
npm view "apex-psi-verifier@1.2.0" deprecated
Write-Host ""
Write-Host "PyPI check (public, no auth):"
try {
    $r = Invoke-WebRequest -Uri "https://pypi.org/pypi/psi-verifier/json" -UseBasicParsing -TimeoutSec 30
    $j = $r.Content | ConvertFrom-Json
    Write-Host ("  psi-verifier latest on PyPI: " + $j.info.version)
    Write-Host ("  releases: " + (($j.releases.PSObject.Properties.Name) -join ", "))
} catch {
    Write-Host "  PyPI still does not serve psi-verifier: $($_.Exception.Message)" -ForegroundColor Yellow
}

Step "Done"
Write-Host "npm and PyPI publishes are public and irreversible. Keep the printed output above with the release record."
