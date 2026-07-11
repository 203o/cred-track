import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SendRemindersBody = {
  userId: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SendRemindersBody;

  if (!body.userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const credits = await prisma.credit.findMany({
    where: {
      userId: body.userId,
      status: "OVERDUE",
    },
    include: { items: true },
  });

  if (!credits.length) {
    return NextResponse.json({ sentCount: 0 });
  }

  const balance = await prisma.creditBalance.upsert({
    where: { userId: body.userId },
    update: {},
    create: { userId: body.userId, balance: 0 },
  });

  if (balance.balance < credits.length) {
    return NextResponse.json(
      { error: "Not enough credits to send all overdue" },
      { status: 400 }
    );
  }

  const messageBase =
    "Reminder: Your account is overdue. Please pay to avoid further charges.";

  const { sendSms } = await import("@/lib/africastalking");
  const sendResults = await Promise.allSettled(
    credits.map((credit) => {
      const total = Number(credit.totalAmount);
      const paid = Number(credit.amountPaid);
      const amountDue = total - paid;
      return sendSms({
        to: credit.customerPhone,
        message: `${messageBase} Amount due: Ksh ${amountDue.toFixed(2)}.`,
      });
    })
  );

  const sentCount = sendResults.filter((result) => result.status === "fulfilled")
    .length;

  if (sentCount !== credits.length) {
    return NextResponse.json(
      { error: "Failed to send all reminders" },
      { status: 502 }
    );
  }

  const updatedBalance = await prisma.creditBalance.update({
    where: { userId: body.userId },
    data: { balance: { decrement: sentCount } },
  });

  return NextResponse.json({ sentCount, balance: updatedBalance.balance });
}
