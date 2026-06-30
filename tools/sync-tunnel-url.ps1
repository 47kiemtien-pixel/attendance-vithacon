param(
    [switch]$Once
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ConfigFile = Join-Path $ProjectRoot ".env.cicd"
$StateFile = Join-Path $ProjectRoot "logs\synced-tunnel-url.txt"
$TunnelLogs = @(
    (Join-Path $ProjectRoot "logs\tunnel-out.log"),
    (Join-Path $ProjectRoot "logs\tunnel-error.log")
)

function Read-CicdConfig {
    $values = @{}
    if (Test-Path $ConfigFile) {
        Get-Content $ConfigFile | ForEach-Object {
            if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
                $values[$matches[1].Trim()] = $matches[2].Trim()
            }
        }
    }

    foreach ($key in @('VERCEL_TOKEN', 'VERCEL_PROJECT_ID', 'VERCEL_ORG_ID', 'VERCEL_DEPLOY_HOOK_URL', 'FIXED_TUNNEL_URL', 'GIT_REPOSITORY_PATH')) {
        $environmentValue = [Environment]::GetEnvironmentVariable($key)
        if (-not $values[$key] -and $environmentValue) {
            $values[$key] = $environmentValue
        }
    }

    return $values
}

function Get-TunnelCandidates {
    $candidates = @()

    foreach ($logPath in $TunnelLogs) {
        if (-not (Test-Path $logPath)) {
            continue
        }

        $log = Get-Item $logPath
        $lines = @(Get-Content $logPath -Tail 200)
        for ($index = $lines.Count - 1; $index -ge 0; $index--) {
            $matchesInLine = [regex]::Matches(
                $lines[$index],
                'https://[a-z0-9-]+\.(?:trycloudflare\.com|loca\.lt)',
                [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
            )

            foreach ($match in $matchesInLine) {
                $candidates += [pscustomobject]@{
                    Url = $match.Value.TrimEnd('/')
                    Modified = $log.LastWriteTimeUtc
                    Line = $index
                }
            }
        }
    }

    return @(
        $candidates |
            Sort-Object Modified, Line -Descending |
            Group-Object Url |
            ForEach-Object { $_.Group[0] }
    )
}

function Test-TunnelUrl([string]$Url) {
    try {
        $headers = @{}
        if ($Url -match '\.loca\.lt$') {
            $headers['bypass-tunnel-reminder'] = 'true'
        }

        $response = Invoke-WebRequest -Uri "$Url/api/auth/status" -Headers $headers `
            -UseBasicParsing -TimeoutSec 12
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Find-HealthyTunnel([string]$FixedTunnelUrl) {
    if ($FixedTunnelUrl) {
        $url = $FixedTunnelUrl.TrimEnd('/')
        if (Test-TunnelUrl $url) {
            return $url
        }
        return $null
    }

    foreach ($candidate in @(Get-TunnelCandidates)) {
        if (Test-TunnelUrl $candidate.Url) {
            return $candidate.Url
        }
    }

    return $null
}

function Sync-Vercel([hashtable]$Config, [string]$TunnelUrl) {
    $token = $Config['VERCEL_TOKEN']
    $projectId = $Config['VERCEL_PROJECT_ID']
    $orgId = $Config['VERCEL_ORG_ID']
    $deployHookUrl = $Config['VERCEL_DEPLOY_HOOK_URL']
    $gitRepositoryPath = $Config['GIT_REPOSITORY_PATH']

    if (-not $token -or -not $projectId) {
        throw "VERCEL_TOKEN and VERCEL_PROJECT_ID are required in .env.cicd."
    }

    $headers = @{
        Authorization = "Bearer $token"
        'Content-Type' = 'application/json'
    }
    $teamParam = if ($orgId) { "?teamId=$orgId" } else { "" }
    $apiBase = 'https://api.vercel.com'

    $apiUrl = "$($TunnelUrl.TrimEnd('/'))/api"
    Write-Host "Updating Vercel VITE_API_URL to $apiUrl"
    $envResponse = Invoke-RestMethod `
        -Uri "$apiBase/v9/projects/$projectId/env$teamParam" `
        -Headers $headers -Method Get

    foreach ($existing in @($envResponse.envs | Where-Object { $_.key -eq 'VITE_API_URL' })) {
        Invoke-RestMethod `
            -Uri "$apiBase/v9/projects/$projectId/env/$($existing.id)$teamParam" `
            -Headers $headers -Method Delete | Out-Null
    }

    $envBody = @{
        key = 'VITE_API_URL'
        value = $apiUrl
        type = 'plain'
        target = @('production', 'preview', 'development')
    } | ConvertTo-Json

    Invoke-RestMethod `
        -Uri "$apiBase/v9/projects/$projectId/env$teamParam" `
        -Headers $headers -Method Post -Body $envBody | Out-Null

    if ($deployHookUrl) {
        Invoke-RestMethod -Uri $deployHookUrl -Method Post | Out-Null
    } else {
        if (-not $gitRepositoryPath) {
            $gitRepositoryPath = $ProjectRoot
        }

        # Trigger the Git-connected Vercel project without checking out main or
        # modifying the runner's dirty working tree.
        & git -C $gitRepositoryPath fetch --quiet origin main
        if ($LASTEXITCODE -ne 0) { throw "git fetch origin main failed." }

        $tree = (& git -C $gitRepositoryPath rev-parse 'origin/main^{tree}').Trim()
        if ($LASTEXITCODE -ne 0 -or -not $tree) { throw "Cannot resolve origin/main tree." }

        $commit = ("ci: refresh frontend backend URL" | `
            & git -C $gitRepositoryPath commit-tree $tree -p origin/main).Trim()
        if ($LASTEXITCODE -ne 0 -or -not $commit) { throw "Cannot create deployment trigger commit." }

        & git -C $gitRepositoryPath push origin "${commit}:refs/heads/main"
        if ($LASTEXITCODE -ne 0) { throw "Cannot push deployment trigger to origin/main." }
    }

    $stateDirectory = Split-Path -Parent $StateFile
    if (-not (Test-Path $stateDirectory)) {
        New-Item -ItemType Directory -Path $stateDirectory | Out-Null
    }
    Set-Content -Path $StateFile -Value $TunnelUrl -Encoding ASCII
    Write-Host "Vercel deployment triggered successfully."
}

$config = Read-CicdConfig
$fixedTunnelUrl = $config['FIXED_TUNNEL_URL']
$lastSyncedUrl = if (Test-Path $StateFile) {
    (Get-Content $StateFile -Raw).Trim()
} else {
    $null
}

Write-Host "Watching for a healthy public backend tunnel..."

while ($true) {
    $iterationSucceeded = $true
    $tunnelUrl = $null
    try {
        $tunnelUrl = Find-HealthyTunnel $fixedTunnelUrl

        if (-not $tunnelUrl) {
            Write-Host "No healthy tunnel found; retrying in 15 seconds."
        } elseif ($tunnelUrl -eq $lastSyncedUrl) {
            Write-Host "Tunnel is healthy and already synced: $tunnelUrl"
        } else {
            Sync-Vercel $config $tunnelUrl
            $lastSyncedUrl = $tunnelUrl
        }
    } catch {
        $iterationSucceeded = $false
        Write-Error "Tunnel sync failed: $($_.Exception.Message)" -ErrorAction Continue
    }

    if ($Once) {
        if (-not $iterationSucceeded -or -not $tunnelUrl) { exit 1 }
        break
    }

    Start-Sleep -Seconds 15
}
