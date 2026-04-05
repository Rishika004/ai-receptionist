import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-semibold mb-2">Hemut Receptionist</h1>
        <p className="text-zinc-400 mb-6">Aria is live and handling calls.</p>
        <Link
          href="/dashboard"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-4"
        >
          View Dashboard →
        </Link>
      </div>
    </main>
  );
}
