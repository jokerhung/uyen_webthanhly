#!/bin/sh
# Explicit one-time bootstrap; never run automatically on container startup.
set -eu

: "${MC:?Set MC to a verified, pinned mc executable path}"
: "${MINIO_ROOT_USER:?Set root username}"
: "${MINIO_ROOT_PASSWORD:?Set root password}"
: "${S3_ACCESS_KEY_ID:?Set distinct application user}"
: "${S3_SECRET_ACCESS_KEY:?Set application password}"
: "${S3_MIGRATION_ACCESS_KEY_ID:?Set distinct migration user}"
: "${S3_MIGRATION_SECRET_ACCESS_KEY:?Set migration password}"

[ "$S3_ACCESS_KEY_ID" != "$MINIO_ROOT_USER" ] && [ "$S3_MIGRATION_ACCESS_KEY_ID" != "$MINIO_ROOT_USER" ] && [ "$S3_ACCESS_KEY_ID" != "$S3_MIGRATION_ACCESS_KEY_ID" ] || {
  echo 'Root, app, and migration usernames must differ' >&2; exit 1;
}
[ "$S3_SECRET_ACCESS_KEY" != "$MINIO_ROOT_PASSWORD" ] && [ "$S3_MIGRATION_SECRET_ACCESS_KEY" != "$MINIO_ROOT_PASSWORD" ] && [ "$S3_SECRET_ACCESS_KEY" != "$S3_MIGRATION_SECRET_ACCESS_KEY" ] || {
  echo 'Root, app, and migration passwords must differ' >&2; exit 1;
}

# These static JSON policies target exactly one bucket. Never silently apply
# them to a different name; create and audit another policy for that case.
S3_BUCKET=${S3_BUCKET:-besties-media}
[ "$S3_BUCKET" = besties-media ] || { echo 'Policies target besties-media only' >&2; exit 1; }
MINIO_URL=${MINIO_URL:-http://127.0.0.1:9000}
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
export MC_CONFIG_DIR="$(mktemp -d)"
trap 'rm -rf "$MC_CONFIG_DIR"' EXIT HUP INT TERM

"$MC" alias set bootstrap "$MINIO_URL" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
"$MC" ready bootstrap >/dev/null
# Existing IAM is not safe to reuse without manual inspection: a matching
# policy name could carry broader permissions or users could have extra grants.
for policy in besties-app besties-migration; do
  if "$MC" admin policy info bootstrap "$policy" >/dev/null 2>&1; then
    echo "Policy $policy already exists; review IAM manually; refusing automatic changes" >&2
    exit 1
  fi
done
for user in "$S3_ACCESS_KEY_ID" "$S3_MIGRATION_ACCESS_KEY_ID"; do
  if "$MC" admin user info bootstrap "$user" >/dev/null 2>&1; then
    echo "User $user already exists; review IAM manually; refusing automatic changes" >&2
    exit 1
  fi
done
# Existing buckets are never modified automatically. An operator must review
# their region and anonymous policy; fresh buckets default private and we set
# anonymous none explicitly.
if "$MC" ls "bootstrap/$S3_BUCKET" >/dev/null 2>&1; then
  echo "Existing bucket $S3_BUCKET: verify region and anonymous policy manually; no bucket policy changed" >&2
else
  "$MC" mb "bootstrap/$S3_BUCKET"
  "$MC" anonymous set none "bootstrap/$S3_BUCKET"
fi
"$MC" admin policy create bootstrap besties-app "$SCRIPT_DIR/app-policy.json"
"$MC" admin policy create bootstrap besties-migration "$SCRIPT_DIR/migration-policy.json"
"$MC" admin user add bootstrap "$S3_ACCESS_KEY_ID" "$S3_SECRET_ACCESS_KEY"
"$MC" admin user add bootstrap "$S3_MIGRATION_ACCESS_KEY_ID" "$S3_MIGRATION_SECRET_ACCESS_KEY"
"$MC" admin policy attach bootstrap besties-app --user "$S3_ACCESS_KEY_ID"
"$MC" admin policy attach bootstrap besties-migration --user "$S3_MIGRATION_ACCESS_KEY_ID"
echo 'Bootstrap finished; verify bucket privacy, policy contents and access checks before cutover. Re-runs stop for IAM review.'
