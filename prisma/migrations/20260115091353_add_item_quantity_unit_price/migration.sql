/*
  Warnings:

  - You are about to drop the column `amount` on the `CreditItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CreditItem" DROP COLUMN "amount",
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "unitPrice" DECIMAL(10,2) NOT NULL DEFAULT 0;
