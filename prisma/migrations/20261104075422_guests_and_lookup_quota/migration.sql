-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PropertyLookupLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addressKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyLookupLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyLookupLog_createdAt_idx" ON "PropertyLookupLog"("createdAt");

-- CreateIndex
CREATE INDEX "PropertyLookupLog_userId_createdAt_idx" ON "PropertyLookupLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PropertyLookupLog" ADD CONSTRAINT "PropertyLookupLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
