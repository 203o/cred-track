import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CreditItemInput = {
  name: string;
  quantity: number;
  unitPrice: number;
};

type CreateCreditBody = {
  userId: string;
  customerName: string;
  dueDate: string;
  amountPaid?: number;
  items: CreditItemInput[];
};

function normalizeDate(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function computeStatus(
  currentStatus: string,
  dueDate: Date
): "PENDING" | "DUE" | "OVERDUE" | "PARTIALLY_PAID" | "PAID" {
  if (currentStatus === "PAID" || currentStatus === "PARTIALLY_PAID") {
    return currentStatus as "PAID" | "PARTIALLY_PAID";
  }

  const today = normalizeDate(new Date());
  const due = normalizeDate(dueDate);

  if (due < today) {
    return "OVERDUE";
  }

  if (due.getTime() === today.getTime()) {
    return "DUE";
  }

  return "PENDING";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const credits = await prisma.credit.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  const updates = credits
    .map((credit) => {
      const updatedStatus = computeStatus(credit.status, credit.dueDate);
      if (updatedStatus !== credit.status) {
        return prisma.credit.update({
          where: { id: credit.id },
          data: { status: updatedStatus },
        });
      }
      return null;
    })
    .filter(Boolean);

  if (updates.length) {
    await Promise.all(updates);
  }

  return NextResponse.json({ credits });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateCreditBody;

  if (!body.userId || !body.customerName || !body.dueDate) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (!body.items || body.items.length === 0) {
    return NextResponse.json(
      { error: "At least one item is required" },
      { status: 400 }
    );
  }

  const totalAmount = body.items.reduce((sum, item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    return sum + quantity * unitPrice;
  }, 0);
  const amountPaid = Number(body.amountPaid || 0);

  const credit = await prisma.credit.create({
    data: {
      userId: body.userId,
      customerName: body.customerName.trim(),
      dueDate: new Date(body.dueDate),
      totalAmount,
      amountPaid,
      items: {
        create: body.items.map((item) => ({
          name: item.name.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json({ credit }, { status: 201 });
}
