// app/dashboard/page.tsx
import { db } from '@/lib/db';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookingsTable } from '@/components/bookings-table';
import { MessagesTable } from '@/components/messages-table';
import { AutoRefresh } from '@/components/auto-refresh';
import { OutboundCallForm } from '@/components/outbound-call-form';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [bookings, messages] = await Promise.all([
    db.booking.findMany({ orderBy: { createdAt: 'desc' } }),
    db.message.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <AutoRefresh />
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Hemut Receptionist</h1>
          <p className="text-zinc-400 mt-1">Activity logged by Aria</p>
        </div>
        <OutboundCallForm />
        <Tabs defaultValue="bookings">
          <TabsList className="bg-zinc-900 border border-zinc-800 mb-6">
            <TabsTrigger value="bookings">
              Bookings
              <span className="ml-2 text-xs bg-zinc-700 rounded px-1.5 py-0.5">
                {bookings.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="messages">
              Messages
              <span className="ml-2 text-xs bg-zinc-700 rounded px-1.5 py-0.5">
                {messages.length}
              </span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="bookings">
            <BookingsTable bookings={bookings} />
          </TabsContent>
          <TabsContent value="messages">
            <MessagesTable messages={messages} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
