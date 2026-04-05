import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/retell-auth', () => ({ verifyRetellSecret: vi.fn() }));
vi.mock('@/lib/google-calendar', () => ({ createCalendarEvent: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/db', () => ({
  db: { booking: { create: vi.fn() } },
}));

import { POST } from '@/app/api/retell/confirm-booking/route';
import { verifyRetellSecret } from '@/lib/retell-auth';
import { createCalendarEvent } from '@/lib/google-calendar';
import { sendEmail } from '@/lib/email';
import { db } from '@/lib/db';

describe('POST /api/retell/confirm-booking', () => {
  const validBody = {
    name: 'Jane Smith',
    email: 'jane@example.com',
    date: '2026-04-10',
    time: '2:00 PM',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyRetellSecret).mockReturnValue(true);
    vi.mocked(createCalendarEvent).mockResolvedValue('evt-123');
    vi.mocked(db.booking.create).mockResolvedValue({} as any);
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
      body: JSON.stringify({ name: 'Jane' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('creates calendar event, saves to DB, and sends email on success', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, event_id: 'evt-123' });
    expect(createCalendarEvent).toHaveBeenCalledWith('Jane Smith', 'jane@example.com', '2026-04-10', '2:00 PM');
    expect(db.booking.create).toHaveBeenCalledWith({
      data: { name: 'Jane Smith', email: 'jane@example.com', date: '2026-04-10', time: '2:00 PM', googleEventId: 'evt-123' },
    });
    expect(sendEmail).toHaveBeenCalledWith(
      'New meeting booked: Jane Smith on 2026-04-10 at 2:00 PM',
      expect.stringContaining('Jane Smith'),
    );
  });
});
