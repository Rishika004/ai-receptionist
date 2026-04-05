import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/retell-auth', () => ({ verifyRetellSecret: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/db', () => ({
  db: { message: { create: vi.fn() } },
}));

import { POST } from '@/app/api/retell/log-message/route';
import { verifyRetellSecret } from '@/lib/retell-auth';
import { sendEmail } from '@/lib/email';
import { db } from '@/lib/db';

describe('POST /api/retell/log-message', () => {
  const validBody = {
    name: 'Bob Jones',
    phone: '(815) 555-1234',
    message: 'Interested in a demo for my fleet company',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyRetellSecret).mockReturnValue(true);
    vi.mocked(db.message.create).mockResolvedValue({} as any);
    vi.mocked(sendEmail).mockResolvedValue(undefined);
  });

  it('returns 401 when secret is invalid', async () => {
    vi.mocked(verifyRetellSecret).mockReturnValue(false);
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bob' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('saves to DB and sends email on success', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(db.message.create).toHaveBeenCalledWith({
      data: {
        name: 'Bob Jones',
        phone: '(815) 555-1234',
        message: 'Interested in a demo for my fleet company',
      },
    });
    expect(sendEmail).toHaveBeenCalledWith(
      'New message from Bob Jones: Interested in a demo for my fleet company',
      expect.stringContaining('Bob Jones'),
    );
  });
});
