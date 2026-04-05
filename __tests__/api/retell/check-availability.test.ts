import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/retell-auth', () => ({
  verifyRetellSecret: vi.fn(),
}));

vi.mock('@/lib/google-calendar', () => ({
  getAvailableSlots: vi.fn(),
}));

import { POST } from '@/app/api/retell/check-availability/route';
import { verifyRetellSecret } from '@/lib/retell-auth';
import { getAvailableSlots } from '@/lib/google-calendar';

describe('POST /api/retell/check-availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when secret is invalid', async () => {
    vi.mocked(verifyRetellSecret).mockReturnValue(false);

    const req = new Request('http://localhost/api/retell/check-availability', {
      method: 'POST',
      body: JSON.stringify({ preferred_date: '2026-04-10' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('returns available slots on success', async () => {
    vi.mocked(verifyRetellSecret).mockReturnValue(true);
    vi.mocked(getAvailableSlots).mockResolvedValue(['9:00 AM', '10:00 AM']);

    const req = new Request('http://localhost/api/retell/check-availability', {
      method: 'POST',
      body: JSON.stringify({ preferred_date: '2026-04-10' }),
    });

    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.available_slots).toEqual(['9:00 AM', '10:00 AM']);
  });

  it('returns 400 when preferred_date is missing', async () => {
    vi.mocked(verifyRetellSecret).mockReturnValue(true);

    const req = new Request('http://localhost/api/retell/check-availability', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
