import { NextRequest, NextResponse } from 'next/server';
import { verifyRetellSecret } from '@/lib/retell-auth';
import { createCalendarEvent } from '@/lib/google-calendar';
import { sendEmail } from '@/lib/email';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  if (!verifyRetellSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, email, date, time } = await request.json();

  if (!name || !email || !date || !time) {
    return NextResponse.json(
      { error: 'name, email, date, and time are required' },
      { status: 400 },
    );
  }

  const eventId = await createCalendarEvent(name, email, date, time);

  await db.booking.create({
    data: { name, email, date, time, googleEventId: eventId },
  });

  await sendEmail(
    `New meeting booked: ${name} on ${date} at ${time}`,
    `Aria has confirmed a meeting.\n\nName: ${name}\nEmail: ${email}\nDate: ${date}\nTime: ${time}\nCalendar Event ID: ${eventId}`,
  );

  return NextResponse.json({ success: true, event_id: eventId });
}
