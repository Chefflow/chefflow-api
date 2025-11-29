-- CreateEnum
CREATE TYPE "public"."AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'APPLE', 'GITHUB');

-- CreateTable
CREATE TABLE "public"."User" (
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "hashedRefreshToken" TEXT,
    "name" TEXT,
    "image" TEXT,
    "provider" "public"."AuthProvider" NOT NULL DEFAULT 'LOCAL',
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("username")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "idx_user_provider_lookup" ON "public"."User"("provider", "providerId");

-- CreateIndex
CREATE INDEX "idx_user_created_at" ON "public"."User"("createdAt");
