import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type FirebaseUserBody = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as FirebaseUserBody;
  const id = clean(body.id);
  const email = clean(body.email);
  const name = clean(body.name);
  const image = clean(body.image);

  if (!id || !email) {
    return NextResponse.json(
      { error: "Missing Firebase user id or email" },
      { status: 400 }
    );
  }

  const existingById = await prisma.user.findUnique({
    where: { id },
  });
  const existingByEmail = await prisma.user.findUnique({
    where: { email },
  });
  const storedEmail =
    existingByEmail && existingByEmail.id !== id ? `${id}@firebase.local` : email;

  const user = await prisma.user.upsert({
    where: { id },
    update: {
      email: storedEmail,
      name: name || null,
      image: image || null,
      emailVerified: true,
    },
    create: {
      id,
      email: existingById ? existingById.email : storedEmail,
      name: name || null,
      image: image || null,
      emailVerified: true,
    },
  });

  return NextResponse.json({ user });
}
