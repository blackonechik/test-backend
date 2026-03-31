import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function formatRefreshToken(accountId: string, secret: string): string {
  return `${accountId}:${secret}`;
}

export function parseRefreshToken(raw: string): {
  accountId: string;
  secret: string;
} | null {
  const idx = raw.indexOf(':');
  if (idx <= 0 || idx === raw.length - 1) {
    return null;
  }
  const accountId = raw.slice(0, idx);
  const secret = raw.slice(idx + 1);
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(accountId) || secret.length < 16) {
    return null;
  }
  return { accountId, secret };
}

export function hashRefreshToken(token: string, pepper: string): string {
  return createHmac('sha256', pepper).update(token).digest('hex');
}

export function verifyRefreshTokenHash(
  token: string,
  storedHash: string,
  pepper: string,
): boolean {
  const computed = hashRefreshToken(token, pepper);
  try {
    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    return (
      a.length === b.length && a.length > 0 && timingSafeEqual(a, b)
    );
  } catch {
    return false;
  }
}

export function newRefreshSecret(): string {
  return randomBytes(32).toString('base64url');
}
