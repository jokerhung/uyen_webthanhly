# Coolify: one Compose deployment

Use the Git repository, Docker Compose build pack and `/docker-compose-coolify.yaml`.
This is one deployment entry point, **not a standalone YAML detached from the repo**:
Dockerfiles, Prisma migrations and bootstrap scripts must remain in Git.
Builds run on the Coolify server (linux/amd64); no GHCR or local image is needed.

## Configure once

Set runtime variables in Coolify (never commit secrets or enable their Buildtime flag):

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.
- `DATABASE_URL=postgresql://USER:URL_ENCODED_PASSWORD@db:5432/DB?schema=public`, matching those values.
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` and separate `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
- `SITE_URL=https://besties.sk2.io.vn`, `ADMIN_ALLOWED_ORIGINS=https://besties.sk2.io.vn`.
- On a **fresh database only**, `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` (12+ characters).
  Existing admins are preserved; these may be empty on redeploy. Remove the bootstrap
  password after the first successful deployment.
- `PRIVACY_POLICY_REVIEWED=true` only after operator approval; default false.
  `PUBLIC_INDEXING_ENABLED` defaults to false.
- Intake limits default to 1–10 items/receipt, 5 images/item, 5 MiB/image. Override
  `MIN_CONSIGNMENT_ITEMS`, `MAX_CONSIGNMENT_ITEMS`, `MAX_IMAGES_PER_ITEM`,
  `MAX_IMAGE_BYTES` as needed. The API also caps complete requests at 55 MiB.

Disable automatic build-argument injection in Advanced. Assign the HTTPS domain to
**app**, internal port **3000** only. Init services, PostgreSQL and MinIO must not
have public domains. No host database/S3/console ports are published.

## What Deploy does

1. Builds the app, MinIO and the pinned-source mc initialization image on the server.
2. Starts PostgreSQL and MinIO and waits for healthchecks.
3. `app-init` runs `prisma migrate deploy`, then creates the first admin only if the
   admin table is empty. It never runs a synthetic seed or resets accounts.
4. `minio-init` creates `besties-media` if absent, checks privacy and the exact
   object-only policy (ignoring descriptive statement IDs), creates the app user
   if absent and attaches its policy. Existing passwords are not reset. Public
   buckets, unexpected policies/groups and disabled users fail closed. A unique
   temporary object verifies Put/Get/Delete access and is removed afterward.
5. The app starts only after both init services exit successfully.

An exited init container with exit code **0** is expected. If either job fails,
inspect logs, fix configuration, and Deploy again; do not bypass dependencies.
Serialize deployments: concurrent bootstrap runs are unsupported. Migration
conflicts/failures require operator review.

CLI equivalent with secrets already configured:

```sh
docker compose -f docker-compose-coolify.yaml up -d --build
```

On Coolify, reload Compose from Git and click Deploy. Do not treat the rendered
Git-backed Compose view as the source of truth.

## Data safety and limitations

Keep the same Coolify resource and named volumes: `postgres_data`, `minio_data`,
`app_private_data`. Never use `down -v`. A different resource creates new volumes;
local data are not copied automatically. Changing PostgreSQL environment variables
does not change an existing database role/password.

Back up database and all volumes to independent storage before migrations and
verify restores. Compose does not configure backups, migrate historical images,
provision migration-only IAM, schedule image cleanup or perform security audits.
Pinned builds do not guarantee production security/future patch support; retain
the review requirements in `minio-operations.md`.

This update has YAML and JavaScript syntax validation only until the fresh-stack
and repeat-deploy flows are verified in a disposable environment. Do not treat
the previously deployed manual bootstrap as proof of this new initialization flow.
