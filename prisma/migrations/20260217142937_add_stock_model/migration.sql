-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "buyingPrice" DECIMAL(10,2) NOT NULL,
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "supplierPhone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);
