const apiKey = process.env.AFRICAS_TALKING_API_KEY;
const username = process.env.AFRICAS_TALKING_USERNAME;

if (!apiKey || !username) {
  throw new Error("Missing Africa's Talking credentials");
}
const resolvedApiKey = apiKey;
const resolvedUsername = username;

export async function sendSms({
  to,
  message,
  from,
}: {
  to: string;
  message: string;
  from?: string;
}) {
  const body = new URLSearchParams({
    username: resolvedUsername,
    to,
    message,
  });

  if (from) {
    body.set("from", from);
  }

  const response = await fetch(
    "https://api.africastalking.com/version1/messaging",
    {
      method: "POST",
      headers: {
        apiKey: resolvedApiKey,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body: body.toString(),
    }
  );

  const text = await response.text();

  if (!response.ok) {
    console.error("[AT SMS] auth check", {
      username: resolvedUsername,
      keyLength: resolvedApiKey.length,
      keySuffix: resolvedApiKey.slice(-4),
      status: response.status,
    });
    throw new Error(text || "Failed to send SMS");
  }

  return text;
}
