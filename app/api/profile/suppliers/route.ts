import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const suppliers = await prisma.userProfile.findMany({
    where: {
      role: "SUPPLIER",
      businessName: { not: null },
    },
    orderBy: { businessName: "asc" },
  });

  return NextResponse.json({ suppliers });
}
