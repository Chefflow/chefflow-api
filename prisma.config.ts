import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    // Valid PostgreSQL URL for build-time (does not connect, only generates types)
    // In runtime, docker-compose.yml passes the real DATABASE_URL
    url:
      process.env.DATABASE_URL ||
      'postgresql://user:password@localhost:5432/chefflow?schema=public',
  },
});
