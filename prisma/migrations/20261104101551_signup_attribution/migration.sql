-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstDealSavedAt" TIMESTAMP(3),
ADD COLUMN     "signupCampaign" TEXT,
ADD COLUMN     "signupContent" TEXT,
ADD COLUMN     "signupLanding" TEXT,
ADD COLUMN     "signupMedium" TEXT,
ADD COLUMN     "signupReferrer" TEXT,
ADD COLUMN     "signupSource" TEXT;
