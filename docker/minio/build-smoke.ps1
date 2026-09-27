# Run from any directory: pwsh -File docker/minio/build-smoke.ps1
# Builds the pinned linux/amd64 source image and probes an isolated server.
$ErrorActionPreference = 'Stop'
$dockerfile = Join-Path $PSScriptRoot 'Dockerfile'
$image = 'webkygui/minio:9e49d5e7'
$name = 'minio-source-smoke-' + [guid]::NewGuid().ToString('N').Substring(0, 12)

docker build --platform linux/amd64 --file $dockerfile --tag $image $PSScriptRoot
if ($LASTEXITCODE -ne 0) { throw 'MinIO image build failed' }
docker run --rm $image --version
if ($LASTEXITCODE -ne 0) { throw 'MinIO binary version check failed' }
try {
  $container = docker run --detach --rm --name $name --publish '127.0.0.1::9000' --env 'MINIO_ROOT_USER=smokeuser' --env 'MINIO_ROOT_PASSWORD=smoke-password-only' $image
  if ($LASTEXITCODE -ne 0) { throw 'MinIO container failed to start' }
  $portLine = docker port $name '9000/tcp'
  if ($LASTEXITCODE -ne 0 -or -not $portLine) { throw 'Cannot resolve the smoke-test port' }
  $port = ([string]$portLine | Select-Object -First 1).Trim().Split(':')[-1]
  $url = "http://127.0.0.1:$port/minio/health/live"
  $ready = $false
  for ($attempt = 0; $attempt -lt 45; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $url -TimeoutSec 2
      if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch { Start-Sleep -Seconds 1 }
  }
  if (-not $ready) { docker logs $name; throw "MinIO never returned HTTP 200 at $url" }
  Write-Host "Smoke test passed: $url returned HTTP 200"
  docker exec $name /usr/local/bin/minio-healthcheck
  if ($LASTEXITCODE -ne 0) { throw 'Embedded /ready healthcheck failed' }
  $env:SMOKE_ENDPOINT = "http://127.0.0.1:$port"
  $env:SMOKE_ACCESS_KEY = 'smokeuser'
  $env:SMOKE_SECRET_KEY = 'smoke-password-only'
  try {
    node (Join-Path $PSScriptRoot 'smoke-s3.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Isolated S3 CRUD failed' }
  } finally {
    Remove-Item Env:SMOKE_ENDPOINT, Env:SMOKE_ACCESS_KEY, Env:SMOKE_SECRET_KEY -ErrorAction SilentlyContinue
  }
  docker image inspect $image --format '{{.Id}}'
} finally {
  docker rm --force $name 2>$null | Out-Null
}
