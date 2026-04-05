import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { verifyRetellSecret } from '@/lib/retell-auth';

describe('verifyRetellSecret', () => {
  const original = process.env.RETELL_SECRET;

  beforeEach(() => {
    process.env.RETELL_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env.RETELL_SECRET = original;
  });

  it('returns true when secret header matches env var', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-retell-secret': 'test-secret' },
    });
    expect(verifyRetellSecret(req)).toBe(true);
  });

  it('returns false when secret header does not match', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-retell-secret': 'wrong-secret' },
    });
    expect(verifyRetellSecret(req)).toBe(false);
  });

  it('returns false when header is missing', () => {
    const req = new Request('http://localhost');
    expect(verifyRetellSecret(req)).toBe(false);
  });
});
