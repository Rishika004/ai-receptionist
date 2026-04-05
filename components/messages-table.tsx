import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Message } from '@prisma/client';

export function MessagesTable({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return <p className="text-zinc-500 text-sm py-4">No messages yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-zinc-800 hover:bg-transparent">
          <TableHead className="text-zinc-400">Name</TableHead>
          <TableHead className="text-zinc-400">Phone</TableHead>
          <TableHead className="text-zinc-400">Message</TableHead>
          <TableHead className="text-zinc-400">Received At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {messages.map((msg) => (
          <TableRow key={msg.id} className="border-zinc-800">
            <TableCell className="font-medium">{msg.name}</TableCell>
            <TableCell>{msg.phone}</TableCell>
            <TableCell className="max-w-xs truncate">{msg.message}</TableCell>
            <TableCell className="text-zinc-400 text-sm">
              {new Date(msg.createdAt).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
