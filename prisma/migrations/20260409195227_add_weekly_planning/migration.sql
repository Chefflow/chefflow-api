-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "WeeklyPlanning" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekEnd" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyPlanning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyPlanningSlot" (
    "id" SERIAL NOT NULL,
    "weeklyPlanningId" INTEGER NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "recipeId" INTEGER NOT NULL,

    CONSTRAINT "WeeklyPlanningSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyPlanning_userId_idx" ON "WeeklyPlanning"("userId");

-- CreateIndex
CREATE INDEX "WeeklyPlanning_weekStart_idx" ON "WeeklyPlanning"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlanning_userId_weekStart_key" ON "WeeklyPlanning"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "WeeklyPlanningSlot_weeklyPlanningId_idx" ON "WeeklyPlanningSlot"("weeklyPlanningId");

-- CreateIndex
CREATE INDEX "WeeklyPlanningSlot_recipeId_idx" ON "WeeklyPlanningSlot"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlanningSlot_weeklyPlanningId_dayOfWeek_slotNumber_key" ON "WeeklyPlanningSlot"("weeklyPlanningId", "dayOfWeek", "slotNumber");

-- AddForeignKey
ALTER TABLE "WeeklyPlanning" ADD CONSTRAINT "WeeklyPlanning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlanningSlot" ADD CONSTRAINT "WeeklyPlanningSlot_weeklyPlanningId_fkey" FOREIGN KEY ("weeklyPlanningId") REFERENCES "WeeklyPlanning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlanningSlot" ADD CONSTRAINT "WeeklyPlanningSlot_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
