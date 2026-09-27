# Disposable adapter integration: source-built MinIO, copied fixture, miniature Next project; no DB/Compose/.env.
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$tag = [guid]::NewGuid().ToString('N').Substring(0,12)
$container = "webkygui-adapter-minio-$tag"
$work = Join-Path $repo ".private/adapter-integration-$tag"
$site = Join-Path $work 'site'
$source = Join-Path $repo '.private/minio-preflight-files/consignments'
$report = Join-Path $repo ".private/adapter-integration-$tag-evidence.json"
$server = $null
$checks = [System.Collections.Generic.List[object]]::new()
$evidence = [ordered]@{ tag=$tag; result='in-progress'; minioImage=''; checks=$checks; sourceUnchanged=$false; copiedRootUnchanged=$false; remainingContainers=@(); serverStopped=$false; workDirectoryRemoved=$false; limitations=@('Uses a copied fixture and generated test-only Next route, not application upload authorization or a database transaction.', 'Docker random port and Next random port allocation have a small check-to-bind race.') }
function Check([string]$name, [bool]$passed, [string]$detail) {
  $checks.Add([ordered]@{name=$name;pass=$passed;detail=$detail})
  if (-not $passed) { throw "Failed ${name}: $detail" }
}
function InvokeDocker([string[]]$arguments) {
  $text = & docker @arguments 2>&1
  if ($LASTEXITCODE -ne 0) { throw "docker $($arguments -join ' '): $($text | Out-String)" }
  return ($text | Out-String).Trim()
}
function FreePort {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
  $listener.Start(); $port = $listener.LocalEndpoint.Port; $listener.Stop(); return $port
}
function Fetch([string]$uri, [string]$method='GET', [byte[]]$body=$null) {
  $request = [System.Net.WebRequest]::Create($uri)
  $request.Method=$method; $request.Timeout=15000
  if ($null -ne $body) {
    $request.ContentType='application/octet-stream'; $request.ContentLength=$body.Length
    $stream=$request.GetRequestStream(); try { $stream.Write($body,0,$body.Length) } finally { $stream.Dispose() }
  }
  try { $response=$request.GetResponse() }
  catch [System.Net.WebException] { if (-not $_.Exception.Response) { throw }; $response=$_.Exception.Response }
  try {
    $memory=[System.IO.MemoryStream]::new(); $stream=$response.GetResponseStream()
    try { $stream.CopyTo($memory); $bytes=$memory.ToArray() } finally { $memory.Dispose(); $stream.Dispose() }
    return [pscustomobject]@{status=[int]$response.StatusCode; bytes=[byte[]]$bytes; text=[System.Text.Encoding]::UTF8.GetString($bytes)}
  } finally { $response.Dispose() }
}
function Hash([byte[]]$bytes) {
  $sha=[Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash($bytes)) -replace '-','').ToLowerInvariant() }
  finally { $sha.Dispose() }
}
try {
  Check 'fixture-available' (Test-Path $source) 'Copied preflight image fixture exists.'
  $fixture=Get-ChildItem $source -File -Filter '*.webp' | Select-Object -First 1
  Check 'webp-fixture' ($null -ne $fixture) 'A copied WebP fixture exists.'
  $sourceHash=(Get-FileHash $fixture.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  $evidence.minioImage=InvokeDocker @('image','inspect','webkygui/minio:9e49d5e7','--format','{{.Id}}')
  New-Item -ItemType Directory -Path $site,(Join-Path $work 'uploads') -Force | Out-Null
  $logo=Join-Path $work "uploads/$($fixture.Name)"
  Copy-Item -LiteralPath $fixture.FullName -Destination $logo
  Check 'copied-fixture-hash' ((Get-FileHash $logo -Algorithm SHA256).Hash.ToLowerInvariant() -eq $sourceHash) "fixture SHA-256=$sourceHash"
  New-Item -ItemType Junction -Path (Join-Path $site 'node_modules') -Target (Join-Path $repo 'node_modules') | Out-Null
  foreach ($file in @('src/lib/storage/product-images.ts','src/lib/storage/product-image-config.ts','src/lib/storage/images.ts')) {
    $destination=Join-Path $site $file; New-Item -ItemType Directory (Split-Path $destination) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $repo $file) -Destination $destination
  }
  $utf8=[System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText((Join-Path $site 'package.json'),' {"name":"isolated-product-image-adapter","private":true,"version":"1.0.0"}', $utf8)
  [System.IO.File]::WriteAllText((Join-Path $site 'tsconfig.json'),' {"compilerOptions":{"baseUrl":".","paths":{"@/*":["./src/*"]},"jsx":"preserve","moduleResolution":"bundler","skipLibCheck":true,"noEmit":true,"esModuleInterop":true,"module":"esnext","target":"es2017"},"include":["src/**/*","next-env.d.ts"]}', $utf8)
  [System.IO.File]::WriteAllText((Join-Path $site 'next.config.mjs'),'export default {};', $utf8)
  $route=Join-Path $site 'src/app/api/fixture/route.ts'; New-Item -ItemType Directory (Split-Path $route) -Force | Out-Null
  [System.IO.File]::WriteAllText($route, @'
import { cleanupProductImages, deleteProductImage, headProductImage, ProductImageNotFound, readProductImage, storeProductImage } from "@/lib/storage/product-images";
import { readPrivateImage } from "@/lib/storage/images";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const result = await storeProductImage(new Uint8Array(await request.arrayBuffer()));
  return Response.json(result);
}
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.has("logo")) {
    const data = await readPrivateImage(process.env.TEST_LOGO_KEY!);
    return Response.json({ bytes: data.toString("base64") });
  }
  try {
    const key = url.searchParams.get("key")!;
    const head = await headProductImage(key);
    const bytes = await readProductImage(key);
    return Response.json({ head, bytes: bytes.toString("base64") });
  } catch (error) {
    if (error instanceof ProductImageNotFound) return Response.json({ missing: true }, { status: 404 });
    throw error;
  }
}
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const keys = url.searchParams.getAll("key");
  if (keys.length > 1) await cleanupProductImages(keys);
  else await deleteProductImage(keys[0]);
  return Response.json({ deleted: true });
}
'@, $utf8)
  $probe=Join-Path $site 'probe.mjs'
  [System.IO.File]::WriteAllText($probe, @'
import { createHash } from "node:crypto";
import { S3Client, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
const client = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION, forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } });
const Bucket = process.env.S3_BUCKET;
try {
  const listed = await client.send(new ListObjectsV2Command({ Bucket }));
  const keys = (listed.Contents ?? []).map(item => item.Key);
  if (process.argv[2] === "absent") { console.log(JSON.stringify({keys})); }
  else {
    const Key=process.argv[2];
    const head = await client.send(new HeadObjectCommand({Bucket,Key}));
    const got = await client.send(new GetObjectCommand({Bucket,Key}));
    const bytes = await got.Body.transformToByteArray();
    console.log(JSON.stringify({keys, byteSize: bytes.length, sha256:createHash("sha256").update(bytes).digest("hex"), metadataSha256:head.Metadata?.sha256, contentType:head.ContentType}));
  }
} finally { client.destroy(); }
'@, $utf8)
  $access="adapter-$tag"; $secret=[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
  $null=InvokeDocker @('run','-d','--name',$container,'--label',"webkygui.adapter.integration=$tag",'-e',"MINIO_ROOT_USER=$access",'-e',"MINIO_ROOT_PASSWORD=$secret",'-p','127.0.0.1::9000','webkygui/minio:9e49d5e7','server','/data','--console-address',':9001')
  $minioPort=[int]((InvokeDocker @('port',$container,'9000/tcp')) -replace '^.*:','')
  $appPort=FreePort
  Check 'isolated-random-ports' ($minioPort -ne $appPort -and $minioPort -ne 3100 -and $appPort -ne 3100) "MinIO=$minioPort Next=$appPort loopback"
  $env:PRODUCT_IMAGE_STORAGE_DRIVER='minio'; $env:CONSIGNMENT_STORAGE_DIR=(Join-Path $work 'uploads')
  $env:TEST_LOGO_KEY=$fixture.Name
  $env:S3_ENDPOINT="http://127.0.0.1:$minioPort"; $env:S3_REGION='us-east-1'; $env:S3_BUCKET="webkygui-adapter-$tag"
  $env:S3_ACCESS_KEY_ID=$access; $env:S3_SECRET_ACCESS_KEY=$secret; $env:S3_FORCE_PATH_STYLE='true'
  $env:NEXT_TELEMETRY_DISABLED='1'
  $healthy=$false
  for ($i=0; $i -lt 40; $i++) { try { if ((Invoke-WebRequest -Uri "$env:S3_ENDPOINT/minio/health/ready" -TimeoutSec 2 -UseBasicParsing).StatusCode -eq 200) { $healthy=$true; break } } catch {}; Start-Sleep -Seconds 1 }
  Check 'minio-healthy' $healthy 'Source-built MinIO ready.'
  $bucketScript=Join-Path $site 'bucket.mjs'
  [System.IO.File]::WriteAllText($bucketScript, @'
import { S3Client, CreateBucketCommand } from "@aws-sdk/client-s3";
const client = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION, forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } });
try { await client.send(new CreateBucketCommand({Bucket:process.env.S3_BUCKET})); } finally { client.destroy(); }
'@, $utf8)
  & node $bucketScript; if ($LASTEXITCODE -ne 0) { throw 'Create disposable MinIO bucket failed' }
  $next=Join-Path $repo 'node_modules/next/dist/bin/next'
  $server=Start-Process -FilePath (Get-Command node).Source -WorkingDirectory $site -ArgumentList @("`"$next`"",'dev','--webpack','--hostname','127.0.0.1','--port',"$appPort") -RedirectStandardOutput (Join-Path $work 'next.out.log') -RedirectStandardError (Join-Path $work 'next.err.log') -PassThru -WindowStyle Hidden
  $uri="http://127.0.0.1:$appPort/api/fixture"
  $ready=$false
  for ($i=0; $i -lt 45; $i++) { if ($server.HasExited) { break }; try { if ((Fetch "${uri}?logo=1").status -eq 200) { $ready=$true; break } } catch {}; Start-Sleep -Seconds 1 }
  Check 'mini-next-ready' $ready 'Copied adapter compiled and test-only route responds.'
  $expected=[System.IO.File]::ReadAllBytes($logo)
  $rootBefore=@(Get-ChildItem (Join-Path $work 'uploads') -File | Select-Object -ExpandProperty Name)
  $logoBefore=Fetch "${uri}?logo=1" | Select-Object -ExpandProperty text | ConvertFrom-Json
  Check 'local-logo-while-minio-driver' ((Hash ([Convert]::FromBase64String($logoBefore.bytes))) -eq $sourceHash) "Local logo byte hash=$sourceHash"
  $stored=(Fetch $uri 'POST' $expected).text | ConvertFrom-Json
  Check 'adapter-upload' ($stored.storageKey -match '^[a-f0-9]{64}\.webp$' -and $stored.mimeType -eq 'image/webp' -and $stored.byteSize -eq $expected.Length) "key=$($stored.storageKey) bytes=$($stored.byteSize)"
  $object=Fetch "${uri}?key=$($stored.storageKey)"
  $read=$object.text | ConvertFrom-Json
  Check 'adapter-read-head-exact-hash' ($object.status -eq 200 -and $read.head.byteSize -eq $expected.Length -and $read.head.sha256 -eq $sourceHash -and (Hash ([Convert]::FromBase64String($read.bytes))) -eq $sourceHash) "GET/head SHA-256=$sourceHash"
  $direct=& node $probe $stored.storageKey | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw 'Direct S3 SDK probe failed' }
  Check 'independent-s3-exact-object' (@($direct.keys).Count -eq 1 -and $direct.keys[0] -eq $stored.storageKey -and $direct.byteSize -eq $expected.Length -and $direct.sha256 -eq $sourceHash -and $direct.metadataSha256 -eq $sourceHash -and $direct.contentType -eq 'image/webp') "S3 GET/HEAD/LIST byte/hash/metadata/type verified: $($direct.sha256)"
  $rootAfter=@(Get-ChildItem (Join-Path $work 'uploads') -File | Select-Object -ExpandProperty Name)
  $evidence.copiedRootUnchanged=(@(Compare-Object $rootBefore $rootAfter).Count -eq 0 -and (Get-FileHash $logo -Algorithm SHA256).Hash.ToLowerInvariant() -eq $sourceHash)
  Check 'no-new-local-file' $evidence.copiedRootUnchanged 'Copied private storage root contains exactly the original fixture after S3 upload.'
  $delete=Fetch "${uri}?key=$($stored.storageKey)" 'DELETE'
  Check 'rollback-delete' ($delete.status -eq 200) 'Adapter delete completed.'
  $missing=Fetch "${uri}?key=$($stored.storageKey)"
  $after=& node $probe absent | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw 'Direct post-delete S3 SDK probe failed' }
  Check 'missing-read-head-and-s3' ($missing.status -eq 404 -and (($missing.text | ConvertFrom-Json).missing) -and @($after.keys).Count -eq 0) 'Both adapter missing response and independent bucket listing confirm removal.'
  $secondDelete=Fetch "${uri}?key=$($stored.storageKey)" 'DELETE'
  Check 'delete-idempotent' ($secondDelete.status -eq 200) 'Deleting already-missing S3 object succeeds.'
  $rollbackA=(Fetch $uri 'POST' $expected).text | ConvertFrom-Json
  $rollbackB=(Fetch $uri 'POST' $expected).text | ConvertFrom-Json
  Check 'rollback-objects-distinct' ($rollbackA.storageKey -ne $rollbackB.storageKey -and $rollbackA.storageKey -ne $stored.storageKey) 'Two additional uploads yield new keys.'
  $batch=Fetch "${uri}?key=$($rollbackA.storageKey)&key=$($rollbackB.storageKey)" 'DELETE'
  $batchAfter=& node $probe absent | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw 'Direct post-rollback S3 SDK probe failed' }
  Check 'cleanupProductImages-rollback' ($batch.status -eq 200 -and @($batchAfter.keys).Count -eq 0) 'Actual adapter batch rollback removes both uploaded objects.'
  $logoAfter=Fetch "${uri}?logo=1" | Select-Object -ExpandProperty text | ConvertFrom-Json
  Check 'local-logo-survives-rollback' ((Hash ([Convert]::FromBase64String($logoAfter.bytes))) -eq $sourceHash) 'Local logo unchanged following remote deletion.'
  $evidence.result='pass'
} catch { $evidence.result='fail'; $evidence.failure=$_.ToString() }
finally {
  if ($server) {
    if (-not $server.HasExited) { $null=& taskkill /PID $server.Id /T /F 2>&1 }
    $evidence.serverStopped=(-not (Get-NetTCPConnection -LocalPort $appPort -State Listen -ErrorAction SilentlyContinue))
  } else { $evidence.serverStopped=$true }
  & docker rm -fv $container *> $null
  $evidence.remainingContainers=@(docker ps -a --filter "label=webkygui.adapter.integration=$tag" --format '{{.Names}}')
  if ($fixture) { $evidence.sourceUnchanged=((Get-FileHash $fixture.FullName -Algorithm SHA256).Hash.ToLowerInvariant() -eq $sourceHash) }
  if (Test-Path $work) { Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue }
  $evidence.workDirectoryRemoved=-not (Test-Path $work)
  $evidence | ConvertTo-Json -Depth 10 | Set-Content -Path $report -Encoding utf8
  Write-Output "Evidence: $report result=$($evidence.result) checks=$($checks.Count) containers=$($evidence.remainingContainers.Count)"
}
if ($evidence.result -ne 'pass' -or -not $evidence.sourceUnchanged -or -not $evidence.serverStopped -or -not $evidence.workDirectoryRemoved -or $evidence.remainingContainers.Count) { exit 1 }
