export interface TurnstileVerifyResult {
  success: boolean;
  errorCodes: string[];
  hostname?: string;
}

export async function verifyTurnstile(token: string, remoteIp?: string): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { success: true, errorCodes: ['secret-not-configured'] };
  }
  if (!token) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  const params = new URLSearchParams();
  params.append('secret', secret);
  params.append('response', token);
  if (remoteIp && remoteIp !== 'unknown') {
    params.append('remoteip', remoteIp);
  }

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    if (!res.ok) {
      console.error('Turnstile verify HTTP error:', res.status);
      return { success: false, errorCodes: ['http-error'] };
    }
    const data = await res.json();
    return {
      success: data.success === true,
      errorCodes: Array.isArray(data['error-codes']) ? data['error-codes'] : [],
      hostname: data.hostname,
    };
  } catch (err) {
    console.error('Turnstile verify exception:', err);
    return { success: false, errorCodes: ['network-error'] };
  }
}

export function isTurnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}
