import { NextRequest, NextResponse } from 'next/server';
import { verifyRetellSecret } from '@/lib/retell-auth';
import { getAvailableSlots } from '@/lib/google-calendar';

const ALL_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM',
];

export async function POST(request: NextRequest) {
  if (!verifyRetellSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  console.log('[check-availability] received body:', body);

  // Retell wraps arguments inside body.args
  const args = body.args ?? body;
  const preferred_date = args.preferred_date ?? args.date;

  if (!preferred_date) {
    // Return all slots if no date provided so Aria can continue
    return NextResponse.json({ available_slots: ALL_SLOTS });
  }

  try {
    const available_slots = await getAvailableSlots(preferred_date);
    console.log('[check-availability] slots:', available_slots);
    return NextResponse.json({ available_slots });
  } catch (err) {
    console.error('[check-availability] Google Calendar error:', err);
    // Fallback: return standard slots so Aria can still book
    return NextResponse.json({ available_slots: ALL_SLOTS });
  }
}
