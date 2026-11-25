# FitBook – Dynamic Class Booking & Smart Waitlist Management System

A production-quality, full-stack fitness class booking platform for gyms, fitness studios, yoga centres, dance studios and independent instructors.

Members browse classes with **live seat availability**, book in one tap, and — when a class is full — join a **smart waitlist**. The moment a booked member cancels, the system **automatically promotes** the first person in line, confirms their booking and notifies them in real time. Capacity is enforced inside database transactions, so a class can **never** be overbooked — even when many members race for the last seat at the same moment.

---

## Features

- **Authentication** — register, login, logout, JWT access tokens with rotating refresh tokens, forgot/reset password, email verification, change password, profile management with picture upload (Cloudinary or local storage).
- **Roles** — Admin, Instructor, Member, with role-based navigation, route guards and API authorization.
- **Class discovery** — search, category / date / instructor / availability / difficulty filters, sorting, grid & list views, pagination.
- **Booking workflow** — 14-step validated booking (auth, class state, booking window, duplicates, capacity) executed in a transaction that locks the class row.
- **Smart waitlist** — sequential positions, duplicate protection, configurable limits, leave/reorder, automatic promotion on cancellation, manual promote / retry / remove for admins.
- **Real-time updates** — Socket.IO events for availability, bookings, cancellations, waitlist positions, promotions and notifications. No page refresh needed anywhere.
- **Notifications** — in-app notification centre (bell + page, unread counts, mark read, delete) plus optional HTML emails via Nodemailer (booking, waitlist, promotion, cancellation, class cancelled, reminder, password reset, verification).
- **Dashboards** — member dashboard (stats, week strip, recommendations, activity), instructor dashboard (classes, participants, attendance marking), admin dashboard.
- **Admin tools** — class CRUD with instructor/room conflict detection and weekly recurrence, booking management, waitlist management, members, instructors, rooms & categories.
- **Calendar** — month and week views, colour-coded by category, booked/full markers.
- **Analytics & reports** — booking trends, cancellations vs waitlist joins, category distribution, capacity utilisation, weekly attendance, instructor performance, CSV exports (bookings / waitlist / attendance), audit log.
- **Design** — modern fitness SaaS UI: lime-green accent, dark/light mode, responsive sidebar + mobile bottom navigation, skeleton loading, toasts, empty states.
- **Security** — bcrypt password hashing, Helmet, CORS, rate limiting, Zod validation on every input, Prisma (no SQL injection), audit logs, secrets kept server-side only.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn-style UI components, Lucide icons, React Router, TanStack Query, React Hook Form + Zod, Framer Motion, Recharts, Socket.IO Client |
| Backend | Node.js, Express, TypeScript, REST API, Socket.IO, JWT + refresh rotation, bcryptjs |
| Database | PostgreSQL with Prisma ORM |
| Email / Media | Nodemailer (SMTP), Cloudinary (optional) |
| Testing | Vitest + Supertest (API), Vitest + Testing Library (frontend) |
| DevOps | Docker + Docker Compose, Vercel (frontend), Railway/Render (backend) |

## Architecture

```
fitbook/
  client/                 React SPA
    src/
      components/         UI kit (shadcn-style), ClassCard, BookingActions, layout pieces
      pages/              public / member / instructor / admin
      layouts/            AppLayout (sidebar, topbar, mobile nav)
      hooks/              TanStack Query hooks + realtime socket hook
      contexts/           Auth, Theme, Toast
      lib/                API client (axios + token refresh), socket client, time utils
      types/              Shared TypeScript types
  server/                 Express API
    src/
      controllers/        Thin HTTP layer
      services/           Business logic (auth, classes, bookings + waitlist engine, analytics)
      routes/             REST routes with auth/role/validation middleware
      middleware/         Auth, RBAC, validation, errors, uploads
      socket/             Authenticated Socket.IO server + emit helpers
      jobs/               Class reminder job
      utils/              Tokens, email templates, audit, pagination
    prisma/
      schema.prisma       Full data model (User, FitnessClass, Booking, WaitlistEntry, …)
      seed.ts             Demo data + the full-Yoga-class scenario
    tests/                API integration tests
  docker-compose.yml      Postgres + server + client
  .env.example            All environment variables
```

### How capacity & promotion stay correct

Every booking, cancellation, waitlist join/leave and promotion runs inside a **Prisma interactive transaction** that first takes a row lock on the class (`SELECT … FOR UPDATE`). Operations for one class are therefore fully serialized:

1. Cancel marks the booking `CANCELLED`.
2. In the **same transaction**, the earliest `WAITING` entry is converted into a confirmed booking and marked `PROMOTED` (idempotent — an entry can never be promoted twice).
3. Remaining waitlist positions are renumbered `1..n`.
4. Only after commit are notifications, emails and socket events sent.

Result: confirmed bookings never exceed capacity, exactly one member is promoted per freed seat, and simultaneous cancellations/bookings cannot corrupt the queue.

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ (or use the Docker Compose database)
- npm

### 1. Database

```bash
docker compose up db -d        # or point DATABASE_URL at your own Postgres
```

### 2. Backend

