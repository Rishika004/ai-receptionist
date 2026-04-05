# Hemut AI Receptionist — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js backend for the Hemut Aria AI receptionist that handles Retell AI tool calls, books meetings via Google Calendar, logs messages to SQLite, sends email notifications, and shows an admin dashboard.

**Architecture:** Next.js 15 App Router monolith. API routes under `/api/retell/*` handle Retell tool calls. Prisma + SQLite stores bookings and messages. Nodemailer sends Gmail notifications. Admin dashboard at `/dashboard` reads directly from the DB as a Server Component with a client-side auto-refresh.

**Tech Stack:** Next.js 15, TypeScript, Prisma (SQLite), googleapis, nodemailer, shadcn/ui, Tailwind CSS, Vitest

---

## File Map

| File | Responsibility |
|------|---------------|
| `prisma/schema.prisma` | Booking + Message DB models |
| `lib/db.ts` | Singleton Prisma client |
| `lib/retell-auth.ts` | Verify `x-retell-secret` header |
| `lib/email.ts` | Send Gmail notification via nodemailer |
| `lib/google-calendar.ts` | Get available slots + create calendar events |
| `lib/time.ts` | Convert "2:00 PM" ↔ "14:00" |
| `app/api/retell/check-availability/route.ts` | Retell tool: query free slots |
| `app/api/retell/confirm-booking/route.ts` | Retell tool: create event + save booking |
| `app/api/retell/log-message/route.ts` | Retell tool: save message |
| `app/api/retell/end-call/route.ts` | Retell tool: log transfer reason |
| `components/bookings-table.tsx` | Bookings data table |
| `components/messages-table.tsx` | Messages data table |
| `components/auto-refresh.tsx` | Client component: refresh every 30s |
| `app/dashboard/page.tsx` | Admin dashboard: Server Component |
| `app/page.tsx` | Status/landing page |
| `scripts/get-google-token.mjs` | One-time script to get Google refresh token |
| `.env.local` | Local secrets (not committed) |
| `vitest.config.ts` | Vitest configuration |

---

## Task 1: Scaffold Next.js project and install dependencies

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `vitest.config.ts`
- Create: `.env.local`
- Create: `.gitignore` entry

- [ ] **Step 1: Scaffold the project**

Run this in `C:\Users\Rishika\OneDrive\Desktop\retell.ai`:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --yes
```

Expected output: Next.js project scaffolded in current directory.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install googleapis nodemailer @prisma/client prisma
```

Expected: All packages installed with no peer dependency errors.

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D vitest @vitejs/plugin-react @types/nodemailer
```

Expected: Dev packages installed.

- [ ] **Step 4: Create vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 5: Add test script to package.json**

Open `package.json` and add to `"scripts"`:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 6: Create .env.local**

```bash
# .env.local
# Retell AI
RETELL_SECRET=your_shared_secret_here

# Google Calendar API
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost
GOOGLE_REFRESH_TOKEN=
GOOGLE_CALENDAR_ID=primary

# Email (Gmail SMTP)
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
TEAM_EMAIL=team@hemut.com

# Database
DATABASE_URL="file:./dev.db"
```

- [ ] **Step 7: Ensure .env.local is gitignored**

Open `.gitignore` and confirm it contains (add if missing):

```
.env*.local
dev.db
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with dependencies"
```

---

## Task 2: Prisma schema and database setup

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/db.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider sqlite
```

Expected output: `prisma/schema.prisma` created and `DATABASE_URL` added to `.env`.

- [ ] **Step 2: Write the schema**

Replace the contents of `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Booking {
  id            Int      @id @default(autoincrement())
  name          String
  email         String
  date          String
  time          String
  googleEventId String
  createdAt     DateTime @default(now())
}

model Message {
  id        Int      @id @default(autoincrement())
  name      String
  phone     String
  message   String
  createdAt DateTime @default(now())
}
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected output:
```
✔ Generated Prisma Client
The following migration(s) have been created and applied:
migrations/20260405000000_init/migration.sql
```

- [ ] **Step 4: Create lib/db.ts**

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

- [ ] **Step 5: Commit**

```bash
git add prisma/ lib/db.ts
git commit -m "feat: add Prisma schema and SQLite database"
```

---

## Task 3: Retell auth helper + tests

**Files:**
- Create: `lib/retell-auth.ts`
- Create: `__tests__/lib/retell-auth.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/retell-auth.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { verifyRetellSecret } from '@/lib/retell-auth';

