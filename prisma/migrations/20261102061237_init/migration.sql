-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('SINGLE_FAMILY', 'CONDO', 'TOWNHOUSE', 'DUPLEX', 'TRIPLEX', 'FOURPLEX', 'MULTIFAMILY');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('ANALYZING', 'OFFER_MADE', 'UNDER_CONTRACT', 'OWNED', 'PASSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "status" "DealStatus" NOT NULL DEFAULT 'ANALYZING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "propertyType" "PropertyType" NOT NULL DEFAULT 'SINGLE_FAMILY',
    "units" INTEGER NOT NULL DEFAULT 1,
    "bedrooms" INTEGER,
    "bathrooms" DECIMAL(4,1),
    "squareFeet" INTEGER,
    "yearBuilt" INTEGER,
    "notes" TEXT,
    "purchasePrice" DECIMAL(14,2) NOT NULL,
    "closingCosts" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "rehabCosts" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "isCashPurchase" BOOLEAN NOT NULL DEFAULT false,
    "downPaymentPercent" DECIMAL(9,4) NOT NULL DEFAULT 25,
    "interestRate" DECIMAL(9,4) NOT NULL DEFAULT 7,
    "loanTermYears" INTEGER NOT NULL DEFAULT 30,
    "monthlyRent" DECIMAL(14,2) NOT NULL,
    "otherMonthlyIncome" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "vacancyRate" DECIMAL(9,4) NOT NULL DEFAULT 5,
    "propertyTaxAnnual" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "insuranceAnnual" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "hoaMonthly" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "utilitiesMonthly" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "otherMonthlyExpenses" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "maintenancePercent" DECIMAL(9,4) NOT NULL DEFAULT 5,
    "capexPercent" DECIMAL(9,4) NOT NULL DEFAULT 5,
    "managementPercent" DECIMAL(9,4) NOT NULL DEFAULT 8,
    "appreciationRate" DECIMAL(9,4) NOT NULL DEFAULT 3,
    "rentGrowthRate" DECIMAL(9,4) NOT NULL DEFAULT 3,
    "expenseGrowthRate" DECIMAL(9,4) NOT NULL DEFAULT 2.5,
    "sellingCostPercent" DECIMAL(9,4) NOT NULL DEFAULT 6,
    "holdingPeriodYears" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetCapRate" DECIMAL(9,4) NOT NULL DEFAULT 6,
    "targetCashOnCash" DECIMAL(9,4) NOT NULL DEFAULT 8,
    "minMonthlyCashFlowPerUnit" DECIMAL(14,2) NOT NULL DEFAULT 150,
    "minDscr" DECIMAL(9,4) NOT NULL DEFAULT 1.25,
    "defaultDownPaymentPercent" DECIMAL(9,4) NOT NULL DEFAULT 25,
    "defaultInterestRate" DECIMAL(9,4) NOT NULL DEFAULT 7,
    "defaultLoanTermYears" INTEGER NOT NULL DEFAULT 30,
    "defaultVacancyRate" DECIMAL(9,4) NOT NULL DEFAULT 5,
    "defaultMaintenancePercent" DECIMAL(9,4) NOT NULL DEFAULT 5,
    "defaultCapexPercent" DECIMAL(9,4) NOT NULL DEFAULT 5,
    "defaultManagementPercent" DECIMAL(9,4) NOT NULL DEFAULT 8,
    "defaultAppreciationRate" DECIMAL(9,4) NOT NULL DEFAULT 3,
    "defaultRentGrowthRate" DECIMAL(9,4) NOT NULL DEFAULT 3,
    "defaultExpenseGrowthRate" DECIMAL(9,4) NOT NULL DEFAULT 2.5,
    "defaultSellingCostPercent" DECIMAL(9,4) NOT NULL DEFAULT 6,
    "defaultHoldingPeriodYears" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Property_userId_updatedAt_idx" ON "Property"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