```bash
cd server
cp .env.example .env           # set DATABASE_URL + JWT secrets
npm install
npx prisma db push             # create tables (or: npm run prisma:migrate)
npm run seed                   # demo data
npm run dev                    # http://localhost:5000
```

### 3. Frontend

```bash
cd client
npm install
npm run dev                    # http://localhost:5173 (proxies /api to :5000)
```

### Full Docker

```bash
docker compose up --build
```

## Demo credentials

Seeded by `npm run seed` (passwords are demo-only, never use them in production):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@fitbook.app` | `Admin@123` |
| Instructor | `sarah@fitbook.app` | `Trainer@123` |
| Instructor | `david@fitbook.app` | `Trainer@123` |
| Instructor | `ayesha@fitbook.app` | `Trainer@123` |
| Member | `member@fitbook.app` | `Member@123` |

### Try the signature scenario (2 minutes)

1. Log in as **member@fitbook.app** (Ahmed). You are **#1 on the waitlist** for *Morning Flow Yoga* — it is full at 20/20 with Sara (#2) and Ali (#3) behind you.
2. In a second browser/profile, log in as any confirmed member of that class (e.g. `member4@fitbook.app` / `Member@123`) and cancel the Yoga booking from **My Bookings**.
3. Watch Ahmed's screen: a **"You got the spot!"** notification arrives instantly, his waitlist entry becomes *Promoted*, a confirmed booking appears — and the class is still exactly 20/20 while Sara moves up to #1.

## API overview

Base URL: `/api` — all responses are `{ success, data }` or `{ success: false, message, code }`.

- **Auth:** `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/verify-email`, `GET/PUT /auth/me`, `POST /auth/me/change-password`, `POST /auth/me/avatar`
- **Classes:** `GET /classes`, `GET /classes/:id`, `GET /classes/:id/availability`, `POST /classes` (admin), `PUT /classes/:id` (admin), `DELETE /classes/:id` (admin), `POST /classes/:id/cancel` (admin), `GET /classes/:id/bookings`, `GET /classes/:id/waitlist`
- **Bookings:** `POST /bookings`, `GET /bookings/my`, `GET /bookings/:id`, `POST /bookings/:id/cancel`
- **Waitlist:** `POST /waitlist/:classId/join`, `DELETE /waitlist/:entryId/leave`, `GET /waitlist/my`
- **Members (admin):** `GET /members`, `GET /members/:id`, `PUT /members/:id`, `DELETE /members/:id`
- **Instructors:** `GET /instructors`, `POST /instructors` (admin), `GET /instructors/:id/classes`, `GET /instructor/classes`, `GET /instructor/stats`, `POST /instructor/attendance`
- **Notifications:** `GET /notifications`, `PUT /notifications/:id/read`, `PUT /notifications/read-all`, `DELETE /notifications/:id`
- **Admin:** `GET /admin/analytics`, `GET /admin/bookings`, `GET /admin/classes`, `GET /admin/waitlist`, `POST /admin/waitlist/:entryId/promote`, `POST /admin/waitlist/:entryId/retry-promotion`, `DELETE /admin/waitlist/:entryId`, categories & rooms CRUD under `/admin`, `GET /admin/reports/bookings|waitlists|attendance` (CSV), `GET /admin/audit-logs`

### Socket.IO events

Client → server: `class:subscribe`, `class:unsubscribe` (JWT-authenticated handshake).
Server → client: `class:availabilityUpdated`, `class:bookingConfirmed`, `class:bookingCancelled`, `class:capacityChanged`, `waitlist:joined`, `waitlist:positionUpdated` (private, per user), `waitlist:promoted` (private), `notification:new` (private). Sensitive data is only ever sent to the owning user's room.

## Testing

```bash
cd server && npm test     # API: auth, RBAC, booking, full class, waitlist, promotion, concurrency
cd client && npm test     # UI: login form, class cards, booking/waitlist actions
```

The API test suite needs a reachable PostgreSQL in `DATABASE_URL` with the schema pushed (`npx prisma db push`).

## Deployment

- **Frontend (Vercel):** import the repo, set root directory to `fitbook/client`, add `VITE_API_URL` and `VITE_SOCKET_URL` pointing at the backend. `vercel.json` already handles SPA routing.
- **Backend (Railway/Render):** root directory `fitbook/server`, build `npm install && npx prisma generate && npm run build`, start `npx prisma db push && node dist/index.js`, set the env vars from `.env.example`.
- **Database:** any PostgreSQL provider (Neon, Supabase, Railway). Run `npm run seed` once for demo data.

## Notes & honest limitations

- Class times are stored and displayed as studio wall-clock time (UTC fields) so a "6:00 PM class" shows as 6:00 PM for every viewer.
- Email is optional: with no SMTP configured, emails are logged instead of sent, password-reset links are returned in the API response (development/demo only), and new accounts are auto-verified so the demo works out of the box.
- Payments are not charged online — paid classes are settled at the studio; prices are shown for information.
- Recurrence supports weekly series (`WEEKLY:n`) created as individual class rows.
- The UI component kit follows the shadcn/ui patterns (cva variants, CSS variables) implemented locally under `client/src/components/ui`.
