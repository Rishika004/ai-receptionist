import { google } from 'googleapis';
import { to24Hour } from '@/lib/time';

function getCalendarClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const OAuth2 = google.auth.OAuth2 as any;
  const oauth2Client = new OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

const SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
];

export async function getAvailableSlots(date: string): Promise<string[]> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  const calendar = getCalendarClient();
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: `${date}T09:00:00-05:00`,
      timeMax: `${date}T18:00:00-05:00`,
      timeZone: 'America/Chicago',
      items: [{ id: calendarId }],
    },
  });

  const busy = response.data.calendars?.[calendarId]?.busy ?? [];

  const available = SLOTS.filter((slot) => {
    const slotStart = new Date(`${date}T${to24Hour(slot)}:00-05:00`);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

    return !busy.some((b) => {
      const busyStart = new Date(b.start!);
      const busyEnd = new Date(b.end!);
      return slotStart < busyEnd && slotEnd > busyStart;
    });
  });

  return available;
}

export async function createCalendarEvent(
  name: string,
  email: string,
  date: string,
  time: string,
): Promise<string> {
  const calendar = getCalendarClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  const startDateTime = `${date}T${to24Hour(time)}:00`;
  const endTime = new Date(`${startDateTime}-05:00`);
  endTime.setMinutes(endTime.getMinutes() + 30);
  const endDateTime = `${date}T${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}:00`;

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `Meeting with ${name} (Hemut Demo/Support)`,
      description: `Booked via Aria AI Receptionist\nCaller: ${name}\nEmail: ${email}`,
      start: { dateTime: startDateTime, timeZone: 'America/Chicago' },
      end: { dateTime: endDateTime, timeZone: 'America/Chicago' },
      attendees: [{ email }],
    },
  });

  return event.data.id!;
}
