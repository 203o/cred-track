import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createStkPush } from "@/lib/intasend";

type TopupBody = {
  userId: string;
  phone: string;
  amount: number;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as TopupBody;

  if (!body.userId || !body.phone || !body.amount) {
    return NextResponse.json(
      { error: "Missing userId, phone, or amount" },
      { status: 400 }
    );
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (amount % 10 !== 0) {
    return NextResponse.json(
      { error: "Amount must be in multiples of 10" },
      { status: 400 }
    );
  }

  const creditsAdded = (amount / 10) * 3;
  const apiRef = `topup_${body.userId}_${Date.now()}`;

  const user = await prisma.user.findUnique({
    where: { id: body.userId },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const topup = await prisma.creditTopup.create({
    data: {
      userId: body.userId,
      phone: body.phone,
      amount,
      creditsAdded,
      apiRef,
    },
  });

  try {
    const normalizedPhone = body.phone.replace(/^\+/, "").trim();
    const response = await createStkPush({
      phoneNumber: normalizedPhone,
      email: user.email,
      amount,
      apiRef,
      narrative: "Cred Track reminder credits",
    });

    const invoiceId =
      response?.invoice?.invoice_id ||
      response?.invoice_id ||
      response?.id ||
      null;

    await prisma.creditTopup.update({
      where: { id: topup.id },
      data: { invoiceId },
    });

    return NextResponse.json({ topupId: topup.id, invoiceId });
  } catch (error) {
    console.error("[Topup] STK push failed", {
      userId: body.userId,
      phone: body.phone,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    await prisma.creditTopup.update({
      where: { id: topup.id },
      data: { status: "FAILED" },
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "STK push failed" },
      { status: 502 }
    );
  }
}
