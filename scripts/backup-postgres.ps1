param(
    [string]$BackupDirectory = (Join-Path $env:USERPROFILE 'attendance-vithacon-backups'),
    [int]$RetentionDays = 30
)

$ErrorActionPreference = 'Stop'
$containerName = 'attendance-postgres'
$productionRoot = Join-Path $env:USERPROFILE 'attendance-vithacon-production'
$environmentFile = Join-Path $productionRoot '.env'

function Read-EnvironmentFile([string]$Path) {
    $values = @{}
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Production environment file not found: $Path"
    }

    Get-Content -LiteralPath $Path | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $values[$matches[1].Trim()] = $matches[2].Trim()
        }
    }
    return $values
}

$config = Read-EnvironmentFile $environmentFile
$database = $config['PGDATABASE']
$user = $config['PGUSER']
if (-not $database -or -not $user) {
    throw 'PGDATABASE and PGUSER are required in the production environment file.'
}

$running = docker inspect --format '{{.State.Running}}' $containerName 2>$null
if ($LASTEXITCODE -ne 0 -or $running -ne 'true') {
    throw "PostgreSQL container is not running: $containerName"
}

New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$fileName = "attendance-$timestamp.dump"
$containerFile = "/tmp/$fileName"
$destination = Join-Path $BackupDirectory $fileName

try {
    docker exec $containerName pg_dump -U $user -d $database -Fc -f $containerFile
    if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed.' }

    docker exec $containerName pg_restore --list $containerFile | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Backup verification failed.' }

    docker cp "${containerName}:$containerFile" $destination | Out-Null
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $destination)) {
        throw 'Could not copy the verified backup from the PostgreSQL container.'
    }

    $backup = Get-Item -LiteralPath $destination
    if ($backup.Length -le 0) { throw 'Backup file is empty.' }

    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem -LiteralPath $BackupDirectory -Filter 'attendance-*.dump' -File |
        Where-Object { $_.LastWriteTime -lt $cutoff } |
        Remove-Item -Force

    Write-Output "Backup completed: $($backup.FullName) ($($backup.Length) bytes)"
} finally {
    docker exec $containerName rm -f $containerFile 2>$null | Out-Null
}
