type TurnstileResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(
  token: string,
  ip?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return false;
  }

  if (!token) {
    return false;
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) {
    body.set("remoteip", ip);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    },
  );

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as TurnstileResponse;
  return data.success === true;
}
