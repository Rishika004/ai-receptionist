import { NextRequest, NextResponse } from 'next/server';
import { verifyRetellSecret } from '@/lib/retell-auth';
import { createCalendarEvent } from '@/lib/google-calendar';
import { sendEmail } from '@/lib/email';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  if (!verifyRetellSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  console.log('[confirm-booking] received body:', body);

  // Retell wraps arguments inside body.args
  const args = body.args ?? body;
  const name = args.name;
  const email = args.email ?? args.caller_email ?? 'unknown@email.com';
  const date = args.date ?? args.preferred_date;
  const time = args.time ?? args.preferred_time;

  if (!name || !date || !time) {
    return NextResponse.json(
      { error: 'name, date, and time are required', received: body },
      { status: 400 },
    );
  }

  let eventId = 'no-calendar';
  try {
    eventId = await createCalendarEvent(name, email, date, time);
  } catch (err) {
    console.error('[confirm-booking] Google Calendar error (non-fatal):', err);
  }

  try {
    await db.booking.create({
      data: { name, email, date, time, googleEventId: eventId },
    });
  } catch (err) {
    console.error('[confirm-booking] DB error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  try {
    await sendEmail(
      `New meeting booked: ${name} on ${date} at ${time}`,
      `Aria has confirmed a meeting.\n\nName: ${name}\nEmail: ${email}\nDate: ${date}\nTime: ${time}\nCalendar Event ID: ${eventId}`,
    );
  } catch (err) {
    console.error('[confirm-booking] email error (non-fatal):', err);
  }

  return NextResponse.json({ success: true, event_id: eventId });
}
