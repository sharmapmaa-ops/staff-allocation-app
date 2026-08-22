# Staff Allocation Management System

A full-stack staff allocation, time-tracking, and reporting system.

- **Backend**: Node.js + Express + PostgreSQL (raw SQL via `pg`, no ORM)
- **Frontend**: Plain HTML/CSS/JavaScript, one file per screen (no framework, no build step)
- **Auth**: Email/password + mandatory 6-digit verification code (2FA-style) on every login and workspace registration
- **Roles**: `Admin` (full access, including Settings) and `User` (read-only on Employees/Projects, no Settings menu)

The two halves are fully independent: the backend is a pure JSON API, and the
frontend talks to it only over HTTP. Deploy them as **two separate Render
services**, as requested.

---

## 1. Project structure

```
staff-allocation-app/
├── backend/                   # Express API (deploy as a Render "Web Service")
│   ├── server.js
│   ├── package.json
│   ├── .env.example           # copy to .env for local dev
│   ├── config/
│   │   ├── db.js              # PostgreSQL pool
│   │   └── mailer.js          # SMTP wrapper (falls back to code "123456")
│   ├── db/
│   │   ├── schema.sql         # CREATE TABLE IF NOT EXISTS ... (auto-run on boot)
│   │   └── seed.js            # reference + demo data (run from Settings > Migration)
│   ├── middleware/auth.js      # JWT auth + admin-only guard
│   └── routes/                # auth, employees, projects, settings, time-entries,
│                               # reports, dashboard, notifications, migration
│
├── frontend/                   # Static site (deploy as a Render "Static Site")
│   ├── css/style.css
│   ├── js/
│   │   ├── config.js           # <-- set your backend URL here before deploying
│   │   ├── api.js              # fetch wrapper
│   │   ├── common.js           # sidebar/topbar, icons, toast, modal, auth guard
│   │   ├── charts.js           # SVG donut/trend charts (Home page)
│   │   └── <page>.js           # one file per screen
│   ├── index.html              # redirects to login.html / home.html
│   ├── login.html
│   ├── create-workspace.html
│   ├── contact-admin.html
│   ├── verify.html              # 6-digit OTP screen
│   ├── home.html
│   ├── time-entry.html
│   ├── projects.html
│   ├── employees.html
│   ├── settings.html            # includes the new "Migration" tab
│   └── reports.html
│
└── render.yaml                  # optional one-click Render Blueprint
```

---

## 2. How the pieces fit together

### Auth + verification flow
1. `POST /api/auth/register` (Create Workspace) or `POST /api/auth/login` validates
   credentials and returns a short-lived `tempToken` — it does **not** log the
   user in yet.
2. The frontend redirects to `verify.html`, where the user enters a 6-digit code.
3. **Until you configure SMTP**, the code is always `123456` (and is also
   printed to the backend console/log via `[mailer] ...`). The verify screen
   shows a banner telling the user this.
4. Once SMTP env vars are set on Render, real random codes are emailed and the
   `123456` fallback stops being used automatically.
5. `POST /api/auth/verify` checks the code and returns the real session JWT
   used for every other API call.

### Bootstrapping the database (important)
Creating tables and creating the first Admin account has a chicken-and-egg
problem — you can't log in before the `users` table exists, and you can't run
a migration before you can log in. This is solved as follows:

- **On every backend boot**, `server.js` runs `db/schema.sql`
  (`CREATE TABLE IF NOT EXISTS ...`) automatically. This only creates empty
  tables — safe to run on every deploy/restart.
- **Settings → Migration** (Admin only) then loads reference data (currencies,
  locations, departments, designations, billing rules, etc.) plus demo
  employees/projects/time entries, via `db/seed.js`. All inserts are
  idempotent (`ON CONFLICT DO NOTHING`), so you can click "Run Migration"
  as many times as you like.

**First-time setup on a fresh deploy:**
1. Open the frontend → "Register your workspace" → create your Admin account.
2. Verify with code `123456` (until SMTP is configured).
3. Go to **Settings → Migration → Run Migration**.
4. You'll now also have two ready-made demo logins seeded by the migration
   (both with password `Password123!`):
   - `john.doe@example.com` — Admin, linked to employee `EMP001`
   - `sarah.johnson@example.com` — User, linked to employee `EMP002`

### Roles
- `Admin`: sees the **Settings** menu, and can Add/Edit/Delete on Employees
  and Projects (and all Settings lookup tables).
- `User`: Settings menu is hidden entirely; Employees/Projects are read-only
  (buttons are disabled in the UI, and the backend also returns `403` on any
  write attempt — the restriction is enforced server-side, not just hidden in
  the UI).
- Access Type (Admin/User) is set per employee in **Employees → Add/Edit**,
  but note this column currently lives on the `employees` table for display
  purposes; the actual login role lives on the `users` table. If you want an
  employee's Access Type change to also change their login role, link
  `employees.user_id` to that person's `users.id` (see "Known simplifications"
  below).

### Reports
Four reports, all under the **Reports** menu:
1. **Monthwise Project Summary** — hours per project, grouped by month.
2. **Employee-wise Project Summary** — hours per employee, per project.
3. **Project-wise Profitability** — revenue vs. cost vs. profit per project.
4. **Employee-wise Profitability** — revenue vs. cost vs. profit per employee.

