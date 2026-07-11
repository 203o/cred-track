-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BUSINESS', 'SUPPLIER', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('POCHI', 'PAY_BILL', 'CASH', 'TILL');

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "businessName" TEXT,
    "county" TEXT,
    "town" TEXT,
    "estate" TEXT,
    "phoneNumber" TEXT,
    "paymentMode" "PaymentMode",
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_role_idx" ON "UserProfile"("role");
