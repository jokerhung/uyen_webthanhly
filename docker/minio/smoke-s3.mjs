// Isolated smoke test only; endpoint and short-lived credentials are injected by build-smoke.ps1.
import assert from 'node:assert/strict';
import { S3Client, CreateBucketCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, DeleteBucketCommand } from '@aws-sdk/client-s3';

const { SMOKE_ENDPOINT, SMOKE_ACCESS_KEY, SMOKE_SECRET_KEY } = process.env;
assert.ok(SMOKE_ENDPOINT && SMOKE_ACCESS_KEY && SMOKE_SECRET_KEY, 'missing isolated smoke environment');
const s3 = new S3Client({
  endpoint: SMOKE_ENDPOINT,
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: { accessKeyId: SMOKE_ACCESS_KEY, secretAccessKey: SMOKE_SECRET_KEY },
});
const Bucket = 'smoke-' + process.pid.toString(36);
const Key = 'verify.txt';
try {
  await s3.send(new CreateBucketCommand({ Bucket }));
  await s3.send(new PutObjectCommand({ Bucket, Key, Body: 'pinned minio smoke' }));
  const object = await s3.send(new GetObjectCommand({ Bucket, Key }));
  assert.equal(await object.Body.transformToString(), 'pinned minio smoke');
  await s3.send(new DeleteObjectCommand({ Bucket, Key }));
  await s3.send(new DeleteBucketCommand({ Bucket }));
  console.log('S3 create/put/get/delete/bucket-delete passed');
} finally {
  s3.destroy();
}
