import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CreateStockBody = {
  userId: string;
  product: string;
  buyingPrice: number;
  sellingPrice: number;
  quantity: number;
  supplierPhone: string;
  offers?: string;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const items = await prisma.stockItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateStockBody;

  if (
    !body.userId ||
    !body.product ||
    !body.supplierPhone ||
    body.buyingPrice === undefined ||
    body.sellingPrice === undefined ||
    body.quantity === undefined
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const item = await prisma.stockItem.create({
    data: {
      userId: body.userId,
      product: body.product.trim(),
      buyingPrice: Number(body.buyingPrice),
      sellingPrice: Number(body.sellingPrice),
      quantity: Number(body.quantity),
      supplierPhone: body.supplierPhone.trim(),
      offers: body.offers?.trim() || null,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
