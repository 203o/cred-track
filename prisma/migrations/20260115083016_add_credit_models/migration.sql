-- CreateEnum
CREATE TYPE "CreditStatus" AS ENUM ('PENDING', 'DUE', 'OVERDUE', 'PARTIALLY_PAID', 'PAID');

-- CreateTable
CREATE TABLE "Credit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" "CreditStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditItem" (
    "id" TEXT NOT NULL,
    "creditId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CreditItem" ADD CONSTRAINT "CreditItem_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "Credit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
