import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

const dir = mkdtempSync('/tmp/besties-mc-');
const env = { ...process.env, MC_CONFIG_DIR: dir, MC_NO_COLOR: '1' };
function run(args, input) {
  const r = spawnSync('mc', args, { env, input, encoding: 'utf8', timeout: 60000 });
  return { ok: r.status === 0, output: r.stdout ?? '', error: r.stderr ?? '' };
}
function must(args, input) {
  const r = run(args, input);
  if (!r.ok) throw new Error('MinIO command failed'); // Never log commands or credential-bearing output.
  return r.output;
}
function missing(r, kind) {
  // Only an explicit missing-entity response permits creation; transport/auth errors fail closed.
  return !r.ok && new RegExp(`NoSuch${kind}`, 'i').test(r.output + r.error);
}
function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).filter(k => k !== 'Sid').sort().map(k => [k, canonical(v[k])]));
  return v;
}
try {
  const root = env.MINIO_ROOT_USER, rootSecret = env.MINIO_ROOT_PASSWORD;
  const user = env.S3_ACCESS_KEY_ID, secret = env.S3_SECRET_ACCESS_KEY;
  if (![root, rootSecret, user, secret, env.MINIO_URL].every(Boolean)
    || user === root || secret === rootSecret || /[\r\n]/.test(user + secret)) throw new Error('Invalid credentials');
  must(['alias', 'set', 'bootstrap', env.MINIO_URL, root, rootSecret]);
  must(['ready', 'bootstrap']);
  const bucket = 'bootstrap/besties-media';
  must(['mb', '--ignore-existing', bucket]);
  // Do not silently change privacy on an existing bucket.
  if (!must(['anonymous', 'get', bucket]).includes('`private`')) throw new Error('Bucket must be private');

  const policyFile = `${dir}/policy.json`;
  const policy = run(['--json', 'admin', 'policy', 'info', 'bootstrap', 'besties-app', '--policy-file', policyFile]);
  if (policy.ok) {
    const actual = canonical(JSON.parse(readFileSync(policyFile, 'utf8')));
    const expected = canonical(JSON.parse(readFileSync('/bootstrap/app-policy.json', 'utf8')));
    if (!isDeepStrictEqual(actual, expected)) throw new Error('Existing policy differs; operator review required');
  } else if (missing(policy, 'Policy')) {
    must(['admin', 'policy', 'create', 'bootstrap', 'besties-app', '/bootstrap/app-policy.json']);
  } else throw new Error('Cannot inspect policy');

  let info = run(['--json', 'admin', 'user', 'info', 'bootstrap', user]);
  if (missing(info, 'User')) {
    must(['admin', 'user', 'add', 'bootstrap'], `${user}\n${secret}\n`);
    info = run(['--json', 'admin', 'user', 'info', 'bootstrap', user]);
  }
  if (!info.ok) throw new Error('Cannot inspect user');
  const u = JSON.parse(info.output);
  if (u.userStatus !== 'enabled' || (u.memberOf ?? []).length
    || (u.policyName && u.policyName !== 'besties-app')) throw new Error('Existing IAM requires review');
  if (!u.policyName) must(['admin', 'policy', 'attach', 'bootstrap', 'besties-app', '--user', user]);
  must(['alias', 'set', 'app', env.MINIO_URL, user, secret, '--api', 'S3v4']);
  // Verify the existing secret without rotating it. Touch only a unique probe object.
  const probe = `app/besties-media/.bootstrap-check/${randomUUID()}`;
  const body = randomUUID();
  must(['pipe', probe], body);
  try {
    if (must(['cat', probe]) !== body) throw new Error('Object verification failed');
  } finally {
    must(['rm', probe]);
  }
  console.log('Private bucket and scoped application IAM ready; existing passwords preserved.');
} catch {
  console.error('MinIO initialization failed: check credentials, private bucket and existing IAM policy. No secret values logged.');
  process.exitCode = 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
