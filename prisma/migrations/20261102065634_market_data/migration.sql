-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "afterRepairValue" DECIMAL(14,2),
ADD COLUMN     "marketData" JSONB;

-- CreateTable
CREATE TABLE "PropertyDataCache" (
    "addressKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyDataCache_pkey" PRIMARY KEY ("addressKey")
);
