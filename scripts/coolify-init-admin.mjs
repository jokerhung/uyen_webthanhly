// Only the one-shot init service receives these bootstrap credentials.
import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
try {
  // Never reset passwords, reactivate users, or add another admin on redeploy.
  if (await db.adminUser.count()) {
    console.log('Existing admin accounts preserved.');
  } else {
    const email = (process.env.INITIAL_ADMIN_EMAIL ?? '').trim().toLowerCase();
    const password = process.env.INITIAL_ADMIN_PASSWORD ?? '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320
      || password.length < 12 || Buffer.byteLength(password) > 1024) {
      throw new Error('Set INITIAL_ADMIN_EMAIL and a 12+ character INITIAL_ADMIN_PASSWORD for a fresh database.');
    }
    const salt = randomBytes(16);
    const digest = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    const passwordHash = `scrypt$16384$8$1$${salt.toString('base64url')}$${digest.toString('base64url')}`;
    await db.adminUser.create({ data: { email, passwordHash, active: true, role: 'ADMIN' } });
    console.log('Initial admin created. Remove bootstrap password from Coolify after deployment.');
  }
} catch {
  console.error('Admin initialization failed. Check database and INITIAL_ADMIN_* configuration. Existing accounts were not reset.');
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
