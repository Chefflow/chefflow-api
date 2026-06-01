import { execSync } from 'node:child_process';

const DEV_DB_HOSTS = ['localhost:5432', '127.0.0.1:5432'];

export default function globalSetup(): void {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Run e2e via "pnpm run test:e2e" so .env.test is loaded.',
    );
  }

  // Hard safety: refuse to run against the dev DB even if .env.test is misconfigured.
  // e2e tests call deleteMany() across tables and would wipe real data.
  if (DEV_DB_HOSTS.some((host) => url.includes(host))) {
    throw new Error(
      `Refusing to run e2e: DATABASE_URL points at the dev DB (${url}). ` +
        'Check .env.test points at the postgres-test container (port 5433).',
    );
  }

  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}
