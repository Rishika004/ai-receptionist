import { NextRequest, NextResponse } from 'next/server';
import { verifyRetellSecret } from '@/lib/retell-auth';

export async function POST(request: NextRequest) {
  if (!verifyRetellSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const args = body.args ?? body;
  console.log(`[Aria] Call transfer requested. Reason: ${args.reason}`);
  return NextResponse.json({ success: true });
}
