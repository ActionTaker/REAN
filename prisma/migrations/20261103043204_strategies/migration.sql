-- CreateEnum
CREATE TYPE "InvestmentStrategy" AS ENUM ('BUY_HOLD', 'BRRRR', 'FLIP');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "strategy" "InvestmentStrategy" NOT NULL DEFAULT 'BUY_HOLD',
ADD COLUMN     "strategyInputs" JSONB;
