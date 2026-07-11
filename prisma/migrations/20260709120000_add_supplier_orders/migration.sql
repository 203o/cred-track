CREATE TABLE IF NOT EXISTS "SupplierOrder" (
  "id" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "buyerUserId" TEXT NOT NULL,
  "buyerName" TEXT NOT NULL,
  "buyerPhone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "totalAmount" DECIMAL(10, 2) NOT NULL,
  "smsStatus" TEXT,
  "smsMessageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SupplierOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupplierOrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "product" TEXT NOT NULL,
  "price" DECIMAL(10, 2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "offers" TEXT,

  CONSTRAINT "SupplierOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SupplierOrder_supplierId_idx" ON "SupplierOrder"("supplierId");
CREATE INDEX IF NOT EXISTS "SupplierOrder_buyerUserId_idx" ON "SupplierOrder"("buyerUserId");
CREATE INDEX IF NOT EXISTS "SupplierOrderItem_orderId_idx" ON "SupplierOrderItem"("orderId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SupplierOrderItem_orderId_fkey'
  ) THEN
    ALTER TABLE "SupplierOrderItem"
    ADD CONSTRAINT "SupplierOrderItem_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "SupplierOrder"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
