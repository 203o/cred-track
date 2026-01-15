import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type UpdateCreditBody = {
  status?: "PENDING" | "DUE" | "OVERDUE" | "PARTIALLY_PAID" | "PAID";
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as UpdateCreditBody;

  if (!body.status) {
    return NextResponse.json({ error: "Missing status" }, { status: 400 });
  }

  const credit = await prisma.credit.update({
    where: { id },
    data: { status: body.status },
    include: { items: true },
  });

  return NextResponse.json({ credit });
}
