#!/usr/bin/env node
// Run only against an explicitly configured disposable/local bucket with distinct scoped identities.
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command, ListBucketsCommand } from "@aws-sdk/client-s3";

const required = ["S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_MIGRATION_ACCESS_KEY_ID", "S3_MIGRATION_SECRET_ACCESS_KEY"];
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`);
const { S3_ENDPOINT: endpoint, S3_REGION: region, S3_BUCKET: Bucket } = process.env;
assert.equal(Bucket, "besties-media");
assert.match(endpoint, /^http:\/\/(127\.0\.0\.1|localhost):9000\/?$/);
assert.notEqual(process.env.S3_ACCESS_KEY_ID, process.env.S3_MIGRATION_ACCESS_KEY_ID);
const build = (accessKeyId, secretAccessKey) => new S3Client({ endpoint, region, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey }, maxAttempts: 1 });
const app = build(process.env.S3_ACCESS_KEY_ID, process.env.S3_SECRET_ACCESS_KEY);
const migration = build(process.env.S3_MIGRATION_ACCESS_KEY_ID, process.env.S3_MIGRATION_SECRET_ACCESS_KEY);
const anonymous = new S3Client({ endpoint, region, forcePathStyle: true, credentials: { accessKeyId: "anonymous-probe", secretAccessKey: "anonymous-probe" }, maxAttempts: 1 });
const Key = `${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}.webp`;
const Body = Buffer.from("local-iam-check-do-not-use-as-product-image");
const denied = async (promise, action) => {
  try { await promise; throw new Error(`${action} unexpectedly allowed`); }
  catch (error) { if (error?.message === `${action} unexpectedly allowed`) throw error; assert.equal(error?.$metadata?.httpStatusCode, 403, `${action}: expected HTTP 403, got ${error?.name}: ${error?.message}`); }
};
let inserted = false;
try {
  await app.send(new PutObjectCommand({ Bucket, Key, Body })); inserted = true;
  const read = await app.send(new GetObjectCommand({ Bucket, Key }));
  assert.deepEqual(Buffer.from(await read.Body.transformToByteArray()), Body);
  assert.equal(Number((await app.send(new HeadObjectCommand({ Bucket, Key }))).ContentLength), Body.length);
  await denied(app.send(new ListObjectsV2Command({ Bucket })), "app ListBucket");
  await denied(app.send(new ListBucketsCommand({})), "app ListBuckets");
  await denied(migration.send(new DeleteObjectCommand({ Bucket, Key })), "migration DeleteObject");
  const secondKey = `${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}.webp`;
  await migration.send(new PutObjectCommand({ Bucket, Key: secondKey, Body }));
  try {
    const migrated = await migration.send(new GetObjectCommand({ Bucket, Key: secondKey }));
    assert.deepEqual(Buffer.from(await migrated.Body.transformToByteArray()), Body);
  } finally { await app.send(new DeleteObjectCommand({ Bucket, Key: secondKey })); }
  const listed = await migration.send(new ListObjectsV2Command({ Bucket, Prefix: Key }));
  assert.ok(listed.Contents?.some(row => row.Key === Key));
  const copied = await migration.send(new GetObjectCommand({ Bucket, Key }));
  assert.deepEqual(Buffer.from(await copied.Body.transformToByteArray()), Body);
  await denied(anonymous.send(new GetObjectCommand({ Bucket, Key })), "anonymous GetObject");
  await denied(anonymous.send(new ListObjectsV2Command({ Bucket })), "anonymous ListBucket");
  await denied(app.send(new PutObjectCommand({ Bucket: `${Bucket}-outside`, Key, Body })), "app other bucket PutObject");
  await denied(migration.send(new PutObjectCommand({ Bucket: `${Bucket}-outside`, Key, Body })), "migration other bucket PutObject");
  console.log(JSON.stringify({ result: "pass", bucket: Bucket, checked: ["app put/get/head/delete", "app list denied", "migration list/get and delete denied", "anonymous read/list denied", "other bucket put denied"], key: Key }));
} finally {
  if (inserted) await app.send(new DeleteObjectCommand({ Bucket, Key }));
  app.destroy(); migration.destroy(); anonymous.destroy();
}
