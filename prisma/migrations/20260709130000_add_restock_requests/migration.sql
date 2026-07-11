CREATE TABLE IF NOT EXISTS "RestockRequest" (
  "id" TEXT NOT NULL,
  "supplierUserId" TEXT NOT NULL,
  "businessUserId" TEXT NOT NULL,
  "stockItemId" TEXT,
  "product" TEXT NOT NULL,
  "quantity" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "smsStatus" TEXT,
  "smsMessageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RestockRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RestockRequest_supplierUserId_idx" ON "RestockRequest"("supplierUserId");
CREATE INDEX IF NOT EXISTS "RestockRequest_businessUserId_idx" ON "RestockRequest"("businessUserId");
CREATE INDEX IF NOT EXISTS "RestockRequest_stockItemId_idx" ON "RestockRequest"("stockItemId");
