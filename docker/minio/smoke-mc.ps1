# Source-built mc against a disposable, isolated server; no Compose network, ports or volumes.
# Run after docker build -f docker/minio/Dockerfile.mc -t webkygui/mc:77f82e18 docker/minio
$ErrorActionPreference = 'Stop'
$network = 'minio-mc-smoke-' + [guid]::NewGuid().ToString('N').Substring(0, 12)
$server = $network + '-server'
$client = 'webkygui/mc:77f82e18'
$minio = 'webkygui/minio:9e49d5e7'
$rootUser = 'disposable-smoke-root'
$rootPass = 'disposable-smoke-password-only'
$networkCreated = $false
try {
  docker network create --internal $network | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Failed creating disposable internal network' }
  $networkCreated = $true
  docker run --detach --rm --network $network --name $server --env "MINIO_ROOT_USER=$rootUser" --env "MINIO_ROOT_PASSWORD=$rootPass" $minio | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Failed starting disposable MinIO container' }
  $ready = $false
  for ($attempt = 0; $attempt -lt 45; $attempt++) {
    $health = docker inspect --format '{{.State.Health.Status}}' $server
    if ($LASTEXITCODE -ne 0) { throw 'Disposable server disappeared during readiness check' }
    if ($health -eq 'healthy') { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'Disposable MinIO did not become ready' }
  $version = docker run --rm --network none $client --version
  if ($LASTEXITCODE -ne 0 -or ($version -join ' ') -notmatch '77f82e18b5401a65958f1619df6ebb994634bd88') { throw "Unexpected mc version: $version" }
  # MC_HOST is confined to disposable client processes; no alias or config persists.
  # No host ports, project bucket, persistent volume, Compose network, or live endpoint exists here.
  $alias = "MC_HOST_smoke=http://${rootUser}:${rootPass}@${server}:9000"
  docker run --rm --network $network --env $alias --env 'MC_CONFIG_DIR=/tmp/mc-config' $client ready smoke
  if ($LASTEXITCODE -ne 0) { throw 'Disposable mc readiness failed' }
  docker run --rm --network $network --env $alias --env 'MC_CONFIG_DIR=/tmp/mc-config' $client admin user list smoke
  if ($LASTEXITCODE -ne 0) { throw 'Disposable mc IAM read-only smoke test failed' }
  Write-Host "mc smoke passed: $version; ready and admin user list on isolated disposable server"
  docker image inspect $client --format '{{.Id}}'
} finally {
  docker rm --force $server 2>$null | Out-Null
  if ($networkCreated) { docker network rm $network 2>$null | Out-Null }
}