describe('verifyRetellSecret', () => {
  const original = process.env.RETELL_SECRET;

  beforeEach(() => {
    process.env.RETELL_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env.RETELL_SECRET = original;
  });

  it('returns true when secret header matches env var', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-retell-secret': 'test-secret' },
    });
    expect(verifyRetellSecret(req)).toBe(true);
  });

  it('returns false when secret header does not match', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-retell-secret': 'wrong-secret' },
    });
    expect(verifyRetellSecret(req)).toBe(false);
  });

  it('returns false when header is missing', () => {
    const req = new Request('http://localhost');
    expect(verifyRetellSecret(req)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- __tests__/lib/retell-auth.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/retell-auth'`

- [ ] **Step 3: Implement lib/retell-auth.ts**

```typescript
// lib/retell-auth.ts
export function verifyRetellSecret(request: Request): boolean {
  const secret = request.headers.get('x-retell-secret');
  return secret === process.env.RETELL_SECRET;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- __tests__/lib/retell-auth.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/retell-auth.ts __tests__/lib/retell-auth.test.ts
git commit -m "feat: add Retell secret verification helper"
```

---

## Task 4: Email helper + tests

**Files:**
- Create: `lib/email.ts`
- Create: `__tests__/lib/email.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/email.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' });
const mockCreateTransport = vi.fn(() => ({ sendMail: mockSendMail }));

vi.mock('nodemailer', () => ({
  default: { createTransport: mockCreateTransport },
}));

import { sendEmail } from '@/lib/email';

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GMAIL_USER = 'sender@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'app-password';
    process.env.TEAM_EMAIL = 'team@hemut.com';
  });

  it('calls sendMail with correct subject and text', async () => {
    await sendEmail('Test Subject', 'Test Body');

    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'sender@gmail.com',
      to: 'team@hemut.com',
      subject: 'Test Subject',
      text: 'Test Body',
    });
  });

  it('calls sendMail exactly once', async () => {
    await sendEmail('Subject', 'Body');
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- __tests__/lib/email.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/email'`

- [ ] **Step 3: Implement lib/email.ts**

```typescript
// lib/email.ts
import nodemailer from 'nodemailer';

export async function sendEmail(subject: string, text: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.TEAM_EMAIL,
    subject,
    text,
  });
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- __tests__/lib/email.test.ts
```

Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/email.ts __tests__/lib/email.test.ts
git commit -m "feat: add email notification helper"
```

---

## Task 5: Time conversion helper + tests

**Files:**
- Create: `lib/time.ts`
- Create: `__tests__/lib/time.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/time.test.ts
import { describe, it, expect } from 'vitest';
import { to24Hour } from '@/lib/time';

describe('to24Hour', () => {
  it('converts 9:00 AM to 09:00', () => {
    expect(to24Hour('9:00 AM')).toBe('09:00');
  });

  it('converts 12:00 PM to 12:00', () => {
    expect(to24Hour('12:00 PM')).toBe('12:00');
  });

  it('converts 2:00 PM to 14:00', () => {
    expect(to24Hour('2:00 PM')).toBe('14:00');
  });

  it('converts 12:00 AM to 00:00', () => {
    expect(to24Hour('12:00 AM')).toBe('00:00');
  });

  it('converts 5:30 PM to 17:30', () => {
    expect(to24Hour('5:30 PM')).toBe('17:30');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- __tests__/lib/time.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/time'`

- [ ] **Step 3: Implement lib/time.ts**

```typescript
// lib/time.ts
export function to24Hour(time12h: string): string {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (modifier === 'PM' && hours !== 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- __tests__/lib/time.test.ts
```

Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/time.ts __tests__/lib/time.test.ts
git commit -m "feat: add time conversion helper"
```

---

## Task 6: Google Calendar OAuth — one-time token setup

**Files:**
- Create: `scripts/get-google-token.mjs`

> This task is a one-time setup. You run the script once to get `GOOGLE_REFRESH_TOKEN`, then never again.

- [ ] **Step 1: Set up a Google Cloud project**

1. Go to https://console.cloud.google.com
2. Create a new project named `hemut-receptionist`
3. Go to **APIs & Services → Library**, search for **Google Calendar API**, enable it
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs: add `http://localhost`
7. Download the credentials — copy **Client ID** and **Client Secret** into `.env.local`

- [ ] **Step 2: Create the token script**

```javascript
// scripts/get-google-token.mjs
import { google } from 'googleapis';
import readline from 'readline';
import { config } from 'dotenv';

config({ path: '.env.local' });

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost',
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar'],
  prompt: 'consent',
});

console.log('\n👉 Open this URL in your browser:\n');
console.log(authUrl);
console.log('\nAfter authorizing, Google will redirect to http://localhost?code=XXXX');
console.log('The page will fail to load — that is expected.');
console.log('Copy the "code" value from the URL in the address bar.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste the code here: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(decodeURIComponent(code));
    console.log('\n✅ Add this to your .env.local:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
  } catch (err) {
    console.error('\n❌ Failed to exchange code:', err.message);
  }
  rl.close();
});
```

- [ ] **Step 3: Install dotenv (for the script)**

```bash
npm install -D dotenv
```

- [ ] **Step 4: Run the script and save your refresh token**

```bash
node scripts/get-google-token.mjs
```

Follow the prompts. Copy the printed `GOOGLE_REFRESH_TOKEN` value into `.env.local`.

- [ ] **Step 5: Commit the script (not the token)**

```bash
git add scripts/get-google-token.mjs
git commit -m "chore: add Google OAuth token generation script"
```

---

## Task 7: Google Calendar library + tests

**Files:**
- Create: `lib/google-calendar.ts`
- Create: `__tests__/lib/google-calendar.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/google-calendar.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFreebusyQuery = vi.fn();
const mockEventsInsert = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(() => ({
        setCredentials: vi.fn(),
      })),
    },
    calendar: vi.fn(() => ({
      freebusy: { query: mockFreebusyQuery },
      events: { insert: mockEventsInsert },
    })),
  },
}));

import { getAvailableSlots, createCalendarEvent } from '@/lib/google-calendar';

describe('getAvailableSlots', () => {
  beforeEach(() => {
    process.env.GOOGLE_CALENDAR_ID = 'primary';
    vi.clearAllMocks();
  });

  it('returns up to 5 slots when calendar is empty', async () => {
    mockFreebusyQuery.mockResolvedValue({
      data: { calendars: { primary: { busy: [] } } },
    });

    const slots = await getAvailableSlots('2026-04-10');
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.length).toBeLessThanOrEqual(5);
  });

  it('excludes busy time slot from results', async () => {
    mockFreebusyQuery.mockResolvedValue({
      data: {
        calendars: {
          primary: {
            busy: [
              {
                start: '2026-04-10T14:00:00-05:00',
                end: '2026-04-10T14:30:00-05:00',
              },
            ],
          },
        },
      },
    });

    const slots = await getAvailableSlots('2026-04-10');
    expect(slots).not.toContain('2:00 PM');
  });
});

describe('createCalendarEvent', () => {
  beforeEach(() => {
    process.env.GOOGLE_CALENDAR_ID = 'primary';
    vi.clearAllMocks();
  });

  it('returns the event id from Google Calendar', async () => {
    mockEventsInsert.mockResolvedValue({ data: { id: 'evt-abc123' } });

    const eventId = await createCalendarEvent(
      'Jane Smith',
      'jane@example.com',
      '2026-04-10',
      '2:00 PM',
    );

    expect(eventId).toBe('evt-abc123');
  });

  it('creates event with correct summary', async () => {
    mockEventsInsert.mockResolvedValue({ data: { id: 'evt-xyz' } });

    await createCalendarEvent('Jane Smith', 'jane@example.com', '2026-04-10', '2:00 PM');

    expect(mockEventsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          summary: 'Meeting with Jane Smith (Hemut Demo/Support)',
        }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- __tests__/lib/google-calendar.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/google-calendar'`

- [ ] **Step 3: Implement lib/google-calendar.ts**

```typescript
// lib/google-calendar.ts
import { google } from 'googleapis';
import { to24Hour } from '@/lib/time';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

const SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
];

export async function getAvailableSlots(date: string): Promise<string[]> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: `${date}T09:00:00-05:00`,
      timeMax: `${date}T18:00:00-05:00`,
      timeZone: 'America/Chicago',
      items: [{ id: calendarId }],
    },
  });

  const busy = response.data.calendars?.[calendarId]?.busy ?? [];

  const available = SLOTS.filter((slot) => {
    const slotStart = new Date(`${date}T${to24Hour(slot)}:00-05:00`);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

    return !busy.some((b) => {
      const busyStart = new Date(b.start!);
      const busyEnd = new Date(b.end!);
      return slotStart < busyEnd && slotEnd > busyStart;
    });
  });

  return available.slice(0, 5);
}

export async function createCalendarEvent(
  name: string,
  email: string,
  date: string,
  time: string,
): Promise<string> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  const startDateTime = `${date}T${to24Hour(time)}:00`;
  const endTime = new Date(`${startDateTime}-05:00`);
  endTime.setMinutes(endTime.getMinutes() + 30);
  const endDateTime = `${date}T${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}:00`;

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `Meeting with ${name} (Hemut Demo/Support)`,
      description: `Booked via Aria AI Receptionist\nCaller: ${name}\nEmail: ${email}`,
      start: { dateTime: startDateTime, timeZone: 'America/Chicago' },
      end: { dateTime: endDateTime, timeZone: 'America/Chicago' },
      attendees: [{ email }],
    },
  });

  return event.data.id!;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- __tests__/lib/google-calendar.test.ts
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/google-calendar.ts __tests__/lib/google-calendar.test.ts
git commit -m "feat: add Google Calendar availability and booking helpers"
```

---

## Task 8: check-availability endpoint + tests

**Files:**
- Create: `app/api/retell/check-availability/route.ts`
- Create: `__tests__/api/retell/check-availability.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/api/retell/check-availability.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/retell-auth', () => ({
  verifyRetellSecret: vi.fn(),
}));

vi.mock('@/lib/google-calendar', () => ({
  getAvailableSlots: vi.fn(),
}));

import { POST } from '@/app/api/retell/check-availability/route';
import { verifyRetellSecret } from '@/lib/retell-auth';
import { getAvailableSlots } from '@/lib/google-calendar';

describe('POST /api/retell/check-availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when secret is invalid', async () => {
    vi.mocked(verifyRetellSecret).mockReturnValue(false);

    const req = new Request('http://localhost/api/retell/check-availability', {
      method: 'POST',
      body: JSON.stringify({ preferred_date: '2026-04-10' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('returns available slots on success', async () => {
    vi.mocked(verifyRetellSecret).mockReturnValue(true);
    vi.mocked(getAvailableSlots).mockResolvedValue(['9:00 AM', '10:00 AM']);

    const req = new Request('http://localhost/api/retell/check-availability', {
      method: 'POST',
      body: JSON.stringify({ preferred_date: '2026-04-10' }),
    });

    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.available_slots).toEqual(['9:00 AM', '10:00 AM']);
  });

  it('returns 400 when preferred_date is missing', async () => {
    vi.mocked(verifyRetellSecret).mockReturnValue(true);

    const req = new Request('http://localhost/api/retell/check-availability', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- __tests__/api/retell/check-availability.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement the route**

```typescript
// app/api/retell/check-availability/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyRetellSecret } from '@/lib/retell-auth';
import { getAvailableSlots } from '@/lib/google-calendar';

export async function POST(request: NextRequest) {
  if (!verifyRetellSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { preferred_date } = await request.json();

  if (!preferred_date) {
    return NextResponse.json({ error: 'preferred_date is required' }, { status: 400 });
  }

  const available_slots = await getAvailableSlots(preferred_date);
  return NextResponse.json({ available_slots });
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- __tests__/api/retell/check-availability.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/retell/check-availability/ __tests__/api/retell/check-availability.test.ts
git commit -m "feat: add check-availability Retell tool endpoint"
```

---

## Task 9: confirm-booking endpoint + tests

**Files:**
- Create: `app/api/retell/confirm-booking/route.ts`
- Create: `__tests__/api/retell/confirm-booking.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/api/retell/confirm-booking.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/retell-auth', () => ({ verifyRetellSecret: vi.fn() }));
vi.mock('@/lib/google-calendar', () => ({ createCalendarEvent: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/db', () => ({
  db: { booking: { create: vi.fn() } },
}));

import { POST } from '@/app/api/retell/confirm-booking/route';
import { verifyRetellSecret } from '@/lib/retell-auth';
import { createCalendarEvent } from '@/lib/google-calendar';
import { sendEmail } from '@/lib/email';
import { db } from '@/lib/db';

describe('POST /api/retell/confirm-booking', () => {
  const validBody = {
    name: 'Jane Smith',
    email: 'jane@example.com',
    date: '2026-04-10',
    time: '2:00 PM',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyRetellSecret).mockReturnValue(true);
    vi.mocked(createCalendarEvent).mockResolvedValue('evt-123');
    vi.mocked(db.booking.create).mockResolvedValue({} as any);
    vi.mocked(sendEmail).mockResolvedValue(undefined);
  });

  it('returns 401 when secret is invalid', async () => {
    vi.mocked(verifyRetellSecret).mockReturnValue(false);
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Jane' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('creates calendar event, saves to DB, and sends email on success', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, event_id: 'evt-123' });
    expect(createCalendarEvent).toHaveBeenCalledWith('Jane Smith', 'jane@example.com', '2026-04-10', '2:00 PM');
    expect(db.booking.create).toHaveBeenCalledWith({
      data: { name: 'Jane Smith', email: 'jane@example.com', date: '2026-04-10', time: '2:00 PM', googleEventId: 'evt-123' },
    });
    expect(sendEmail).toHaveBeenCalledWith(
      'New meeting booked: Jane Smith on 2026-04-10 at 2:00 PM',
      expect.stringContaining('Jane Smith'),
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- __tests__/api/retell/confirm-booking.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement the route**

```typescript
// app/api/retell/confirm-booking/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyRetellSecret } from '@/lib/retell-auth';
import { createCalendarEvent } from '@/lib/google-calendar';
import { sendEmail } from '@/lib/email';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  if (!verifyRetellSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, email, date, time } = await request.json();

  if (!name || !email || !date || !time) {
    return NextResponse.json(
      { error: 'name, email, date, and time are required' },
      { status: 400 },
    );
  }

  const eventId = await createCalendarEvent(name, email, date, time);

  await db.booking.create({
    data: { name, email, date, time, googleEventId: eventId },
  });

  await sendEmail(
    `New meeting booked: ${name} on ${date} at ${time}`,
    `Aria has confirmed a meeting.\n\nName: ${name}\nEmail: ${email}\nDate: ${date}\nTime: ${time}\nCalendar Event ID: ${eventId}`,
  );

  return NextResponse.json({ success: true, event_id: eventId });
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- __tests__/api/retell/confirm-booking.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/retell/confirm-booking/ __tests__/api/retell/confirm-booking.test.ts
git commit -m "feat: add confirm-booking Retell tool endpoint"
```

---

## Task 10: log-message endpoint + tests

**Files:**
- Create: `app/api/retell/log-message/route.ts`
- Create: `__tests__/api/retell/log-message.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/api/retell/log-message.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/retell-auth', () => ({ verifyRetellSecret: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/db', () => ({
  db: { message: { create: vi.fn() } },
}));

import { POST } from '@/app/api/retell/log-message/route';
import { verifyRetellSecret } from '@/lib/retell-auth';
import { sendEmail } from '@/lib/email';
import { db } from '@/lib/db';

describe('POST /api/retell/log-message', () => {
  const validBody = {
    name: 'Bob Jones',
    phone: '(815) 555-1234',
    message: 'Interested in a demo for my fleet company',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyRetellSecret).mockReturnValue(true);
    vi.mocked(db.message.create).mockResolvedValue({} as any);
    vi.mocked(sendEmail).mockResolvedValue(undefined);
  });

  it('returns 401 when secret is invalid', async () => {
    vi.mocked(verifyRetellSecret).mockReturnValue(false);
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bob' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('saves to DB and sends email on success', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(db.message.create).toHaveBeenCalledWith({
      data: {
        name: 'Bob Jones',
        phone: '(815) 555-1234',
        message: 'Interested in a demo for my fleet company',
      },
    });
    expect(sendEmail).toHaveBeenCalledWith(
      'New message from Bob Jones: Interested in a demo for my fleet company',
      expect.stringContaining('Bob Jones'),
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- __tests__/api/retell/log-message.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement the route**

```typescript
// app/api/retell/log-message/route.ts
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- __tests__/api/retell/log-message.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/retell/log-message/ __tests__/api/retell/log-message.test.ts
git commit -m "feat: add log-message Retell tool endpoint"
```

---

## Task 11: end-call endpoint

**Files:**
- Create: `app/api/retell/end-call/route.ts`

> This endpoint only logs to console — no DB or email — so a lightweight test is sufficient.

- [ ] **Step 1: Implement the route**

```typescript
// app/api/retell/end-call/route.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add app/api/retell/end-call/
git commit -m "feat: add end-call Retell tool endpoint"
```

---

## Task 12: shadcn/ui setup

**Files:**
- Modified: `components/ui/` (auto-generated by shadcn CLI)

- [ ] **Step 1: Initialize shadcn/ui**

```bash
npx shadcn@latest init --defaults
```

When prompted:
- Style: **Default**
- Base color: **Zinc**
- CSS variables: **Yes**

Expected: `components/ui/` directory created, `tailwind.config.ts` updated.

- [ ] **Step 2: Add required components**

```bash
npx shadcn@latest add table tabs badge
```

Expected: `components/ui/table.tsx`, `components/ui/tabs.tsx`, `components/ui/badge.tsx` created.

- [ ] **Step 3: Commit**

```bash
git add components/ tailwind.config.ts components.json
git commit -m "chore: initialize shadcn/ui with table, tabs, badge"
```

---

## Task 13: Dashboard components

**Files:**
- Create: `components/bookings-table.tsx`
- Create: `components/messages-table.tsx`
- Create: `components/auto-refresh.tsx`

- [ ] **Step 1: Create BookingsTable**

```typescript
// components/bookings-table.tsx
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
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
```

- [ ] **Step 2: Create MessagesTable**

```typescript
// components/messages-table.tsx
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
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
```

- [ ] **Step 3: Create AutoRefresh client component**

```typescript
// components/auto-refresh.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
```

- [ ] **Step 4: Commit**

```bash
git add components/bookings-table.tsx components/messages-table.tsx components/auto-refresh.tsx
git commit -m "feat: add dashboard table components and auto-refresh"
```

---

## Task 14: Dashboard page

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Create the dashboard page**

Replace `app/dashboard/page.tsx` with:

```typescript
// app/dashboard/page.tsx
import { db } from '@/lib/db';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookingsTable } from '@/components/bookings-table';
import { MessagesTable } from '@/components/messages-table';
import { AutoRefresh } from '@/components/auto-refresh';

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
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/
git commit -m "feat: add admin dashboard with bookings and messages tabs"
```

---

## Task 15: Status page and final run

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace app/page.tsx**

```typescript
// app/page.tsx
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
```

- [ ] **Step 2: Run all tests**

```bash
npm run test:run
```

Expected: All tests PASS with no failures.

- [ ] **Step 3: Start the dev server**

```bash
npm run dev
```

Expected: Server starts at `http://localhost:3000`

- [ ] **Step 4: Smoke test the endpoints manually**

Open a new terminal and run each of these:

```bash
# Should return 401
curl -X POST http://localhost:3000/api/retell/check-availability \
  -H "Content-Type: application/json" \
  -d '{"preferred_date":"2026-04-10"}'

# Should return available_slots (requires real Google credentials)
curl -X POST http://localhost:3000/api/retell/check-availability \
  -H "Content-Type: application/json" \
  -H "x-retell-secret: your_shared_secret_here" \
  -d '{"preferred_date":"2026-04-10"}'
```

Expected first call: `{"error":"Unauthorized"}` with 401
Expected second call: `{"available_slots":[...]}` with 200

- [ ] **Step 5: Visit the dashboard**

Open `http://localhost:3000/dashboard` in a browser.
Expected: Dark dashboard with Bookings and Messages tabs, both showing "No entries yet."

- [ ] **Step 6: Final commit**

```bash
git add app/page.tsx
git commit -m "feat: add status landing page — Hemut receptionist complete"
```

---

## Post-Setup: Configure Retell AI

After the server is running (locally via `ngrok` or deployed), configure Retell AI:

1. In the Retell AI dashboard, create a new agent
2. Paste the Aria system prompt (from the original `.md` file in this project)
3. Add the 4 custom tools, each pointing to your server:
   - `check_availability` → `POST https://your-server/api/retell/check-availability`
   - `confirm_booking` → `POST https://your-server/api/retell/confirm-booking`
   - `log_message` → `POST https://your-server/api/retell/log-message`
   - `end_call_with_transfer` → `POST https://your-server/api/retell/end-call`
4. Add header `x-retell-secret: <your RETELL_SECRET value>` to all tool calls
5. Assign a phone number and test by calling it
