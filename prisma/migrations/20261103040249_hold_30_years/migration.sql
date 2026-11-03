-- AlterTable
ALTER TABLE "Property" ALTER COLUMN "holdingPeriodYears" SET DEFAULT 30;

-- AlterTable
ALTER TABLE "UserSettings" ALTER COLUMN "defaultHoldingPeriodYears" SET DEFAULT 30;
