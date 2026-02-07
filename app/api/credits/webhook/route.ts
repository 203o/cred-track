import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type WebhookPayload = {
  invoice_id?: string;
  api_ref?: string;
  status?: string;
  state?: string;
};

function normalizeStatus(status?: string) {
  const normalized = (status || "").toUpperCase();
  if (["PAID", "COMPLETE", "COMPLETED", "SUCCESS"].includes(normalized)) {
    return "PAID";
  }
  if (["FAILED", "CANCELLED"].includes(normalized)) {
    return "FAILED";
  }
  return "PENDING";
}

export async function POST(request: NextRequest) {
  const secret = process.env.INTASEND_WEBHOOK_SECRET;
  const signature = request.headers.get("x-intasend-webhook-secret");

  if (secret && signature !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as WebhookPayload;

  const invoiceId = payload.invoice_id;
  const apiRef = payload.api_ref;

  if (!invoiceId && !apiRef) {
    return NextResponse.json(
      { error: "Missing invoice id or api ref" },
      { status: 400 }
    );
  }

  const topup = await prisma.creditTopup.findFirst({
    where: {
      OR: [
        invoiceId ? { invoiceId } : undefined,
        apiRef ? { apiRef } : undefined,
      ].filter(Boolean) as { invoiceId?: string; apiRef?: string }[],
    },
  });

  if (!topup) {
    return NextResponse.json({ error: "Topup not found" }, { status: 404 });
  }

  const nextStatus = normalizeStatus(payload.status || payload.state);

  if (nextStatus === "PAID" && topup.status !== "PAID") {
    await prisma.$transaction([
      prisma.creditTopup.update({
        where: { id: topup.id },
        data: { status: "PAID" },
      }),
      prisma.creditBalance.upsert({
        where: { userId: topup.userId },
        update: { balance: { increment: topup.creditsAdded } },
        create: { userId: topup.userId, balance: 10 + topup.creditsAdded },
      }),
    ]);
  } else if (nextStatus === "FAILED") {
    await prisma.creditTopup.update({
      where: { id: topup.id },
      data: { status: "FAILED" },
    });
  }

  return NextResponse.json({ ok: true });
}
