import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type NotifyBody = {
  userId: string;
  itemId: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as NotifyBody;

  if (!body.userId || !body.itemId) {
    return NextResponse.json(
      { error: "Missing userId or itemId" },
      { status: 400 }
    );
  }

  const item = await prisma.stockItem.findFirst({
    where: { id: body.itemId, userId: body.userId },
  });

  if (!item) {
    return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
  }

  if (!item.supplierPhone?.startsWith("+")) {
    return NextResponse.json(
      { error: "Supplier phone must be in +254... format" },
      { status: 400 }
    );
  }

  const message = `Please restock ${item.product}. Current stock is ${item.quantity}.`;

  try {
    const { sendSms } = await import("@/lib/africastalking");
    await sendSms({ to: item.supplierPhone, message });
    return NextResponse.json({ sent: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send SMS" },
      { status: 502 }
    );
  }
}
