# Exam Portal

A secure online exam-conducting platform built with Next.js (App Router) + MongoDB.

## Features included

- Admin login + student login/register (role-based JWT auth)
- Admin: create exams (title, duration, start/end time, MCQ questions, settings)
- Admin: publish/unpublish exams, view submissions with scores + violation counts
- Student: take exam with a **server-authoritative countdown timer**
- Auto-save answers as the student progresses
- Auto-grading for MCQs on submit
- **Tab-switch detection** — logs each violation, shows a warning, auto-submits after N warnings (configurable per exam)
- **Copy/paste/right-click/devtools-shortcut blocking** during the exam
- Best-effort fullscreen enforcement when the exam starts

> Note: client-side anti-cheat measures (tab detection, copy blocking) raise the effort/risk
> bar for casual cheating but are not 100% unbeatable — no browser-only system is. Violations
> are logged so a human (admin) can review them, which is the realistic, honest approach.

## 1. Setup

```bash
cd exam-portal
npm install
```

Copy the env example and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=some_long_random_secret_string
```

Get a free MongoDB URI from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) —
create a free cluster, add a database user, and whitelist your IP (or `0.0.0.0/0` while testing).

## 2. Create your first admin account

Public registration (`/student/register`) only allows the `student` role on purpose —
you don't want random visitors self-registering as admin. Create the first admin via script:

```bash
node scripts/createAdmin.js "Admin Name" admin@example.com yourStrongPassword
```

Then log in at `/admin/login` with those credentials.

## 3. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`.

- Admin: `/admin/login`
- Student: `/student/login` (register first at `/student/register`)

## 4. Typical flow to test

1. Log in as admin → **Create Exam** → add a couple of MCQ questions, set start/end time
   to include right now, and duration (e.g. 5 minutes for testing).
2. Click **Publish** on the exam from the dashboard.
3. Register/log in as a student → the exam appears on the student dashboard → **Start Exam**.
4. Try switching tabs a few times — you'll see warnings, and it will auto-submit once the
   limit is hit. Try copying text — it's blocked.
5. Back in the admin dashboard, open **Manage** on the exam to see the submission, score,
   and violation count.

## 5. Deployment

**Frontend + API (this whole Next.js app):**
1. Push this project to a GitHub repo.
2. Go to [vercel.com](https://vercel.com), import the repo.
3. In Vercel's project settings → Environment Variables, add `MONGODB_URI` and `JWT_SECRET`.
4. Deploy. Vercel builds and hosts both the frontend and the `/api` routes.

**Database:**
- MongoDB Atlas free tier is enough to start. Make sure the cluster's network access
  allows connections from anywhere (`0.0.0.0/0`) since Vercel's serverless functions
  don't have fixed IPs, unless you set up a static IP / VPC peering.

**Creating the first admin in production:**
- Run `scripts/createAdmin.js` locally but pointed at your **production** `MONGODB_URI`
  (temporarily set it in your local `.env.local`, run the script, then switch back),
  or run it from a one-off shell wherever you can reach the production DB.

## 6. Project structure

```
app/
  admin/            admin pages (login, dashboard, create exam, manage exam)
  student/          student pages (login, register, dashboard, take exam)
  api/
    auth/           login, register
    exams/          exam CRUD
    submissions/    start/save/submit attempt, violation logging
models/             Mongoose schemas: User, Exam, Submission
lib/                db connection, JWT/auth helpers, client-side auth storage
hooks/              useTabSwitchDetection, usePreventCheating
scripts/            createAdmin.js — one-off script to bootstrap the first admin
```

## 7. Known limitations / next steps (be upfront about these)

- Anti-cheat is client-side JS — a technically determined student can bypass it
  (e.g., disabling JS, using a second device). This is true of virtually all
  browser-based proctoring, including paid commercial tools.
- No live video/webcam proctoring in this version (intentionally left out per scope).
- Fullscreen enforcement is best-effort; some browsers block `requestFullscreen()`
  without a direct user gesture, so it may not always trigger automatically.
- JWT is stored in `localStorage` for simplicity — for stronger security in production,
  consider httpOnly cookies instead (mitigates XSS token theft).
- No question randomization/shuffling logic is wired in yet even though the setting
  exists in the schema — add a `shuffle()` on `exam.questions` in the student-facing
  GET route if you want that enforced.
