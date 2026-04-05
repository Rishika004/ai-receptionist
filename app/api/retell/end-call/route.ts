import { NextRequest, NextResponse } from 'next/server';
import { verifyRetellSecret } from '@/lib/retell-auth';

export async function POST(request: NextRequest) {
  if (!verifyRetellSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { reason } = await request.json();
  console.log(`[Aria] Call transfer requested. Reason: ${reason}`);
  return NextResponse.json({ success: true });
}
