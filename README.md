# Next.js Auth Base App

A production-ready Next.js authentication starter with MongoDB, JWT, and separate env configs for local and live.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (Pages Router) |
| Database | MongoDB via Mongoose |
| Auth | JWT (stored in HttpOnly cookie) |
| Password hashing | bcryptjs |

---

## Project Structure

```
nextjs-auth-app/
├── lib/
│   ├── mongodb.js          # DB connection (reads MONGODB_URI from env)
│   └── auth.js             # JWT sign/verify + cookie helpers
├── models/
│   └── User.js             # Mongoose User schema
├── pages/
│   ├── api/auth/
│   │   ├── register.js     # POST /api/auth/register
│   │   ├── login.js        # POST /api/auth/login
│   │   ├── logout.js       # POST /api/auth/logout
│   │   └── me.js           # GET  /api/auth/me
│   ├── _app.js
│   ├── index.js            # Redirects → /login or /dashboard
│   ├── register.js         # Sign up page
│   ├── login.js            # Sign in page
│   └── dashboard.js        # Protected page (server-side auth check)
├── styles/
│   └── globals.css
├── .env.local              # ← LOCAL MongoDB URL goes here
├── .env.production         # ← LIVE MongoDB URL goes here
├── .env.example            # Template (safe to commit)
└── .gitignore              # Excludes .env.local and .env.production
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set your MongoDB URI (local)

Open **`.env.local`** and set:

```env
MONGODB_URI=mongodb://localhost:27017/nextjs-auth-local
JWT_SECRET=any-random-long-string
```

> For MongoDB Atlas: `mongodb+srv://<user>:<pass>@cluster.mongodb.net/dbname`

### 3. Run dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Environment Files

| File | When used | Commit to git? |
|---|---|---|
| `.env.local` | `npm run dev` | ❌ No (gitignored) |
| `.env.production` | `npm run build && npm start` | ❌ No (gitignored) |
| `.env.example` | Template reference | ✅ Yes |

### Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs (keep it long & random) |
| `NEXT_PUBLIC_APP_URL` | Your app's base URL |
| `NODE_ENV` | `development` or `production` |

---

## Deploying to Vercel / Railway / Render

Set environment variables in your hosting dashboard:

- `MONGODB_URI` → your Atlas URI
- `JWT_SECRET` → a long random string
- `NEXT_PUBLIC_APP_URL` → `https://your-domain.com`

Next.js will automatically use `NODE_ENV=production` when built.

---

## API Routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create new account |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/logout` | Sign out (clears cookie) |
| `GET` | `/api/auth/me` | Get current user (requires auth) |

---

## Pages

| Path | Description | Auth required |
|---|---|---|
| `/register` | Create account | No (redirects if logged in) |
| `/login` | Sign in | No (redirects if logged in) |
| `/dashboard` | Protected home | ✅ Yes |
