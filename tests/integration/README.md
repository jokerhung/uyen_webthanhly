# Disposable product-image integrations

## Upload/rollback adapter against source-built MinIO

```powershell
& ./tests/integration/run-product-image-adapter.ps1
```

Requires Docker, the prebuilt `webkygui/minio:9e49d5e7` image, and one ignored copied WebP fixture in `.private/minio-preflight-files/consignments/`. This separate test creates a unique ephemeral MinIO container/bucket on a Docker-assigned loopback port and a miniature Next project on a random loopback port. The mini project copies the unchanged production adapter/config/local-image modules and invokes them through a generated **test-only** route. It copies fixture bytes into its private root and never connects to a DB or accesses Compose, `.env`, the real app server, or original image files for writes.

Checks include upload return key/type/size, adapter GET and HEAD exact bytes/SHA-256, independent S3 GET/HEAD/LIST bytes/hash/metadata/content type, no new file in the copied private root, deletion/rollback, missing read/head and empty S3 listing, idempotent delete, and local logo-byte reads before and after rollback. Containers and temporary mini-project files are removed in `finally`; ignored `.private/adapter-integration-<tag>-evidence.json` persists checks and cleanup status. This tests adapter behavior, **not** upload route authorization, DB rollback, IAM, or production deployment; random port selection has a small check-to-bind race.

## Read-only HTTP routes against disposable restored snapshot

Run from the repository root on Windows with Docker and Windows PowerShell available:

```powershell
& ./tests/integration/run-product-image-http.ps1
```

Prerequisites: source-built `webkygui/minio:9e49d5e7` and `postgres:16-alpine` Docker images; ignored `.private/minio-preflight-db.dump`, `.private/minio-preflight-files/consignments/`, and `.private/minio-isolated-sdk.mjs` from the isolated migration preflight. The script restores the dump **only** into a unique disposable PostgreSQL container, clones image bytes into a unique ignored directory, and mutates the disposable database to ensure one pending product exists. It copies only the relevant Next routes and dependencies into an ignored miniature project with its own `.next`, binds PostgreSQL/MinIO/Next to random loopback ports, and configures MinIO entirely via child-process environment (not `.env`). Product objects are copied and verified with the existing migration script before HTTP checks. It tests pending 404, approved 200 and exact byte/hash match via the unchanged image URL/key, MinIO outage 503, and local logo 200 both before and during outage. No cutover or real application port 3100 is used.

A per-run `.private/http-integration-<tag>-evidence.json` includes checks, SHA-256s, source immutability, server-stop and container cleanup status. Temporary copied project/uploads are deleted after each run. Failures should be investigated from the evidence file; no test action should touch the live database, original `.env`, Compose MinIO or Compose data. **Limitations:** The restored snapshot is a historical preflight fixture; this tests read routes only, not upload/admin flows or production deployment/IAM. Port allocation still has a short check-to-bind race; the script rejects 3100 but may fail if a random port is claimed concurrently.

## Consignment and admin upload route integration (isolated)

```powershell
& ./tests/integration/run-product-image-upload-routes.ps1
```

This copies the **unchanged application route and dependency files** into a temporary miniature Next project; it restores an ignored preflight dump to a unique disposable PostgreSQL container, copies one fixture WebP to an ignored private directory, and uses a unique empty MinIO container/bucket. Docker ports and the separate Next port bind to loopback; environment is set only in the test process/children. The test uses a disposable admin session in the restored DB, not an existing admin session. Intended checks: intake origin/validation rejection, receipt and image commit, idempotent retry/conflict, admin authentication/origin/validation, admin image commit, independent remote S3 hashes, stale-write S3 rollback and injected transaction failure S3 rollback, and no new private local files. Every container and temporary project is removed in `finally`; per-run evidence stays at `.private/upload-integration-<tag>-evidence.json`. No Compose bucket, live DB, `.env`, or running app is touched.

**Execution status:** An earlier attempt (`.private/upload-integration-7348772835e5-evidence.json`) failed at authenticated admin origin. A diagnostic route established that the miniature Next server normalizes `request.url` to `http://localhost:<port>` even though its listener and client use `127.0.0.1:<port>`; the probe now reads this observed origin and sends it for authenticated same-origin PATCH. In the next isolated run, `.private/upload-integration-e74459569191-probe-evidence.json` recorded **20/20 passing probe checks**: consignment 403/422/201, idempotent 200 and conflict 409; admin 401/403/422/200, DB image/audit commit, independent S3 GET/HEAD hashes for both optimized objects, stale admin 409 rollback, injected intake DB failure 500 rollback, and no extra local product file. The test containers were removed and copied test directory manually removed; **the PowerShell wrapper finalizer hung after the passing probe** and was cancelled, so there is no wrapper-level success/cleanup evidence for this run. This validates the copied production routes in a disposable miniature Next project, **not** the live application, deployment reverse proxy/IAM, delete worker or storage-outage scenarios. Do not describe the complete runner as green until its finalizer reliably exits with saved evidence. Random port allocation has a small check-to-bind race.
