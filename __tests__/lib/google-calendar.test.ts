import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFreebusyQuery = vi.fn();
const mockEventsInsert = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(function () {
        return { setCredentials: vi.fn() };
      }),
    },
    calendar: vi.fn(function () {
      return {
        freebusy: { query: mockFreebusyQuery },
        events: { insert: mockEventsInsert },
      };
    }),
  },
}));

import { getAvailableSlots, createCalendarEvent } from '@/lib/google-calendar';

describe('getAvailableSlots', () => {
  beforeEach(() => {
    process.env.GOOGLE_CALENDAR_ID = 'primary';
    vi.clearAllMocks();
  });

  it('returns up to 5 slots when calendar is empty', async () => {
    mockFreebusyQuery.mockResolvedValue({
      data: { calendars: { primary: { busy: [] } } },
    });

    const slots = await getAvailableSlots('2026-04-10');
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.length).toBeLessThanOrEqual(5);
  });

  it('excludes busy time slot from results', async () => {
    mockFreebusyQuery.mockResolvedValue({
      data: {
        calendars: {
          primary: {
            busy: [
              {
                start: '2026-04-10T14:00:00-05:00',
                end: '2026-04-10T14:30:00-05:00',
              },
            ],
          },
        },
      },
    });

    const slots = await getAvailableSlots('2026-04-10');
    expect(slots).not.toContain('2:00 PM');
  });
});

describe('createCalendarEvent', () => {
  beforeEach(() => {
    process.env.GOOGLE_CALENDAR_ID = 'primary';
    vi.clearAllMocks();
  });

  it('returns the event id from Google Calendar', async () => {
    mockEventsInsert.mockResolvedValue({ data: { id: 'evt-abc123' } });

    const eventId = await createCalendarEvent(
      'Jane Smith',
      'jane@example.com',
      '2026-04-10',
      '2:00 PM',
    );

    expect(eventId).toBe('evt-abc123');
  });

  it('creates event with correct summary', async () => {
    mockEventsInsert.mockResolvedValue({ data: { id: 'evt-xyz' } });

    await createCalendarEvent('Jane Smith', 'jane@example.com', '2026-04-10', '2:00 PM');

    expect(mockEventsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          summary: 'Meeting with Jane Smith (Hemut Demo/Support)',
        }),
      }),
    );
  });
});
