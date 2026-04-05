import { NextRequest, NextResponse } from 'next/server';
import { verifyRetellSecret } from '@/lib/retell-auth';
import { getAvailableSlots } from '@/lib/google-calendar';

export async function POST(request: NextRequest) {
  if (!verifyRetellSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { preferred_date } = await request.json();

  if (!preferred_date) {
    return NextResponse.json({ error: 'preferred_date is required' }, { status: 400 });
  }

  const available_slots = await getAvailableSlots(preferred_date);
  return NextResponse.json({ available_slots });
}
