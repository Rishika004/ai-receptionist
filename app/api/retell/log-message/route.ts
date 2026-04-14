import { NextRequest, NextResponse } from 'next/server';
import { verifyRetellSecret } from '@/lib/retell-auth';
import { sendEmail } from '@/lib/email';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  if (!verifyRetellSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  console.log('[log-message] received body:', body);

  // Retell wraps arguments inside body.args
  const args = body.args ?? body;
  const name = args.name ?? args.caller_name ?? 'Unknown';
  const phone = args.phone ?? args.caller_phone ?? args.phone_number ?? 'Unknown';
  const message = args.message ?? args.reason ?? args.note ?? 'No message provided';

  try {
    await db.message.create({ data: { name, phone, message } });
  } catch (err) {
    console.error('[log-message] DB error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  try {
    await sendEmail(
      `New message from ${name}: ${message}`,
      `Aria has logged a message.\n\nName: ${name}\nPhone: ${phone}\nMessage: ${message}`,
    );
  } catch (err) {
    console.error('[log-message] email error (non-fatal):', err);
  }

  console.log('[log-message] saved successfully');
  return NextResponse.json({ success: true });
}
