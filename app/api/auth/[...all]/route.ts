import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

export const POST = async (request: NextRequest) => {
  if (request.nextUrl?.pathname?.includes("/api/auth/sign-up/email")) {
    try {
      const cloned = request.clone();
      const body = await cloned.json();
      const { email, name, ...rest } = body ?? {};
      const hasPassword =
        typeof rest?.password === "string" ? rest.password.length : 0;
      console.log("[Auth] sign-up payload", {
        email,
        name,
        hasPassword,
      });
    } catch (error) {
      console.log("[Auth] sign-up payload parse failed");
    }
  }

  return handlers.POST(request);
};
