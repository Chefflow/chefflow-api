-- CreateEnum
CREATE TYPE "RecipeStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- DropIndex
DROP INDEX "Recipe_userId_idx";

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "status" "RecipeStatus" NOT NULL DEFAULT 'PUBLISHED',
ALTER COLUMN "title" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Recipe_userId_status_idx" ON "Recipe"("userId", "status");
