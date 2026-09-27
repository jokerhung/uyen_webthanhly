# Isolated HTTP integration: no Compose, live DB, .env, project .next or port 3100.
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Set-Location $repo
$tag = [guid]::NewGuid().ToString('N').Substring(0,12)
$pg = "webkygui-http-pg-$tag"; $minio = "webkygui-http-minio-$tag"
$db = "webkygui_http_$tag"; $bucket = "webkygui-http-$tag"
$password = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$access = "http-$tag"; $secret = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$source = Join-Path $repo '.private/minio-preflight-files/consignments'
$dump = Join-Path $repo '.private/minio-preflight-db.dump'
$work = Join-Path $repo ".private/http-integration-$tag"
$evidenceFile = Join-Path $repo ".private/http-integration-$tag-evidence.json"
$evidence = [ordered]@{ tag=$tag; result='in-progress'; startedAt=(Get-Date).ToUniversalTime().ToString('o'); minioImage=''; checks=@(); sourceHashes=@{}; sourceUnchanged=$false; remainingContainers=@(); serverStopped=$false; limitations=@('Disposable database is restored from a prior preflight snapshot, not a production/live dataset.', 'HTTP coverage is read-only; upload/admin authorization and production deployment are outside scope.') }
$server = $null
function Check($name, $condition, $detail) {
  $evidence.checks += [ordered]@{name=$name; pass=[bool]$condition; detail=[string]$detail}
  if (-not $condition) { throw "Failed $name : $detail" }
}
function InvokeDocker([string]$label, [string[]]$arguments) {
  $output = & docker @arguments 2>&1
  if ($LASTEXITCODE -ne 0) { throw "$label : $($output | Out-String)" }
  return ($output | Out-String).Trim()
}
function FreePort {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
  $listener.Start(); $port = $listener.LocalEndpoint.Port; $listener.Stop(); return $port
}
function Fetch([string]$uri) {
  $req = [System.Net.WebRequest]::Create($uri)
  $req.Timeout = 15000
  try { $response = $req.GetResponse() }
  catch [System.Net.WebException] { if (-not $_.Exception.Response) { throw }; $response = $_.Exception.Response }
  try {
    $stream = $response.GetResponseStream(); $memory = [System.IO.MemoryStream]::new()
    try { $stream.CopyTo($memory); $bytes = $memory.ToArray() } finally { $memory.Dispose(); $stream.Dispose() }
    return [pscustomobject]@{ StatusCode=[int]$response.StatusCode; Content=[byte[]]$bytes; Headers=$response.Headers }
  } finally { $response.Dispose() }
}
function HashBytes([byte[]]$bytes) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash($bytes)) -replace '-', '').ToLowerInvariant() }
  finally { $sha.Dispose() }
}
try {
  Check 'private-fixtures-present' ((Test-Path $dump) -and (Test-Path $source)) 'Requires local ignored preflight dump and copied image fixture.'
  $evidence.minioImage = InvokeDocker 'inspect-source-image' @('image','inspect','webkygui/minio:9e49d5e7','--format','{{.Id}}')
  foreach ($f in Get-ChildItem $source -File) { $evidence.sourceHashes[$f.Name] = (Get-FileHash $f.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
  $evidence.sourceHashes['dump'] = (Get-FileHash $dump -Algorithm SHA256).Hash.ToLowerInvariant()
  New-Item -ItemType Directory -Path $work -Force | Out-Null
  $site = Join-Path $work 'site'; $uploads = Join-Path $work 'uploads'
  New-Item -ItemType Directory -Path $site,$uploads -Force | Out-Null
  Copy-Item (Join-Path $source '*') $uploads -Force
  foreach ($f in Get-ChildItem $uploads -File) { Check "copy-$($f.Name)" ((Get-FileHash $f.FullName -Algorithm SHA256).Hash.ToLowerInvariant() -eq $evidence.sourceHashes[$f.Name]) 'Copy matches fixture SHA-256.' }
  New-Item -ItemType Junction -Path (Join-Path $site 'node_modules') -Target (Join-Path $repo 'node_modules') | Out-Null
  $files = @('src/app/api/items/[slug]/images/[imageId]/route.ts','src/app/api/shop/logo/[key]/route.ts','src/lib/db/client.ts','src/lib/catalog/queries.ts','src/lib/storage/product-images.ts','src/lib/storage/product-image-config.ts','src/lib/storage/images.ts')
  foreach ($file in $files) { $dest = Join-Path $site $file; New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null; Copy-Item -LiteralPath (Join-Path $repo $file) -Destination $dest }
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText((Join-Path $site 'package.json'), '{"name":"isolated-product-image-http","private":true,"version":"1.0.0"}', $utf8)
  [System.IO.File]::WriteAllText((Join-Path $site 'tsconfig.json'), '{"compilerOptions":{"baseUrl":".","paths":{"@/*":["./src/*"]},"jsx":"preserve","moduleResolution":"bundler","allowJs":true,"skipLibCheck":true,"noEmit":true,"esModuleInterop":true,"module":"esnext","target":"es2017"},"include":["src/**/*","next-env.d.ts"]}', $utf8)
  [System.IO.File]::WriteAllText((Join-Path $site 'next.config.mjs'), 'export default {};', $utf8)
  $null = InvokeDocker 'start-postgres' @('run','-d','--name',$pg,'--label',"webkygui.http.integration=$tag",'-e',"POSTGRES_PASSWORD=$password",'-p','127.0.0.1::5432','postgres:16-alpine')
  $null = InvokeDocker 'start-source-minio' @('run','-d','--name',$minio,'--label',"webkygui.http.integration=$tag",'-e',"MINIO_ROOT_USER=$access",'-e',"MINIO_ROOT_PASSWORD=$secret",'-p','127.0.0.1::9000','webkygui/minio:9e49d5e7','server','/data','--console-address',':9001')
  $pgPort = [int]((InvokeDocker 'pg-port' @('port',$pg,'5432/tcp')) -replace '^.*:', '')
  $minioPort = [int]((InvokeDocker 'minio-port' @('port',$minio,'9000/tcp')) -replace '^.*:', '')
  $appPort = FreePort
  Check 'random-loopback-ports' ($pgPort -ne 3100 -and $minioPort -ne 3100 -and $appPort -ne 3100 -and @($pgPort,$minioPort,$appPort | Select-Object -Unique).Count -eq 3) "PostgreSQL=$pgPort MinIO=$minioPort Next=$appPort"
  $env:DATABASE_URL = "postgresql://postgres:${password}@127.0.0.1:${pgPort}/${db}?schema=public"
  $env:CONSIGNMENT_STORAGE_DIR = $uploads
  $env:S3_ENDPOINT = "http://127.0.0.1:$minioPort"; $env:S3_REGION = 'us-east-1'; $env:S3_BUCKET = $bucket
  $env:S3_ACCESS_KEY_ID = $access; $env:S3_SECRET_ACCESS_KEY = $secret; $env:S3_FORCE_PATH_STYLE = 'true'
  $env:PRODUCT_IMAGE_STORAGE_DRIVER = 'minio'; $env:NEXT_TELEMETRY_DISABLED = '1'
  $ready = $false
  for ($i=0; $i -lt 60; $i++) { & docker exec $pg pg_isready -U postgres *> $null; if ($LASTEXITCODE -eq 0) { $ready = $true; break }; Start-Sleep -Seconds 1 }
  Check 'postgres-ready' $ready 'Isolated Postgres accepted connections.'
  $null = InvokeDocker 'createdb' @('exec',$pg,'createdb','-U','postgres',$db)
  $null = InvokeDocker 'copy-dump' @('cp',$dump,"${pg}:/tmp/test.dump")
  $null = InvokeDocker 'restore' @('exec',$pg,'pg_restore','-U','postgres','-d',$db,'--no-owner','--no-acl','--exit-on-error','/tmp/test.dump')
  $rows = InvokeDocker 'query-restored-images' @('exec',$pg,'psql','-U','postgres','-d',$db,'-Atc',"SELECT i.id || '|' || t.slug || '|' || i.storage_key || '|' || t.status FROM item_images i JOIN items t ON t.id=i.item_id ORDER BY t.status, i.id")
  $parsed = @($rows -split "`n" | ForEach-Object { $fields = $_.Trim() -split '\|'; [pscustomobject]@{id=$fields[0];slug=$fields[1];key=$fields[2];status=$fields[3]} })
  $approved = $parsed | Where-Object { $_.status -ieq 'approved' } | Select-Object -First 1
  $pending = $parsed | Where-Object { $_.status -ieq 'pending' } | Select-Object -First 1
  # The fixture may have only approved products: make one disposable restored item pending.
  if ($null -eq $pending -and $null -ne $approved -and $parsed.Count -gt 1) {
    $pending = $parsed | Where-Object { $_.id -ne $approved.id -and $_.slug -ne $approved.slug } | Select-Object -First 1
    if ($pending) {
      $sql = "UPDATE items SET status='pending' WHERE slug='$($pending.slug)'"
      $null = InvokeDocker 'mark-disposable-item-pending' @('exec',$pg,'psql','-U','postgres','-d',$db,'-v','ON_ERROR_STOP=1','-c',$sql)
      $pending.status = 'pending'
    }
  }
  Check 'fixture-approved-and-pending' ($null -ne $approved -and $null -ne $pending) "Restored $($parsed.Count) images; statuses=$(@($parsed.status) -join ',')."
  $logo = (InvokeDocker 'query-logo' @('exec',$pg,'psql','-U','postgres','-d',$db,'-Atc','SELECT logo_key FROM shop_settings WHERE id=1')).Trim()
  Check 'fixture-local-logo' ($logo -match '^[a-f0-9]{64}\.webp$' -and (Test-Path (Join-Path $uploads $logo))) 'Logo present in copied private files.'
  $ready = $false
  for ($i=0; $i -lt 60; $i++) { try { if ((Invoke-WebRequest -Uri "http://127.0.0.1:$minioPort/minio/health/ready" -TimeoutSec 2 -UseBasicParsing).StatusCode -eq 200) { $ready=$true;break } } catch {}; Start-Sleep -Seconds 1 }
  Check 'minio-ready' $ready 'Source-built disposable MinIO healthy.'
  $sdk = Join-Path $repo '.private/minio-isolated-sdk.mjs'
  Check 'fixture-sdk-present' (Test-Path $sdk) 'Existing SDK bucket fixture available.'
  Push-Location $repo
  try { & node $sdk create; if ($LASTEXITCODE -ne 0) { throw 'SDK bucket create failed' }
    & node scripts/migrate-images-to-minio.mjs --apply --manifest (Join-Path $work 'manifest.json') --report (Join-Path $work 'migration.json')
    if ($LASTEXITCODE -ne 0) { throw 'Isolated product-image migration failed' }
  } finally { Pop-Location }
  $manifest = Get-Content (Join-Path $work 'migration.json') -Raw | ConvertFrom-Json
  Check 'product-objects-copied' (@($manifest.items | Where-Object status -eq 'copied-verified').Count -eq $parsed.Count) "All $($parsed.Count) restored product images copied and independently verified."
  $cli = Join-Path $repo 'node_modules/next/dist/bin/next'
  $server = Start-Process -FilePath (Get-Command node).Source -WorkingDirectory $site -ArgumentList @("`"$cli`"",'dev','--webpack','--hostname','127.0.0.1','--port',"$appPort") -RedirectStandardOutput (Join-Path $work 'next.out.log') -RedirectStandardError (Join-Path $work 'next.err.log') -PassThru -WindowStyle Hidden
  $base = "http://127.0.0.1:$appPort"
  $pathApproved = "/api/items/$($approved.slug)/images/$($approved.id)"
  $pathPending = "/api/items/$($pending.slug)/images/$($pending.id)"
  $ready = $false
  for ($i=0; $i -lt 45; $i++) { if ($server.HasExited) { break }; try { $r = Fetch "$base$pathApproved"; if ($r.StatusCode -eq 200) { $ready=$true;break } } catch {}; Start-Sleep -Seconds 1 }
  Check 'next-http-ready' $ready "Isolated copied production route compiled and served on $appPort (logs under $work)."
  $pendingResult = Fetch "$base$pathPending"
  Check 'pending-public-404' ($pendingResult.StatusCode -eq 404 -and $pendingResult.Content.Length -eq 0) "status=$($pendingResult.StatusCode); same restored image key exists but pending item inaccessible."
  $expected = [System.IO.File]::ReadAllBytes((Join-Path $uploads $approved.key))
  $approvedResult = Fetch "$base$pathApproved"
  $actual = $approvedResult.Content
  if ($actual -is [string]) { throw 'Response content unexpectedly decoded to string; use byte-preserving client' }
  Check 'approved-public-200-same-key-url' ($approvedResult.StatusCode -eq 200 -and (HashBytes $actual) -eq (HashBytes $expected) -and $approvedResult.Headers['Content-Type'] -match 'image/webp' -and $approvedResult.Headers['Cache-Control'] -match 'no-store') "status=$($approvedResult.StatusCode); url=$pathApproved; key=$($approved.key); sha256=$(HashBytes $actual)"
  $logoResult = Fetch "$base/api/shop/logo/$logo"
  $logoExpected = [System.IO.File]::ReadAllBytes((Join-Path $uploads $logo))
  Check 'logo-remains-local' ($logoResult.StatusCode -eq 200 -and (HashBytes $logoResult.Content) -eq (HashBytes $logoExpected)) "status=$($logoResult.StatusCode); logo SHA-256=$(HashBytes $logoResult.Content); not an S3 product image."
  $null = InvokeDocker 'stop-minio-to-test-outage' @('stop',$minio)
  $unavailable = Fetch "$base$pathApproved"
  Check 'minio-unavailable-503' ($unavailable.StatusCode -eq 503) "status=$($unavailable.StatusCode); same approved image URL with MinIO stopped."
  $logoOutage = Fetch "$base/api/shop/logo/$logo"
  Check 'logo-local-during-minio-outage' ($logoOutage.StatusCode -eq 200 -and (HashBytes $logoOutage.Content) -eq (HashBytes $logoExpected)) "status=$($logoOutage.StatusCode); independent of remote store."
  $evidence.result = 'pass'
} catch { $evidence.result = 'fail'; $evidence.failure = $_.ToString() }
finally {
  if ($server) {
    if (-not $server.HasExited) { $null = & taskkill /PID $server.Id /T /F 2>&1 }
    $evidence.serverStopped = (-not (Get-NetTCPConnection -LocalPort $appPort -State Listen -ErrorAction SilentlyContinue))
  } else { $evidence.serverStopped = $true }
  foreach ($name in @($minio,$pg)) { & docker rm -fv $name *> $null }
  $evidence.remainingContainers = @(docker ps -a --filter "label=webkygui.http.integration=$tag" --format '{{.Names}}')
  $after = @{}
  if (Test-Path $source) { foreach ($f in Get-ChildItem $source -File) { $after[$f.Name] = (Get-FileHash $f.FullName -Algorithm SHA256).Hash.ToLowerInvariant() } }
  if (Test-Path $dump) { $after['dump'] = (Get-FileHash $dump -Algorithm SHA256).Hash.ToLowerInvariant() }
  $evidence.sourceUnchanged = (($evidence.sourceHashes | ConvertTo-Json -Compress) -eq ($after | ConvertTo-Json -Compress))
  if (Test-Path $work) { Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue }
  $evidence.workDirectoryRemoved = -not (Test-Path $work)
  $evidence.endedAt = (Get-Date).ToUniversalTime().ToString('o')
  $evidence | ConvertTo-Json -Depth 10 | Set-Content -Path $evidenceFile -Encoding utf8
  Write-Output "Evidence: $evidenceFile; result=$($evidence.result); checks=$($evidence.checks.Count); serverStopped=$($evidence.serverStopped); remainingContainers=$($evidence.remainingContainers.Count)"
}
if ($evidence.result -ne 'pass' -or -not $evidence.serverStopped -or $evidence.remainingContainers.Count -or -not $evidence.sourceUnchanged) { exit 1 }
