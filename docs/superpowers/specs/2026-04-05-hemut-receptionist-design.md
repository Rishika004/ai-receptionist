# Hemut AI Receptionist — Design Spec
**Date:** 2026-04-05
**Status:** Approved

---

## Overview

An AI-powered voice receptionist for Hemut (Rockford, Illinois — www.hemut.com), an AI-powered TMS platform for modern logistics. Built on Retell AI with a Next.js backend that handles tool calls, Google Calendar integration, database storage, email notifications, and an admin dashboard.

The receptionist agent (Aria) handles two caller types:
- **Sales** — potential customers wanting a demo or pricing info
- **Support** — existing customers with technical questions

---

## Architecture

**Stack:**
- Next.js 15 (App Router) — full-stack framework
- SQLite via Prisma — lightweight local DB, zero config
- Google Calendar API — availability checking and event creation
- Nodemailer + Gmail SMTP — email notifications to team
- shadcn/ui + Tailwind CSS — admin dashboard UI

**Project structure:**
```
hemut-receptionist/
├── app/
│   ├── api/
│   │   └── retell/
│   │       ├── check-availability/route.ts
│   │       ├── confirm-booking/route.ts
│   │       ├── log-message/route.ts
│   │       └── end-call/route.ts
│   ├── dashboard/
│   │   └── page.tsx
│   └── page.tsx
├── lib/
│   ├── google-calendar.ts
│   ├── email.ts
│   └── db.ts
├── prisma/
│   └── schema.prisma
└── .env.local
```

**End-to-end flow:**
1. Caller phones Hemut → Retell AI runs the voice conversation using the Aria system prompt
2. Aria calls tool endpoints on this Next.js server as needed
3. Endpoints interact with Google Calendar, SQLite, and email
4. Admin dashboard at `/dashboard` shows all logged activity

---

## Data Models

### Booking
| Field | Type | Description |
|-------|------|-------------|
| id | Int (auto) | Primary key |
| name | String | Caller's full name |
| email | String | Caller's email address |
| date | String | Meeting date (e.g. "2026-04-10") |
| time | String | Confirmed time slot (e.g. "2:00 PM") |
| googleEventId | String | Google Calendar event ID |
| createdAt | DateTime | Timestamp |

### Message
| Field | Type | Description |
|-------|------|-------------|
| id | Int (auto) | Primary key |
| name | String | Caller's full name |
| phone | String | Caller's phone number |
| message | String | Reason for calling |
| createdAt | DateTime | Timestamp |

---

## Retell Tool Endpoints

All endpoints are `POST` routes. All require the `x-retell-secret` header to match `RETELL_SECRET` env variable.

### `POST /api/retell/check-availability`
- **Input:** `{ name, preferred_date, preferred_time }`
- **Action:** Query Google Calendar for free slots on that date
- **Output:** `{ available_slots: ["2:00 PM", "3:30 PM", ...] }`

### `POST /api/retell/confirm-booking`
- **Input:** `{ name, email, date, time }`
- **Action:** Create Google Calendar event → save Booking to DB → send email to team
- **Output:** `{ success: true, event_id: "..." }`

### `POST /api/retell/log-message`
- **Input:** `{ name, phone, message }`
- **Action:** Save Message to DB → send email to team
- **Output:** `{ success: true }`

### `POST /api/retell/end-call`
- **Input:** `{ reason }`
- **Action:** Log transfer reason (console only, no DB write)
- **Output:** `{ success: true }`

**Email notifications:**
- New booking → subject: `New meeting booked: [Name] on [Date] at [Time]`
- New message → subject: `New message from [Name]: [reason]`
- Recipient: `TEAM_EMAIL` env variable (e.g. team@hemut.com)

---

## Admin Dashboard (`/dashboard`)

- Dark mode, built with shadcn/ui
- Two tabs: **Bookings** and **Messages**
- Bookings table: Name, Email, Date, Time, Booked At
- Messages table: Name, Phone, Message, Received At
- Most recent entries first
- Read-only (no edit/delete)
- Auto-refreshes every 30 seconds
- No authentication (local use only for now)

---

## Environment Variables

```env
# Retell AI
RETELL_SECRET=your_shared_secret

# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_REFRESH_TOKEN=
GOOGLE_CALENDAR_ID=primary

# Email
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=your_app_password
TEAM_EMAIL=team@hemut.com

# Prisma
DATABASE_URL="file:./dev.db"
```

---

## Out of Scope (for now)
- Dashboard authentication/login
- Multi-agent or multi-language support
- Caller ID lookup
- CRM integration
- SMS confirmations
