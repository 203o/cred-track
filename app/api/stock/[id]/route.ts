import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type UpdateStockBody = {
  reduceBy: number;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as UpdateStockBody;

  const reduceBy = Number(body.reduceBy);
  if (!Number.isFinite(reduceBy) || reduceBy <= 0) {
    return NextResponse.json(
      { error: "Invalid reduce quantity" },
      { status: 400 }
    );
  }

  const item = await prisma.stockItem.findUnique({
    where: { id },
  });

  if (!item) {
    return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
  }

  if (reduceBy > item.quantity) {
    return NextResponse.json(
      { error: "Cannot reduce more than available quantity" },
      { status: 400 }
    );
  }

  const updated = await prisma.stockItem.update({
    where: { id },
    data: { quantity: { decrement: reduceBy } },
  });

  return NextResponse.json({ item: updated });
}
