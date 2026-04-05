'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function OutboundCallForm() {
  const [toNumber, setToNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'calling' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleCall() {
    if (!toNumber) return;
    setStatus('calling');
    setMessage('');

    try {
      const res = await fetch('/api/outbound/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_number: toNumber,
          contact_name: contactName,
          reason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Failed to initiate call');
      } else {
        setStatus('success');
        setMessage(`✅ Aria is calling ${toNumber} now!`);
        setToNumber('');
        setContactName('');
        setReason('');
      }
    } catch {
      setStatus('error');
      setMessage('Network error — please try again.');
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
      <h2 className="text-lg font-semibold mb-1">Make an Outbound Call</h2>
      <p className="text-zinc-400 text-sm mb-4">
        Aria will call the number and book an appointment on your behalf.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Phone Number *</label>
          <Input
            placeholder="+1 (815) 555-1234"
            value={toNumber}
            onChange={(e) => setToNumber(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Contact Name</label>
          <Input
            placeholder="John Smith"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Reason for Call</label>
          <Input
            placeholder="Demo follow-up, support, etc."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          onClick={handleCall}
          disabled={!toNumber || status === 'calling'}
          className="bg-blue-600 hover:bg-blue-500 text-white"
        >
          {status === 'calling' ? '📞 Calling...' : '📞 Call Now'}
        </Button>

        {message && (
          <p className={`text-sm ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
