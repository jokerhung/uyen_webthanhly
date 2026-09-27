# Full single-node MinIO volume snapshot and isolated restore; never writes to the live volume or service.
# Usage: pwsh -NoProfile -File docker/minio/minio-volume-restore-drill.ps1
# Snapshot execution requires -ConfirmedNoMinioWrites after an operator-coordinated
# maintenance/write freeze. Without it, the script only validates preflight.
# Never stop the live MinIO container; ensure all app/migration/cleanup/console
# writers are quiescent and MinIO remains healthy for the entire snapshot.
# Requires Docker, locally available alpine:3.22/node:22-alpine, checked-in manifest and ignored .private credential files.
[CmdletBinding()]
param(
  [string]$Manifest = '.private/minio-local-apply-manifest.json',
  [switch]$ConfirmedNoMinioWrites
)
# A read-only mount prevents this script writing the source, but does not make an
# actively changing MinIO filesystem consistent. Require an operator-confirmed
# write freeze before reading any volume bytes; do not stop the running server.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Set-Location $root
$liveVolume = 'webkygui_minio_data'
$liveContainer = 'webkygui-minio-1'
$bucket = 'besties-media'
$manifestPath = (Resolve-Path $Manifest).Path
$manifestJson = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($manifestJson.version -ne 1 -or $manifestJson.bucket -ne $bucket -or $manifestJson.items.Count -ne 4) { throw 'Expected the reviewed four-product verified manifest' }
foreach ($item in $manifestJson.items) {
  if ($item.key -cnotmatch '^[a-f0-9]{64}\.webp$' -or $item.sha256 -cnotmatch '^[a-f0-9]{64}$' -or $item.status -notin @('verified-existing','copied-verified')) { throw 'Manifest has a non-verified or invalid entry' }
}
if (-not $manifestPath.StartsWith((Join-Path $root '.private') + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Manifest must reside inside ignored .private' }
$composeSecrets = Join-Path $root '.private/minio-compose-local.env'
$appSecrets = Join-Path $root '.private/minio-app-local.env'
if (-not (Test-Path $composeSecrets) -or -not (Test-Path $appSecrets)) { throw 'Ignored .private credential files are required' }
$actual = @(docker volume inspect $liveVolume --format '{{.Name}}')
if ($LASTEXITCODE -ne 0 -or $actual.Count -ne 1 -or $actual[0] -cne $liveVolume) { throw 'Exact live volume not found; refusing to proceed' }
$live = docker inspect $liveContainer | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $live.Count -ne 1 -or -not $live[0].State.Running -or $live[0].State.Health.Status -ne 'healthy') { throw 'Expected healthy live Compose container missing' }
if (@($live[0].Mounts | Where-Object { $_.Name -ceq $liveVolume -and $_.Destination -ceq '/data' }).Count -ne 1) { throw 'Live MinIO /data is not the expected volume' }
if (-not $ConfirmedNoMinioWrites) {
  Write-Host 'DRY RUN ONLY: healthy live MinIO and exact source volume inspected. No mount, snapshot, disposable Docker resource, or live mutation performed.'
  Write-Host 'Operator must coordinate a maintenance/write freeze of every MinIO client and confirm the server stays healthy throughout the snapshot; rerun with -ConfirmedNoMinioWrites only then.'
  return
}
$serverImage = $live[0].Image # Exact locally installed image ID, not a mutable tag.
foreach ($image in @($serverImage, 'alpine:3.22', 'node:22-alpine')) {
  docker image inspect $image --format '{{.Id}}' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Required local image unavailable; no automatic pull' }
}
$tarImage = docker image inspect alpine:3.22 --format '{{.Id}}'
$nodeImage = docker image inspect node:22-alpine --format '{{.Id}}'
$runId = [guid]::NewGuid().ToString('N').Substring(0, 16)
$runDir = Join-Path $root ".private/minio-volume-drill-$runId"
New-Item -ItemType Directory -Path $runDir -ErrorAction Stop | Out-Null
$network = "drill-$runId"
$volume = "drill-$runId"
$server = "drill-$runId"
$networkMade = $false
$volumeMade = $false
$serverMade = $false
try {
  # Docker readonly mount is the only attachment to the live source; never stop/restart/exec the live service.
  docker run --rm --network none --mount "type=volume,source=$liveVolume,destination=/data,readonly" --mount "type=bind,source=$runDir,destination=/backup" $tarImage tar -C /data -cf /backup/snapshot.tar . | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Read-only source snapshot failed' }
  $archive = Join-Path $runDir 'snapshot.tar'
  if (-not (Test-Path $archive) -or (Get-Item $archive).Length -le 0) { throw 'Snapshot archive is empty' }
  $archiveSha256 = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
  $postSnapshot = docker inspect $liveContainer --format '{{.State.Health.Status}}'
  if ($LASTEXITCODE -ne 0 -or $postSnapshot -ne 'healthy') { throw 'Live MinIO lost health during snapshot; archive consistency unproven' }
  docker network create --internal $network | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Disposable internal network creation failed' }
  $networkMade = $true
  docker volume create $volume | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Disposable volume creation failed' }
  $volumeMade = $true
  docker run --rm --network none --mount "type=volume,source=$volume,destination=/data" --mount "type=bind,source=$runDir,destination=/backup,readonly" $tarImage tar -C /data -xf /backup/snapshot.tar | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Disposable volume restore failed' }
  docker run --detach --network $network --name $server --mount "type=volume,source=$volume,destination=/data" --env-file $composeSecrets $serverImage server /data --console-address :9001 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Disposable restored MinIO failed to start' }
  $serverMade = $true
  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    $health = docker inspect $server --format '{{.State.Health.Status}}'
    if ($LASTEXITCODE -ne 0) { throw 'Disposable restored server disappeared' }
    if ($health -eq 'healthy') { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'Disposable restored server did not become healthy; inspect its logs without exposing secrets' }
  $sourceDir = Join-Path $root 'scripts'
  $dependencies = Join-Path $root 'node_modules'
  if (-not (Test-Path (Join-Path $dependencies '@aws-sdk/client-s3'))) { throw 'Install project dependencies before drill' }
  # Only restored endpoint is reachable on this internal network. Probe writes/deletes target disposable restored volume only.
  docker run --rm --network $network --env-file $composeSecrets --env-file $appSecrets --env "DRILL_ENDPOINT=http://${server}:9000" --env "DRILL_MANIFEST=/input/manifest.json" --env "DRILL_REPORT=/evidence/result.json" --env "S3_BUCKET=$bucket" --mount "type=bind,source=$manifestPath,destination=/input/manifest.json,readonly" --mount "type=bind,source=$sourceDir,destination=/work,readonly" --mount "type=bind,source=$dependencies,destination=/node_modules,readonly" --mount "type=bind,source=$runDir,destination=/evidence" --workdir /work $nodeImage node /work/verify-restored-minio-volume.mjs
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path (Join-Path $runDir 'result.json'))) { throw 'Restored bytes/IAM/privacy verification failed' }
  $evidence = Get-Content (Join-Path $runDir 'result.json') -Raw | ConvertFrom-Json
  if ($evidence.result -ne 'pass' -or $evidence.productObjects.Count -ne 4) { throw 'Verification evidence incomplete' }
  $summary = [ordered]@{ result = 'pass'; snapshotSha256 = $archiveSha256; snapshotBytes = (Get-Item $archive).Length; verifiedAt = $evidence.verifiedAt; productObjects = 4; liveVolume = $liveVolume; sourceImageId = $serverImage; snapshotConsistency = 'operator-confirmed write freeze; script cannot independently enforce client quiescence'; retainedLocalArchive = 'snapshot.tar'; evidence = 'result.json'; disposableResourcesRemoved = $false }
  $summary | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $runDir 'summary.json') -Encoding utf8
  Write-Host "PASS: isolated full-volume restore and 4 SHA256/IAM checks; private evidence: $runDir"
} finally {
  if ($serverMade) { docker rm --force $server 2>$null | Out-Null }
  if ($volumeMade) { docker volume rm $volume 2>$null | Out-Null }
  if ($networkMade) { docker network rm $network 2>$null | Out-Null }
  # Never remove source volume, live container, or retained private snapshot.
  $summaryPath = Join-Path $runDir 'summary.json'
  if (Test-Path $summaryPath) {
    $summary = Get-Content $summaryPath -Raw | ConvertFrom-Json
    $summary.disposableResourcesRemoved = $true
    $summary | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $summaryPath -Encoding utf8
  }
}
