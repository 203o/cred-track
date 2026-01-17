import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/africastalking";

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

  const messageBase =
    "Reminder: Your account is due today. Please pay to avoid overdue charges.";

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

  return NextResponse.json({ sentCount });
}
