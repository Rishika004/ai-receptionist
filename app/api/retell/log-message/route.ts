import { NextRequest, NextResponse } from 'next/server';
import { verifyRetellSecret } from '@/lib/retell-auth';
import { sendEmail } from '@/lib/email';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  if (!verifyRetellSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, phone, message } = await request.json();

  if (!name || !phone || !message) {
    return NextResponse.json(
      { error: 'name, phone, and message are required' },
      { status: 400 },
    );
  }

  await db.message.create({ data: { name, phone, message } });

  await sendEmail(
    `New message from ${name}: ${message}`,
    `Aria has logged a message.\n\nName: ${name}\nPhone: ${phone}\nMessage: ${message}`,
  );

  return NextResponse.json({ success: true });
}
