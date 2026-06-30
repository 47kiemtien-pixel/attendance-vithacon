param(
    [Parameter(Mandatory = $true)] [string]$VercelToken,
    [Parameter(Mandatory = $true)] [string]$VercelProjectId,
    [Parameter(Mandatory = $true)] [string]$VercelOrgId,
    [string]$GitHubRunnerToken
)

$ErrorActionPreference = 'Stop'
$SourceRoot = $PSScriptRoot
$DeployRoot = Join-Path $env:USERPROFILE 'attendance-vithacon-production'
$DataRoot = Join-Path $env:USERPROFILE 'attendance-vithacon-data'
$RunnerRoot = Join-Path $env:USERPROFILE 'attendance-github-runner'

New-Item -ItemType Directory -Path $DeployRoot, $DataRoot -Force | Out-Null

# Seed persistent data once. Deploys never mirror or delete this directory.
Get-ChildItem (Join-Path $SourceRoot 'server\data') -File -ErrorAction SilentlyContinue | ForEach-Object {
    $destination = Join-Path $DataRoot $_.Name
    if (-not (Test-Path $destination)) {
        Copy-Item $_.FullName $destination
    }
}

$excludedDirectories = @(
    '.git', 'node_modules', 'client\node_modules', 'server\node_modules',
    'server\data', 'logs', 'release', 'build', 'dist', '.tmp',
    '.vercel', 'client\.vercel', '_github_runner'
)
$robocopyArgs = @($SourceRoot, $DeployRoot, '/MIR', '/R:2', '/W:2', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/XF', '.env', '.env.cicd')
$robocopyArgs += '/XD'
$robocopyArgs += $excludedDirectories | ForEach-Object { Join-Path $SourceRoot $_ }
& robocopy @robocopyArgs | Out-Null
if ($LASTEXITCODE -gt 7) { throw "Robocopy failed with exit code $LASTEXITCODE" }

$deployDataPath = Join-Path $DeployRoot 'server\data'
if (-not (Test-Path $deployDataPath)) {
    New-Item -ItemType Junction -Path $deployDataPath -Target $DataRoot | Out-Null
}

$config = @"
# Local CI/CD credentials. Never commit this file.
VERCEL_TOKEN=$VercelToken
VERCEL_PROJECT_ID=$VercelProjectId
VERCEL_ORG_ID=$VercelOrgId
VERCEL_DEPLOY_HOOK_URL=
FIXED_TUNNEL_URL=
GIT_REPOSITORY_PATH=$SourceRoot
"@
Set-Content -Path (Join-Path $DeployRoot '.env.cicd') -Value $config -Encoding UTF8

Push-Location $DeployRoot
try {
    npm.cmd ci
    npm.cmd --prefix client ci
    New-Item -ItemType Directory -Path 'logs' -Force | Out-Null
} finally {
    Pop-Location
}

if ($GitHubRunnerToken) {
    New-Item -ItemType Directory -Path $RunnerRoot -Force | Out-Null
    if (-not (Test-Path (Join-Path $RunnerRoot 'config.cmd'))) {
        $release = Invoke-RestMethod 'https://api.github.com/repos/actions/runner/releases/latest'
        $asset = $release.assets | Where-Object { $_.name -match '^actions-runner-win-x64-.*\.zip$' } | Select-Object -First 1
        if (-not $asset) { throw 'Cannot find the Windows x64 GitHub runner package.' }
        $archive = Join-Path $env:TEMP $asset.name
        Invoke-WebRequest $asset.browser_download_url -OutFile $archive
        Expand-Archive $archive -DestinationPath $RunnerRoot -Force
        Remove-Item $archive -Force
    }

    Push-Location $RunnerRoot
    try {
        & .\config.cmd --unattended --replace `
            --url 'https://github.com/47kiemtien-pixel/attendance-vithacon' `
            --token $GitHubRunnerToken `
            --name "attendance-$env:COMPUTERNAME" `
            --labels 'attendance-local' `
            --work '_work'
        if ($LASTEXITCODE -ne 0) { throw 'GitHub runner registration failed.' }
    } finally {
        Pop-Location
    }
}

pm2.cmd start (Join-Path $DeployRoot 'ecosystem.config.cjs')
pm2.cmd save
Write-Host "Attendance production runtime is ready at $DeployRoot"
Write-Host "Persistent data directory: $DataRoot"
