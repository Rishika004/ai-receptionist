import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Booking } from '@prisma/client';

export function BookingsTable({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) {
    return <p className="text-zinc-500 text-sm py-4">No bookings yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-zinc-800 hover:bg-transparent">
          <TableHead className="text-zinc-400">Name</TableHead>
          <TableHead className="text-zinc-400">Email</TableHead>
          <TableHead className="text-zinc-400">Date</TableHead>
          <TableHead className="text-zinc-400">Time</TableHead>
          <TableHead className="text-zinc-400">Booked At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => (
          <TableRow key={booking.id} className="border-zinc-800">
            <TableCell className="font-medium">{booking.name}</TableCell>
            <TableCell>{booking.email}</TableCell>
            <TableCell>{booking.date}</TableCell>
            <TableCell>{booking.time}</TableCell>
            <TableCell className="text-zinc-400 text-sm">
              {new Date(booking.createdAt).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
