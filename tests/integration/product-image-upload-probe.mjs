// Runs ONLY inside the miniature copied site with disposable DATABASE_URL/S3 environment.
import { createHash, randomBytes } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { S3Client, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const db = new PrismaClient();
const s3 = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION, forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } });
const base = `http://127.0.0.1:${process.env.TEST_APP_PORT}`;
const checks = [];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (name, pass, detail) => { checks.push({ name, pass: Boolean(pass), detail }); if (!pass) throw Error(`${name}: ${detail}`); };
const objects = async () => (await s3.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET }))).Contents?.map(x => x.Key).sort() ?? [];
const counts = async () => {
  const rows = await db.$queryRawUnsafe(`SELECT (SELECT count(*)::int FROM consignments) consignments, (SELECT count(*)::int FROM items) items, (SELECT count(*)::int FROM item_images) images, (SELECT count(*)::int FROM intake_requests) intakes, (SELECT count(*)::int FROM item_status_events) events`);
  return rows[0];
};
const form = (category, fixture, name = 'Isolated copied fixture') => {
  const f = new FormData(); f.set('name', 'Integration Example'); f.set('phone', '0912345678'); f.set('consent', 'true'); f.set('intakeType', 'consign');
  f.set('items', JSON.stringify([{ name, category, description: 'Disposable fixture upload', condition: 'Good', desiredPrice: 100000 }]));
  f.append('images.0', new Blob([fixture], { type: 'image/webp' }), 'copied.webp'); return f;
};
const send = async (path, method, body, headers = {}) => {
  const response = await fetch(`${base}${path}`, { method, body, headers });
  return { status: response.status, json: await response.json() };
};
const intake = (f, key, headers = {}) => send('/api/consignments', 'POST', f, { 'idempotency-key': key, ...headers });
// Mini Next normalizes request.url to localhost even when bound at 127.0.0.1;
// use its observed origin for authenticated same-origin mutations only.
let adminOrigin = base;
const patch = (id, f, cookie, origin = adminOrigin) => send(`/api/admin/items/${id}/images`, 'PATCH', f, { cookie: `admin_session=${cookie}`, origin, 'sec-fetch-site': 'same-origin' });
const imageForm = (timestamp, fixture) => { const f = new FormData(); f.set('updatedAt', timestamp); f.set('remove', '[]'); f.append('images', new Blob([fixture], { type: 'image/webp' }), 'copied.webp'); return f; };
let result = 'fail', failure;
try {
  const fixture = await readFile(process.env.TEST_FIXTURE);
  const fixtureHash = hash(fixture);
  const originalFiles = await readdir(process.env.CONSIGNMENT_STORAGE_DIR);
  const originalObjects = await objects();
  check('empty-disposable-bucket', originalObjects.length === 0, JSON.stringify(originalObjects));
  const category = await db.itemCategory.findFirst({ where: { active: true }, select: { slug: true } });
  check('fixture-active-category', !!category, category?.slug ?? 'none');
  const before = await counts();
  const missingAuth = await patch(randomBytes(16).toString('hex'), imageForm(new Date().toISOString(), fixture), 'invalid');
  check('admin-unauthenticated-401', missingAuth.status === 401, JSON.stringify(missingAuth));
  const crossOrigin = await intake(form(category.slug, fixture), randomBytes(20).toString('hex'), { origin: 'https://untrusted.invalid' });
  check('consignment-cross-origin-403', crossOrigin.status === 403, JSON.stringify(crossOrigin));
  const invalid = await intake(form('category-not-present-' + randomBytes(6).toString('hex'), fixture), randomBytes(20).toString('hex'));
  check('consignment-invalid-category-422', invalid.status === 422, JSON.stringify(invalid));
  check('rejected-upload-no-object-or-db', (await objects()).length === 0 && JSON.stringify(await counts()) === JSON.stringify(before), '403 and 422 leave no S3 object and no receipt');
  const key = randomBytes(24).toString('hex');
  const created = await intake(form(category.slug, fixture), key);
  check('consignment-201', created.status === 201 && /^HUN-[A-F0-9]{32}$/.test(created.json.public_code), JSON.stringify(created));
  const receipt = await db.consignment.findUnique({ where: { publicCode: created.json.public_code }, include: { items: { include: { images: true } }, intakeRequests: true } });
  const consignmentKey = receipt?.items[0]?.images[0]?.storageKey;
  check('consignment-db-committed', receipt?.items.length === 1 && receipt.items[0].status === 'PENDING' && receipt.items[0].images.length === 1 && receipt.intakeRequests.length === 1 && receipt.intakeRequests[0].key === key, `item=${receipt?.items[0]?.id} object=${consignmentKey}`);
  const retry = await intake(form(category.slug, fixture), key);
  check('consignment-idempotent-200', retry.status === 200 && retry.json.public_code === created.json.public_code && (await objects()).length === 1, JSON.stringify(retry));
  const mismatch = await intake(form(category.slug, fixture, 'Different item'), key);
  check('consignment-idempotency-conflict-409', mismatch.status === 409 && (await objects()).length === 1, JSON.stringify(mismatch));
  const adminToken = randomBytes(32).toString('base64url');
  const admin = await db.adminUser.create({ data: { email: `integration-${randomBytes(8).toString('hex')}@example.invalid`, active: true, role: 'ADMIN', providerSubject: `isolated-${randomBytes(16).toString('hex')}` } });
  await db.adminSession.create({ data: { adminId: admin.id, tokenHash: hash(Buffer.from(adminToken)), expiresAt: new Date(Date.now() + 3600000) } });
  const originProbe = await fetch(`${base}/api/test-origin`, { headers: { origin: base, 'sec-fetch-site': 'same-origin' } }).then(response => response.json());
  check('mini-next-same-origin-diagnostic', new URL(originProbe.url).hostname === 'localhost' && new URL(originProbe.url).port === new URL(base).port && originProbe.origin === base && originProbe.fetchSite === 'same-origin', JSON.stringify(originProbe));
  adminOrigin = new URL(originProbe.url).origin;
  const denied = await patch(receipt.items[0].id, imageForm(receipt.items[0].updatedAt.toISOString(), fixture), adminToken, 'https://untrusted.invalid');
  check('admin-authenticated-cross-origin-403', denied.status === 403 && (await objects()).length === 1, JSON.stringify(denied));
  const bad = new FormData(); bad.set('updatedAt', 'not-a-date'); bad.set('remove', '[]'); bad.append('images', new Blob([fixture], { type: 'image/webp' }), 'copied.webp');
  const invalidAdmin = await patch(receipt.items[0].id, bad, adminToken);
  check('admin-invalid-form-422', invalidAdmin.status === 422 && (await objects()).length === 1, JSON.stringify(invalidAdmin));
  const oldTimestamp = receipt.items[0].updatedAt.toISOString();
  const uploaded = await patch(receipt.items[0].id, imageForm(oldTimestamp, fixture), adminToken);
  check('admin-authorized-upload-200', uploaded.status === 200 && uploaded.json.success === true, JSON.stringify(uploaded));
  const itemAfter = await db.item.findUnique({ where: { id: receipt.items[0].id }, include: { images: true, statusEvents: true } });
  const adminKey = itemAfter?.images.find(x => x.storageKey !== consignmentKey)?.storageKey;
  check('admin-db-commit', itemAfter.images.length === 2 && !!adminKey && itemAfter.statusEvents.some(x => x.actorAdminId === admin.id), `adminKey=${adminKey}, events=${itemAfter.statusEvents.length}`);
  for (const remoteKey of [consignmentKey, adminKey]) {
    const got = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: remoteKey }));
    const bytes = Buffer.from(await got.Body.transformToByteArray());
    const head = await s3.send(new HeadObjectCommand({ Bucket: process.env.S3_BUCKET, Key: remoteKey }));
    check(`remote-object-hash-${remoteKey.slice(0, 8)}`, bytes.length > 0 && hash(bytes) === head.Metadata?.sha256 && head.ContentType === 'image/webp' && bytes[0] === 82 && bytes[1] === 73, `SHA256=${hash(bytes)}, size=${bytes.length}, fixtureSHA256=${fixtureHash} (Sharp re-encodes input)`);
  }
  const committed = await counts(); const twoObjects = await objects();
  const conflict = await patch(receipt.items[0].id, imageForm(oldTimestamp, fixture), adminToken);
  check('admin-stale-409-rolls-back-s3', conflict.status === 409 && JSON.stringify(await objects()) === JSON.stringify(twoObjects) && JSON.stringify(await counts()) === JSON.stringify(committed), JSON.stringify(conflict));
  // A trigger in the disposable snapshot forces a DB failure AFTER S3 PutObject, exercising the real route finally cleanup.
  await db.$executeRawUnsafe(`CREATE FUNCTION integration_reject_intake() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'disposable rollback test'; END $$`);
  await db.$executeRawUnsafe(`CREATE TRIGGER integration_reject_intake BEFORE INSERT ON intake_requests FOR EACH ROW EXECUTE FUNCTION integration_reject_intake()`);
  const rejected = await intake(form(category.slug, fixture), randomBytes(24).toString('hex'));
  check('consignment-db-error-500-rolls-back-s3', rejected.status === 500 && JSON.stringify(await objects()) === JSON.stringify(twoObjects) && JSON.stringify(await counts()) === JSON.stringify(committed), JSON.stringify(rejected));
  const finalFiles = await readdir(process.env.CONSIGNMENT_STORAGE_DIR);
  check('no-new-local-product-files', JSON.stringify(finalFiles.sort()) === JSON.stringify(originalFiles.sort()) && hash(await readFile(process.env.TEST_FIXTURE)) === fixtureHash, `private root ${JSON.stringify(finalFiles)}`);
  result = 'pass';
} catch (error) { failure = String(error?.stack ?? error); }
finally {
  await writeFile(process.env.TEST_PROBE_REPORT, JSON.stringify({ result, checks, failure, finishedAt: new Date().toISOString() }, null, 2));
  await db.$disconnect(); s3.destroy();
}
if (result !== 'pass') { console.error(failure); process.exitCode = 1; }
