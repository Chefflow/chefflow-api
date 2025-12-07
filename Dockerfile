# ============================
# Base: habilita pnpm
# ============================
FROM node:20 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# ============================
# Dependencies
# ============================
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ============================
# Build (NestJS + Prisma)
# ============================
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpx prisma generate
RUN pnpm build

# ============================
# Production Image
# ============================
FROM node:20 AS production
ENV NODE_ENV=production

WORKDIR /app

# Instala solo dependencias de producción + Prisma CLI
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --prod --frozen-lockfile && pnpm add -D prisma

# Copia el resultado de la build
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./

# Genera Prisma Client en producción
RUN pnpx prisma generate

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
