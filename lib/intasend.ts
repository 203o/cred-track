const INTASEND_BASE_URL =
  process.env.INTASEND_BASE_URL || "https://api.intasend.com";

const secretKey = process.env.INTASEND_SECRET_KEY;

if (!secretKey) {
  throw new Error("Missing IntaSend secret key");
}

export async function createStkPush({
  phoneNumber,
  email,
  amount,
  apiRef,
  narrative,
}: {
  phoneNumber: string;
  email: string;
  amount: number;
  apiRef: string;
  narrative: string;
}) {
  const response = await fetch(
    `${INTASEND_BASE_URL}/api/v1/payment/mpesa-stk-push/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        email,
        amount,
        api_ref: apiRef,
        narrative,
      }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.detail || data?.error || "Failed to create IntaSend STK push"
    );
  }

  return data;
}
