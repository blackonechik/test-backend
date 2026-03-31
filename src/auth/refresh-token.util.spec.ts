import {
  formatRefreshToken,
  hashRefreshToken,
  newRefreshSecret,
  parseRefreshToken,
  verifyRefreshTokenHash,
} from './refresh-token.util';

describe('refresh-token.util', () => {
  const accountId = '550e8400-e29b-41d4-a716-446655440000';

  it('parse нормального токена', () => {
    const secret = newRefreshSecret();
    const raw = formatRefreshToken(accountId, secret);
    expect(parseRefreshToken(raw)).toEqual({ accountId, secret });
  });

  it('parse мусора', () => {
    expect(parseRefreshToken('no-colon')).toBeNull();
    expect(parseRefreshToken(':only-secret')).toBeNull();
    expect(parseRefreshToken('not-uuid:secret-is-long-enough-here')).toBeNull();
  });

  it('hash/verify', () => {
    const pepper = 'pepper';
    const token = formatRefreshToken(accountId, newRefreshSecret());
    const h = hashRefreshToken(token, pepper);
    expect(verifyRefreshTokenHash(token, h, pepper)).toBe(true);
    expect(verifyRefreshTokenHash(token + 'x', h, pepper)).toBe(false);
  });
});
