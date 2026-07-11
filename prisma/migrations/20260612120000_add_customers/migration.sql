-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Credit" ADD COLUMN "customerId" TEXT;

-- Backfill one customer per shop/user and customer phone.
INSERT INTO "Customer" ("id", "userId", "name", "phone", "createdAt", "updatedAt")
SELECT
    'cust_' || md5(
        "userId" || ':' || COALESCE(NULLIF(TRIM("customerPhone"), ''), '__missing_phone__')
    ) AS "id",
    "userId",
    COALESCE(MIN(NULLIF(TRIM("customerName"), '')), 'Unknown customer') AS "name",
    COALESCE(NULLIF(TRIM("customerPhone"), ''), '__missing_phone__') AS "phone",
    MIN("createdAt") AS "createdAt",
    CURRENT_TIMESTAMP AS "updatedAt"
FROM "Credit"
GROUP BY
    "userId",
    COALESCE(NULLIF(TRIM("customerPhone"), ''), '__missing_phone__')
ON CONFLICT ("id") DO NOTHING;

UPDATE "Credit"
SET "customerId" = "Customer"."id"
FROM "Customer"
WHERE
    "Credit"."userId" = "Customer"."userId"
    AND COALESCE(NULLIF(TRIM("Credit"."customerPhone"), ''), '__missing_phone__') = "Customer"."phone";

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_phone_key" ON "Customer"("userId", "phone");

-- CreateIndex
CREATE INDEX "Customer_userId_idx" ON "Customer"("userId");

-- CreateIndex
CREATE INDEX "Credit_userId_idx" ON "Credit"("userId");

-- CreateIndex
CREATE INDEX "Credit_customerId_idx" ON "Credit"("customerId");

-- AlterTable
ALTER TABLE "Credit" ALTER COLUMN "customerId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
