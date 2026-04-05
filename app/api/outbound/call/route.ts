// app/api/outbound/call/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { to_number, contact_name, reason } = await request.json();

  if (!to_number) {
    return NextResponse.json({ error: 'to_number is required' }, { status: 400 });
  }

  const response = await fetch('https://api.retellai.com/v2/create-phone-call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
    },
    body: JSON.stringify({
      from_number: process.env.RETELL_FROM_NUMBER,
      to_number,
      agent_id: process.env.RETELL_AGENT_ID,
      retell_llm_dynamic_variables: {
        contact_name: contact_name || 'there',
        reason: reason || 'follow up',
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: data.message || 'Failed to initiate call' },
      { status: response.status },
    );
  }

  return NextResponse.json({ success: true, call_id: data.call_id });
}
