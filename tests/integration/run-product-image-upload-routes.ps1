# Actual unchanged consignment/admin route integration in a copied miniature Next app and disposable Docker services.
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$tag = [guid]::NewGuid().ToString('N').Substring(0,12)
$pg = "webkygui-upload-pg-$tag"; $minio = "webkygui-upload-minio-$tag"
$work = Join-Path $repo ".private/upload-integration-$tag"; $site = Join-Path $work 'site'
$dump = Join-Path $repo '.private/minio-preflight-db.dump'
$source = Join-Path $repo '.private/minio-preflight-files/consignments'
$report = Join-Path $repo ".private/upload-integration-$tag-evidence.json"
$evidence = [ordered]@{tag=$tag;result='fail';startedAt=(Get-Date).ToUniversalTime().ToString('o');checks=@();sourceHashes=@{};sourceUnchanged=$false;remainingContainers=@();serverStopped=$false;workDirectoryRemoved=$false;limitations=@('Restored historical snapshot, not a production database; deliberately created test admin session exists only in disposable PostgreSQL.','The mini Next project copies unchanged production routes/modules, but not the full app shell, reverse proxy or production IAM.','No delete-worker or deliberate S3 cleanup outage test; exercised upload commit, failed transaction cleanup and stale-write cleanup.','Docker/Next dynamic loopback port assignment has a small check-to-bind race.')}
$server=$null; $appPort=$null
function Check([string]$name,[bool]$pass,[string]$detail) { $evidence.checks += [ordered]@{name=$name;pass=$pass;detail=$detail}; if (-not $pass) { throw "${name}: $detail" } }
function InvokeDocker([string[]]$arguments) { $output = & docker @arguments 2>&1; if ($LASTEXITCODE -ne 0) { throw "Docker $($arguments -join ' '): $($output | Out-String)" }; return ($output | Out-String).Trim() }
function FreePort { $l=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,0); $l.Start(); $p=$l.LocalEndpoint.Port; $l.Stop(); return $p }
try {
  Check 'ignored-snapshot-fixtures' ((Test-Path $dump) -and (Test-Path $source)) 'Require ignored preflight DB dump and image bytes.'
  $fixture=Get-ChildItem $source -File -Filter '*.webp' | Select-Object -First 1
  Check 'copied-webp-fixture-exists' ($null -ne $fixture) 'At least one private fixture WebP.'
  $evidence.sourceHashes['dump']=(Get-FileHash $dump -Algorithm SHA256).Hash.ToLowerInvariant()
  foreach ($file in Get-ChildItem $source -File) { $evidence.sourceHashes[$file.Name]=(Get-FileHash $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
  $evidence.minioImage=InvokeDocker @('image','inspect','webkygui/minio:9e49d5e7','--format','{{.Id}}')
  New-Item -ItemType Directory -Path $site,(Join-Path $work 'uploads') -Force | Out-Null
  $copied=Join-Path $work "uploads/$($fixture.Name)"
  Copy-Item -LiteralPath $fixture.FullName -Destination $copied
  Check 'fixture-copy-sha256' ((Get-FileHash $copied -Algorithm SHA256).Hash.ToLowerInvariant() -eq $evidence.sourceHashes[$fixture.Name]) "sha256=$($evidence.sourceHashes[$fixture.Name])"
  New-Item -ItemType Junction -Path (Join-Path $site 'node_modules') -Target (Join-Path $repo 'node_modules') | Out-Null
  $modules=@('src/app/api/consignments/route.ts','src/app/api/admin/items/[id]/images/route.ts','src/lib/db/client.ts','src/lib/db/rate-limit.ts','src/lib/storage/product-images.ts','src/lib/storage/product-image-config.ts','src/lib/storage/product-cleanup.ts','src/lib/storage/images.ts','src/lib/validation/intake-multipart.ts','src/lib/validation/consignment.ts','src/lib/validation/settlement.ts','src/lib/auth/session.ts','src/lib/auth/local-dev.ts','src/content/site.ts')
  foreach ($file in $modules) { $dest=Join-Path $site $file; New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null; Copy-Item -LiteralPath (Join-Path $repo $file) -Destination $dest }
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'product-image-upload-probe.mjs') -Destination (Join-Path $site 'probe.mjs')
  $utf8=[System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText((Join-Path $site 'package.json'),' {"name":"isolated-product-image-upload-routes","private":true,"version":"1.0.0"}',$utf8)
  [System.IO.File]::WriteAllText((Join-Path $site 'tsconfig.json'),' {"compilerOptions":{"baseUrl":".","paths":{"@/*":["./src/*"]},"jsx":"preserve","moduleResolution":"bundler","skipLibCheck":true,"noEmit":true,"esModuleInterop":true,"module":"esnext","target":"es2017"},"include":["src/**/*","next-env.d.ts"]}',$utf8)
  [System.IO.File]::WriteAllText((Join-Path $site 'next.config.mjs'),'export default {};',$utf8)
  $diagnostic=Join-Path $site 'src/app/api/test-origin/route.ts'; New-Item -ItemType Directory (Split-Path $diagnostic) -Force | Out-Null
  [System.IO.File]::WriteAllText($diagnostic, 'export function GET(request: Request) { return Response.json({ url: request.url, origin: request.headers.get("origin"), fetchSite: request.headers.get("sec-fetch-site"), host: request.headers.get("host") }); }', $utf8)
  $password=[guid]::NewGuid().ToString('N')
  $null=InvokeDocker @('run','-d','--name',$pg,'--label',"webkygui.upload.integration=$tag",'-e',"POSTGRES_PASSWORD=$password",'-p','127.0.0.1::5432','postgres:16-alpine')
  $access="upload-$tag"; $secret=[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
  $null=InvokeDocker @('run','-d','--name',$minio,'--label',"webkygui.upload.integration=$tag",'-e',"MINIO_ROOT_USER=$access",'-e',"MINIO_ROOT_PASSWORD=$secret",'-p','127.0.0.1::9000','webkygui/minio:9e49d5e7','server','/data','--console-address',':9001')
  $pgPort=[int]((InvokeDocker @('port',$pg,'5432/tcp')) -replace '^.*:','')
  $minioPort=[int]((InvokeDocker @('port',$minio,'9000/tcp')) -replace '^.*:','')
  $appPort=FreePort
  Check 'unique-loopback-ports' ($pgPort -ne 3100 -and $minioPort -ne 3100 -and $appPort -ne 3100 -and @($pgPort,$minioPort,$appPort | Select-Object -Unique).Count -eq 3) "postgres=$pgPort minio=$minioPort next=$appPort"
  $database="webkygui_upload_$tag"
  $env:DATABASE_URL="postgresql://postgres:${password}@127.0.0.1:${pgPort}/${database}?schema=public"
  $env:S3_ENDPOINT="http://127.0.0.1:$minioPort"; $env:S3_REGION='us-east-1'; $env:S3_BUCKET="webkygui-upload-$tag"
  $env:S3_ACCESS_KEY_ID=$access; $env:S3_SECRET_ACCESS_KEY=$secret; $env:S3_FORCE_PATH_STYLE='true'
  $env:PRODUCT_IMAGE_STORAGE_DRIVER='minio'; $env:CONSIGNMENT_STORAGE_DIR=Join-Path $work 'uploads'
  $env:PRIVACY_POLICY_REVIEWED='true'; $env:MIN_CONSIGNMENT_ITEMS='1'; $env:MAX_CONSIGNMENT_ITEMS='2'; $env:MAX_IMAGES_PER_ITEM='5'; $env:MAX_IMAGE_BYTES='5242880'
  $env:NEXT_TELEMETRY_DISABLED='1'; $env:TEST_FIXTURE=$copied; $env:TEST_APP_PORT="$appPort"; $env:TEST_PROBE_REPORT=Join-Path $work 'probe-report.json'
  $ready=$false
  for($i=0;$i -lt 60;$i++){ & docker exec $pg pg_isready -U postgres *> $null; if($LASTEXITCODE -eq 0){$ready=$true;break}; Start-Sleep -Seconds 1 }
  Check 'postgres-ready' $ready 'Disposable container accepting connections.'
  $null=InvokeDocker @('exec',$pg,'createdb','-U','postgres',$database)
  $null=InvokeDocker @('cp',$dump,"${pg}:/tmp/test.dump")
  $null=InvokeDocker @('exec',$pg,'pg_restore','-U','postgres','-d',$database,'--no-owner','--no-acl','--exit-on-error','/tmp/test.dump')
  $schemaSql=Join-Path $repo 'prisma/migrations/20261006000000_storage_cleanup_jobs/migration.sql'
  $table=(InvokeDocker @('exec',$pg,'psql','-U','postgres','-d',$database,'-Atc',"SELECT to_regclass('public.storage_cleanup_jobs')"))
  if (-not $table) { $null=InvokeDocker @('cp',$schemaSql,"${pg}:/tmp/cleanup.sql"); $null=InvokeDocker @('exec',$pg,'psql','-U','postgres','-d',$database,'-v','ON_ERROR_STOP=1','-f','/tmp/cleanup.sql') }
  $ready=$false
  for($i=0;$i -lt 60;$i++){ try { if((Invoke-WebRequest -Uri "$env:S3_ENDPOINT/minio/health/ready" -TimeoutSec 2 -UseBasicParsing).StatusCode -eq 200){$ready=$true;break} }catch{}; Start-Sleep -Seconds 1 }
  Check 'minio-ready' $ready 'Disposable source-built MinIO healthy.'
  $bucketScript=Join-Path $site 'bucket.mjs'
  [System.IO.File]::WriteAllText($bucketScript,"import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3'; const c=new S3Client({endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,forcePathStyle:true,credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY}}); try { await c.send(new CreateBucketCommand({Bucket:process.env.S3_BUCKET})); } finally {c.destroy()}",$utf8)
  & node $bucketScript; if($LASTEXITCODE -ne 0){throw 'Failed creating disposable bucket'}
  $next=Join-Path $repo 'node_modules/next/dist/bin/next'
  $server=Start-Process -FilePath (Get-Command node).Source -WorkingDirectory $site -ArgumentList @("`"$next`"",'dev','--webpack','--hostname','127.0.0.1','--port',"$appPort") -RedirectStandardOutput (Join-Path $work 'next.out.log') -RedirectStandardError (Join-Path $work 'next.err.log') -PassThru -WindowStyle Hidden
  $ready=$false
  for($i=0;$i -lt 75;$i++){ if($server.HasExited){break}; try { $response=Invoke-WebRequest -Uri "http://127.0.0.1:$appPort/api/consignments" -TimeoutSec 3 -UseBasicParsing; $evidence.readinessStatus=[int]$response.StatusCode } catch [System.Net.WebException] { if($_.Exception.Response){$evidence.readinessStatus=[int]$_.Exception.Response.StatusCode; if($evidence.readinessStatus -eq 405){$ready=$true;break}}else{$evidence.readinessError=$_.Exception.Message} }catch{$evidence.readinessError=$_.Exception.Message}; Start-Sleep -Seconds 1 }
  Check 'copied-real-route-ready' $ready "Next on $appPort; logs in temporary work directory."
  Push-Location $site
  try { & node probe.mjs; $exit=$LASTEXITCODE } finally { Pop-Location }
  Check 'probe-exit-success' ($exit -eq 0) "Probe exit=$exit"
  $probe=Get-Content $env:TEST_PROBE_REPORT -Raw | ConvertFrom-Json
  $evidence.checks += @($probe.checks)
  Check 'all-http-db-s3-checks' ($probe.result -eq 'pass' -and @($probe.checks | Where-Object { -not $_.pass }).Count -eq 0) "$(@($probe.checks).Count) probe checks passed"
  $evidence.result='pass'
}catch{ $evidence.failure=$_.ToString(); if(Test-Path (Join-Path $work 'probe-report.json')){ $probe=Get-Content (Join-Path $work 'probe-report.json') -Raw | ConvertFrom-Json; $evidence.checks += @($probe.checks); $evidence.probeFailure=$probe.failure } }
finally{
  if($server){ if(-not $server.HasExited){ $null=& taskkill /PID $server.Id /T /F 2>&1 }; $evidence.serverStopped=(-not (Get-NetTCPConnection -LocalPort $appPort -State Listen -ErrorAction SilentlyContinue)) }else{$evidence.serverStopped=$true}
  Write-Output 'Cleanup checkpoint: server stopped'
  foreach($name in @($minio,$pg)){ & docker rm -fv $name *> $null }
  Write-Output 'Cleanup checkpoint: containers removed'
  $evidence.remainingContainers=@(docker ps -a --filter "label=webkygui.upload.integration=$tag" --format '{{.Names}}')
  Write-Output 'Cleanup checkpoint: container inventory checked'
  $after=@{}; if(Test-Path $dump){$after['dump']=(Get-FileHash $dump -Algorithm SHA256).Hash.ToLowerInvariant()}; if(Test-Path $source){foreach($file in Get-ChildItem $source -File){$after[$file.Name]=(Get-FileHash $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}}
  Write-Output 'Cleanup checkpoint: source hashes computed'
  $evidence.sourceUnchanged=($evidence.sourceHashes.Count -gt 0 -and @(Compare-Object ($evidence.sourceHashes.GetEnumerator() | ForEach-Object {"$($_.Key):$($_.Value)"}) ($after.GetEnumerator() | ForEach-Object {"$($_.Key):$($_.Value)"})).Count -eq 0)
  Write-Output 'Cleanup checkpoint: source hashes compared'
  $probeReport=Join-Path $work 'probe-report.json'
  if((Test-Path $probeReport) -and -not $evidence.Contains('probe')){$evidence.probe=(Get-Content $probeReport -Raw | ConvertFrom-Json)}
  Write-Output 'Cleanup checkpoint: probe report loaded'
  foreach($name in @('next.out.log','next.err.log')){ $log=Join-Path $work $name; if(Test-Path $log){$evidence[$name]=@(Get-Content $log -Tail 80 -ErrorAction SilentlyContinue)} }
  Write-Output 'Cleanup checkpoint: logs loaded'
  $evidence.endedAt=(Get-Date).ToUniversalTime().ToString('o')
  $json=$evidence | ConvertTo-Json -Depth 12
  Write-Output 'Cleanup checkpoint: evidence serialized'
  $json | Set-Content -Path $report -Encoding utf8
  Write-Output 'Cleanup checkpoint: evidence preserved'
  # PowerShell Remove-Item -Recurse traverses the node_modules junction and can
  # stall for minutes inside the real dependency tree. Unlink it before removal.
  $dependencyLink=Join-Path $site 'node_modules'
  if(Test-Path $dependencyLink){ & cmd.exe /d /c "rmdir `"$dependencyLink`"" | Out-Null; if($LASTEXITCODE -ne 0){throw 'Failed to unlink isolated node_modules junction'} }
  if(Test-Path $work){Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction Stop}
  $evidence.workDirectoryRemoved=-not (Test-Path $work)
  $evidence.endedAt=(Get-Date).ToUniversalTime().ToString('o')
  $evidence | ConvertTo-Json -Depth 12 | Set-Content -Path $report -Encoding utf8
  Write-Output "Evidence: $report result=$($evidence.result) checks=$($evidence.checks.Count) serverStopped=$($evidence.serverStopped) remainingContainers=$($evidence.remainingContainers.Count)"
}
if($evidence.result -ne 'pass' -or -not $evidence.sourceUnchanged -or -not $evidence.serverStopped -or -not $evidence.workDirectoryRemoved -or $evidence.remainingContainers.Count){exit 1}
