# AI Receptionist — Aria

A fully automated AI voice receptionist built with Retell AI and Next.js. Aria answers inbound calls, checks Google Calendar availability, books appointments, logs messages, and notifies your team — all without any human in the loop.

---

## What It Does

When someone calls, Aria handles the entire conversation autonomously:

- Asks for the caller's name, email, and preferred date
- Checks your Google Calendar for available 30-minute slots (9 AM – 5:30 PM)
- Books the appointment and creates a calendar event with the attendee
- Sends an email notification to your team
- Saves every booking and message to a database
- If the caller just wants to leave a message, logs their name, phone, and message instead

An admin dashboard lets you view all bookings and messages in real time, and trigger outbound calls to any number directly from the UI.

---

## Architecture

```
Caller → Retell AI Voice Agent (Aria)
       → Next.js API Routes (custom function webhooks)
       → Google Calendar API  (check availability + create event)
       → SQLite via Prisma    (persist bookings and messages)
       → Nodemailer / Gmail   (email notifications to team)
       → Admin Dashboard      (view bookings, messages, trigger outbound calls)
```

---

## Features

### Voice Agent
- Natural language conversation powered by Retell AI
- Handles appointment booking end to end
- Logs messages for callers who do not want to book
- Supports outbound calling — trigger Aria to call any number from the dashboard

### Google Calendar Integration
- Queries your calendar's free/busy windows in real time
- Returns only genuinely open 30-minute slots
- Creates a calendar event with attendee details on confirmation

### Admin Dashboard (`/dashboard`)
- Bookings table — name, email, date, time, created at
- Messages table — name, phone, message, created at
- Auto-refreshes every 30 seconds
- Outbound call form — enter a number and trigger a call instantly

### API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/retell/check-availability` | POST | Returns open time slots for a given date |
| `/api/retell/confirm-booking` | POST | Creates calendar event, saves to DB, sends email |
| `/api/retell/log-message` | POST | Saves caller message and sends email |
| `/api/retell/end-call` | POST | Logs call transfer reason |
| `/api/outbound/call` | POST | Triggers an outbound call via Retell |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.2 (App Router, Turbopack) |
| Voice AI | Retell AI (Single Prompt Agent, Custom Functions) |
| Database | SQLite via Prisma v7 + better-sqlite3 |
| Calendar | Google Calendar API (OAuth2) |
| Email | Nodemailer + Gmail SMTP |
| UI Components | shadcn/ui + Tailwind CSS v4 |
| Local Tunnel | ngrok (exposes localhost to Retell during dev) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Retell AI](https://retellai.com) account with an agent configured
- A Google Cloud project with Calendar API enabled and OAuth2 credentials
- A Gmail account with an App Password enabled
- [ngrok](https://ngrok.com) installed and authenticated

### 1. Clone and install

```bash
git clone https://github.com/Rishika004/ai-receptionist.git
cd ai-receptionist
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the root:

```env
# Retell AI
RETELL_API_KEY=your_retell_api_key
RETELL_SECRET=your_retell_api_key
RETELL_AGENT_ID=your_agent_id
RETELL_FROM_NUMBER=+1XXXXXXXXXX

# Google Calendar
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost
GOOGLE_REFRESH_TOKEN=your_refresh_token
GOOGLE_CALENDAR_ID=primary

# Email
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
TEAM_EMAIL=team@yourdomain.com

# Database
DATABASE_URL="file:./dev.db"
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init
```

### 4. Run the development server

```bash
npm run dev
```

### 5. Expose localhost to Retell using ngrok

In a separate terminal:

```bash
ngrok http 3000
```

Copy the `https://xxxx.ngrok-free.app` URL and update each custom function URL in your Retell agent:

| Function | URL |
|---|---|
| `check_availability` | `https://YOUR-NGROK-URL/api/retell/check-availability` |
| `confirm_booking` | `https://YOUR-NGROK-URL/api/retell/confirm-booking` |
| `log_message` | `https://YOUR-NGROK-URL/api/retell/log-message` |
| `end_call` | `https://YOUR-NGROK-URL/api/retell/end-call` |

### 6. Test the agent

Open your Retell agent and click the **Test** button to start a browser-based call. No phone number required.

---

## Project Structure

```
app/
  page.tsx                        # Status landing page
  dashboard/page.tsx              # Admin dashboard
  api/
    retell/
      check-availability/         # Availability webhook
      confirm-booking/            # Booking webhook
      log-message/                # Message logging webhook
      end-call/                   # End call webhook
    outbound/call/                # Outbound call trigger

lib/
  db.ts                           # Prisma client (SQLite adapter)
  google-calendar.ts              # Calendar availability + event creation
  email.ts                        # Nodemailer email helper
  retell-auth.ts                  # Request authentication
  time.ts                         # 12h to 24h time conversion

components/
  bookings-table.tsx              # Bookings data table
  messages-table.tsx              # Messages data table
  outbound-call-form.tsx          # Outbound call UI
  auto-refresh.tsx                # 30s dashboard refresh

prisma/
  schema.prisma                   # Booking and Message models
```

---

## Database Schema

```prisma
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

---

## Demo

The agent can be demoed entirely in the browser using Retell's built-in web call feature combined with an ngrok tunnel — no phone number or paid telephony plan required.
