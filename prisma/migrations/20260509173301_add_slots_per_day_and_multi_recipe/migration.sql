-- AlterTable: add slotsPerDay to User
ALTER TABLE "User" ADD COLUMN "slotsPerDay" INTEGER NOT NULL DEFAULT 3;

-- AlterTable: add slotsPerDay to WeeklyPlanning (immutable snapshot enforced in service layer)
ALTER TABLE "WeeklyPlanning" ADD COLUMN "slotsPerDay" INTEGER NOT NULL DEFAULT 3;

-- AlterTable: add createdAt / updatedAt to WeeklyPlanningSlot.
-- Default CURRENT_TIMESTAMP on updatedAt allows existing rows to satisfy the NOT NULL constraint
-- on the @updatedAt column; subsequent updates will be managed by Prisma.
ALTER TABLE "WeeklyPlanningSlot" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WeeklyPlanningSlot" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable: junction table for multi-recipe slots
CREATE TABLE "WeeklyPlanningSlotRecipe" (
    "id" SERIAL NOT NULL,
    "slotId" INTEGER NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyPlanningSlotRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyPlanningSlotRecipe_slotId_idx" ON "WeeklyPlanningSlotRecipe"("slotId");

-- CreateIndex
CREATE INDEX "WeeklyPlanningSlotRecipe_recipeId_idx" ON "WeeklyPlanningSlotRecipe"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlanningSlotRecipe_slotId_recipeId_key" ON "WeeklyPlanningSlotRecipe"("slotId", "recipeId");

-- AddForeignKey
ALTER TABLE "WeeklyPlanningSlotRecipe" ADD CONSTRAINT "WeeklyPlanningSlotRecipe_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "WeeklyPlanningSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlanningSlotRecipe" ADD CONSTRAINT "WeeklyPlanningSlotRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: backfill the junction with one row per existing slot at position 1.
-- Must run BEFORE we drop WeeklyPlanningSlot.recipeId. NOW() is used since the slot
-- table did not previously carry a createdAt column to copy from.
INSERT INTO "WeeklyPlanningSlotRecipe" ("slotId", "recipeId", "position", "addedAt")
SELECT "id", "recipeId", 1, NOW() FROM "WeeklyPlanningSlot";

-- DropForeignKey: remove FK before dropping the column
ALTER TABLE "WeeklyPlanningSlot" DROP CONSTRAINT "WeeklyPlanningSlot_recipeId_fkey";

-- DropIndex
DROP INDEX "WeeklyPlanningSlot_recipeId_idx";

-- AlterTable: now that data is preserved in the junction, drop the column
ALTER TABLE "WeeklyPlanningSlot" DROP COLUMN "recipeId";
