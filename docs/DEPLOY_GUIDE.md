Here is the complete documentation in English, formatted in Markdown so you can easily copy and paste it into a DOCKER_GUIDE.md or README.md file in your repository.

## 🚀 Deployment Documentation: Chefflow API

This guide explains the multi-stage Docker architecture and the boot process designed specifically for NestJS and Prisma 7.

### 🏗️ Docker Architecture

The deployment uses a Multi-stage Build to optimize image size, security, and build performance.

#### 1. Build Stage (Builder)

- Base Image: node:24-slim.

- Why Slim? We use the slim version instead of alpine to ensure native compatibility with Prisma’s query engine binaries (avoiding glibc vs musl library conflicts common in Alpine).

- Prisma 7 Config: During pnpm prisma generate, Prisma 7 reads prisma.config.ts. A fallback URL is used in the config to allow the build to succeed even without a live database connection.

- Compilation: Generates the dist/ folder. NestJS might change the internal structure (e.g., dist/main.js vs dist/src/main.js) depending on your tsconfig settings.

#### 2. Runtime Stage (Production)

- Non-Root User: We create a nestjs user with a physical HOME directory (/home/nestjs). This is critical because tools like npm or prisma attempt to write temporary cache files and will fail with EACCES errors if the home directory is missing or read-only.

- Full App Copy: We copy the entire /app directory from the builder to ensure all Prisma binaries and the prisma.config.ts file are present.

### 🚦 The Startup Script (entrypoint.sh)

This script acts as the "orchestrator" for the container. It prepares the environment before launching the NestJS application.

#### Execution Flow:

- Automated Migrations: \* Instead of using npx (which tries to download Prisma from the internet and causes permission issues), we invoke the Prisma CLI source file directly: node ./node_modules/prisma/build/index.js.
  - It runs migrate deploy, which synchronizes the production database with your migration files without data loss.

- Dynamic App Detection:
  - To prevent MODULE_NOT_FOUND errors, the script uses find dist -name "main.js".

  - This makes the deployment robust: regardless of whether NestJS compiles to the root of dist/ or a subfolder like dist/src/, the script will always find the entry point.

- Process Management (exec):
  - We use exec node ... to replace the shell process with the Node.js process. This ensures the app receives termination signals (SIGTERM) correctly, allowing for graceful shutdowns.

### 🛠️ Maintenance & Troubleshooting

#### How do I add a new migration?

Simply create your migration locally as usual: npx prisma migrate dev. When you push the code and Dockploy deploys it, the entrypoint.sh will automatically detect the new files in prisma/migrations and apply them before starting the API.

#### Why use dumb-init?

Node.js was not designed to run as PID 1 (the primary process) in a container. dumb-init acts as a minimal init system that handles signal forwarding and reaps zombie processes, keeping your container healthy.

#### What if I want to use Alpine in the future?

If you switch to Alpine to save space, you must install libc6-compat and add binaryTargets = ["native", "linux-musl-openssl-3.0.x"] to your schema.prisma generator block. For now, the Slim version is significantly more stable and easier to maintain.
