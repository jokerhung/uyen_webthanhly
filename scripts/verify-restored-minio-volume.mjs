#!/usr/bin/env node
// Executed only inside the private, disposable Docker network by minio-volume-restore-drill.ps1.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { S3Client, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, ListBucketsCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const { DRILL_ENDPOINT: endpoint, DRILL_MANIFEST: manifestPath, DRILL_REPORT: reportPath, S3_BUCKET: Bucket } = process.env;
assert.match(endpoint ?? '', /^http:\/\/drill-[a-z0-9-]+:9000$/);
assert.equal(Bucket, 'besties-media');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
assert.equal(manifest.version, 1);
assert.equal(manifest.bucket, Bucket);
assert.equal(manifest.items?.length, 4, 'expected exactly four product objects');
assert.equal(new Set(manifest.items.map(x => x.key)).size, 4);
for (const row of manifest.items) {
  assert.match(row.key, /^[a-f0-9]{64}\.webp$/);
  assert.match(row.sha256, /^[a-f0-9]{64}$/);
  assert.ok(Number.isSafeInteger(row.size) && row.size > 0);
  assert.ok(['verified-existing', 'copied-verified'].includes(row.status));
}
const identity = (user, password) => {
  assert.ok(user && password);
  return new S3Client({ endpoint, region: 'us-east-1', forcePathStyle: true, maxAttempts: 1, credentials: { accessKeyId: user, secretAccessKey: password } });
};
assert.equal(new Set([process.env.MINIO_ROOT_USER, process.env.S3_ACCESS_KEY_ID, process.env.S3_MIGRATION_ACCESS_KEY_ID]).size, 3);
const root = identity(process.env.MINIO_ROOT_USER, process.env.MINIO_ROOT_PASSWORD);
const app = identity(process.env.S3_ACCESS_KEY_ID, process.env.S3_SECRET_ACCESS_KEY);
const migration = identity(process.env.S3_MIGRATION_ACCESS_KEY_ID, process.env.S3_MIGRATION_SECRET_ACCESS_KEY);
const denied = async (action, promise) => {
  try { await promise; throw new Error(`${action} unexpectedly permitted`); }
  catch (err) { if (err.message === `${action} unexpectedly permitted`) throw err; assert.equal(err?.$metadata?.httpStatusCode, 403, `${action}: expected 403`); }
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const results = [];
const probes = [];
try {
  const buckets = await root.send(new ListBucketsCommand({}));
  assert.ok(buckets.Buckets?.some(b => b.Name === Bucket));
  const listed = await migration.send(new ListObjectsV2Command({ Bucket }));
  for (const row of manifest.items) {
    assert.ok(listed.Contents?.some(x => x.Key === row.key), `missing manifest key ${row.key}`);
    const object = await app.send(new GetObjectCommand({ Bucket, Key: row.key }));
    const bytes = Buffer.from(await object.Body.transformToByteArray());
    assert.equal(bytes.length, row.size, `size mismatch ${row.key}`);
    assert.equal(sha(bytes), row.sha256, `SHA256 mismatch ${row.key}`);
    const head = await app.send(new HeadObjectCommand({ Bucket, Key: row.key }));
    assert.equal(Number(head.ContentLength), row.size);
    const migrationRead = await migration.send(new GetObjectCommand({ Bucket, Key: row.key }));
    assert.equal(sha(Buffer.from(await migrationRead.Body.transformToByteArray())), row.sha256);
    results.push({ key: row.key, size: row.size, sha256: row.sha256 });
  }
  await denied('app ListBucket', app.send(new ListObjectsV2Command({ Bucket })));
  await denied('app ListBuckets', app.send(new ListBucketsCommand({})));
  await denied('migration DeleteObject', migration.send(new DeleteObjectCommand({ Bucket, Key: manifest.items[0].key })));
  await denied('app other bucket Put', app.send(new PutObjectCommand({ Bucket: `${Bucket}-outside`, Key: 'drill', Body: 'x' })));
  await denied('migration other bucket Put', migration.send(new PutObjectCommand({ Bucket: `${Bucket}-outside`, Key: 'drill', Body: 'x' })));
  const anonObject = await fetch(`${endpoint}/${Bucket}/${manifest.items[0].key}`);
  assert.equal(anonObject.status, 403, 'anonymous GetObject must be private');
  const anonList = await fetch(`${endpoint}/${Bucket}?list-type=2`);
  assert.equal(anonList.status, 403, 'anonymous ListBucket must be private');
  const appKey = `drill-app-${randomUUID()}`;
  const migrationKey = `drill-migration-${randomUUID()}`;
  const bytes = Buffer.from('disposable restore IAM probe');
  await app.send(new PutObjectCommand({ Bucket, Key: appKey, Body: bytes })); probes.push(appKey);
  assert.equal(sha(Buffer.from(await (await app.send(new GetObjectCommand({ Bucket, Key: appKey }))).Body.transformToByteArray())), sha(bytes));
  await migration.send(new PutObjectCommand({ Bucket, Key: migrationKey, Body: bytes })); probes.push(migrationKey);
  await denied('migration probe DeleteObject', migration.send(new DeleteObjectCommand({ Bucket, Key: migrationKey })));
  await app.send(new DeleteObjectCommand({ Bucket, Key: appKey })); probes.splice(probes.indexOf(appKey), 1);
  await app.send(new DeleteObjectCommand({ Bucket, Key: migrationKey })); probes.splice(probes.indexOf(migrationKey), 1);
  const report = { result: 'pass', verifiedAt: new Date().toISOString(), volumeRestore: true, productObjects: results, iam: ['root lists bucket', 'app get/head/put/delete; list denied', 'migration list/get/put; delete denied', 'both other-bucket writes denied', 'anonymous object and bucket reads denied'] };
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log('PASS: four manifest byte SHA256 checks and isolated restored IAM/privacy checks; evidence saved under .private');
} finally {
  for (const key of probes) { try { await app.send(new DeleteObjectCommand({ Bucket, Key: key })); } catch { /* disposable volume is discarded */ } }
  root.destroy(); app.destroy(); migration.destroy();
}