Profitability formula (documented in `backend/routes/reports.js` and shown as
a banner on the Reports page):

```
revenue = billable hours × project rate
employee cost/hour = employee gross salary ÷ 160   (approx. hours/month)
cost = billable hours × employee cost/hour
profit = revenue − cost
```

This is a simplified, editable placeholder — adjust it in
`backend/routes/reports.js` to match your real costing model (e.g. a proper
cost-center rate table instead of gross salary ÷ 160).

---

## 3. Push to GitHub

```bash
cd staff-allocation-app
git init
git add .
git commit -m "Initial commit: Staff Allocation Management System"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Both `backend/` and `frontend/` live in the same repo — Render lets you point
each service at the same repo but a different **root directory**, so you
don't need two repos.

---

## 4. Deploy on Render

You'll create **three** things on Render: a PostgreSQL database, a Web
Service (backend), and a Static Site (frontend).

### Option A — One-click with the included Blueprint
1. Push this repo to GitHub (see above).
2. On Render: **New → Blueprint**, connect the repo, and it will read
   `render.yaml` and create the database + both services automatically.
3. Skip to step 4.5 below to configure SMTP once you're ready.

### Option B — Manual setup (equivalent result)

**4.1 Create the PostgreSQL database**
1. Render Dashboard → **New → PostgreSQL**.
2. Name it e.g. `staff-allocation-db`, choose a region, plan, create it.
3. Once it's up, open it and copy the **Internal Database URL** (starts with
   `postgres://...`) — you'll need it in step 4.2.

**4.2 Create the backend Web Service**
1. Render Dashboard → **New → Web Service** → connect your GitHub repo.
2. **Root Directory**: `backend`
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. **Environment variables** (Render → your service → Environment):
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Internal Database URL from step 4.1 |
   | `DATABASE_SSL` | `true` |
   | `JWT_SECRET` | any long random string (Render can auto-generate one) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `TEMP_TOKEN_EXPIRES_IN` | `10m` |
   | `CORS_ORIGIN` | the frontend URL you'll get in step 4.3 (comma-separate if you have more than one, e.g. also `http://localhost:5500` for local testing) |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | leave blank until you're ready — see step 4.5 |
6. Deploy. Once live, note the backend's public URL, e.g.
   `https://staff-allocation-backend.onrender.com`.
7. Sanity check: open `https://<your-backend>.onrender.com/api/health` in a
   browser — you should see `{"status":"ok", ...}`.

**4.3 Create the frontend Static Site**
1. Render Dashboard → **New → Static Site** → same GitHub repo.
2. **Root Directory**: `frontend`
3. **Build Command**: leave blank (or `echo "no build"`) — it's plain static files.
4. **Publish Directory**: `.`
5. Deploy. Note the static site's URL, e.g.
   `https://staff-allocation-frontend.onrender.com`.

**4.4 Point the frontend at the backend**
Edit `frontend/js/config.js` **before/after** deploying:
```js
window.APP_CONFIG = {
  API_BASE: 'https://staff-allocation-backend.onrender.com/api',
};
```
Commit and push — Render redeploys the static site automatically. Also make
sure the backend's `CORS_ORIGIN` env var includes this exact frontend URL
(step 4.2), then redeploy/restart the backend.

**4.5 Turn on real email verification (optional, whenever you're ready)**
On the backend service's Environment tab, fill in:
```
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM="Staff Allocation <no-reply@yourdomain.com>"
```
Save → the service restarts → verification codes are now real random 6-digit
codes emailed to the user, and the `123456` fallback code stops applying
automatically. No code changes needed.

---

## 5. Local development (optional, before pushing to Render)

```bash
# Backend
cd backend
cp .env.example .env      # edit DATABASE_URL to point at a local Postgres
npm install
npm start                 # http://localhost:4000

# Frontend (any static file server works, e.g.)
cd ../frontend
python3 -m http.server 5500   # http://localhost:5500/login.html
```
Make sure `frontend/js/config.js` points `API_BASE` at
`http://localhost:4000/api` for local testing, and that the backend's
`CORS_ORIGIN` includes `http://localhost:5500`.

---

## 6. Known simplifications (by design, documented so nothing is a surprise)

- **Employee ↔ Login linking**: a real Postgres `users` row (login) and an
  `employees` row (HR record) are two separate tables linked by
  `employees.user_id`. New self-registrations (Create Workspace) get a
  `users` row but no `employees` row automatically — their Home/Time-Entry
  "self" views will show a friendly "not linked yet" message until an Admin
  links them (currently done by directly setting `employees.user_id` in the
  database; a UI for this can be added to the Employees screen if needed).
- **Profitability formula** uses `gross_salary ÷ 160` as an hourly cost
  estimate — intentionally simple and clearly marked as editable.
- **Photo upload** on the Profile page is a UI placeholder (no file storage
  wired up yet — add S3/Cloudinary/Render Disks if you need this for real).
- **Password reset** ("Forgot Password?" on Login) is a placeholder toast —
  wire it to a real reset-token email flow once SMTP is live, following the
  same pattern as the verification codes.
