-- CreateTable
CREATE TABLE "DemoSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "landing" TEXT,
    "referrer" TEXT,
    "firstDealSavedAt" TIMESTAMP(3),
    "signedUpAt" TIMESTAMP(3),

    CONSTRAINT "DemoSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemoSession_userId_key" ON "DemoSession"("userId");

-- CreateIndex
CREATE INDEX "DemoSession_createdAt_idx" ON "DemoSession"("createdAt");
