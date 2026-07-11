import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SendRemindersBody = {
  userId: string;
};

function normalizeDate(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SendRemindersBody;

  if (!body.userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const today = normalizeDate(new Date());

  const credits = await prisma.credit.findMany({
    where: {
      userId: body.userId,
      status: { not: "PAID" },
    },
    include: { items: true },
  });

  const dueToday = credits.filter(
    (credit) => normalizeDate(new Date(credit.dueDate)).getTime() === today.getTime()
  );

  if (!dueToday.length) {
    return NextResponse.json({ sentCount: 0 });
  }

  const balance = await prisma.creditBalance.upsert({
    where: { userId: body.userId },
    update: {},
    create: { userId: body.userId, balance: 0 },
  });

  if (balance.balance < dueToday.length) {
    return NextResponse.json(
      { error: "Not enough credits to send all due today" },
      { status: 400 }
    );
  }

  const messageBase =
    "Reminder: Your account is due today. Please pay to avoid overdue charges.";

  const { sendSms } = await import("@/lib/africastalking");
  const sendResults = await Promise.allSettled(
    dueToday.map((credit) => {
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

  if (sentCount !== dueToday.length) {
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
