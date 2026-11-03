-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "defaultFlipSellingCostPct" DECIMAL(9,4) NOT NULL DEFAULT 8,
ADD COLUMN     "defaultHardMoneyLtcPct" DECIMAL(9,4) NOT NULL DEFAULT 90,
ADD COLUMN     "defaultHardMoneyPointsPct" DECIMAL(9,4) NOT NULL DEFAULT 2,
ADD COLUMN     "defaultHardMoneyRate" DECIMAL(9,4) NOT NULL DEFAULT 11,
ADD COLUMN     "defaultHoldMonths" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "defaultRefiLtvPct" DECIMAL(9,4) NOT NULL DEFAULT 75,
ADD COLUMN     "defaultRefiRate" DECIMAL(9,4) NOT NULL DEFAULT 7.25,
ADD COLUMN     "defaultStrategy" "InvestmentStrategy" NOT NULL DEFAULT 'BUY_HOLD';
