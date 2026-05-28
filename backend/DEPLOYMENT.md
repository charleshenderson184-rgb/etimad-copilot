# Etimad Copilot — Production Deploy Guide

Take the platform from `localhost` to a live URL. This is a **dry-run-ready** checklist: every step is explicit, every env var is listed, and the order is intentional — earlier steps unblock later ones.

**Estimated time:** 60–90 minutes the first time. ~15 minutes for repeat deploys after.

---

## Architecture

```
Browser
  │
  ├──► Frontend (Next.js, Vercel)
  │       NEXT_PUBLIC_API_URL        → https://api.yourdomain.com
  │       NEXT_PUBLIC_SUPABASE_URL
  │       NEXT_PUBLIC_SUPABASE_ANON_KEY
  │
  ├──► Backend (FastAPI, Railway / Fly / Render)
  │       DATABASE_URL                → Postgres (Supabase or Railway addon)
  │       ANTHROPIC_API_KEY           → Claude API
  │       AUTH_ENABLED=true
  │       SUPABASE_JWT_SECRET         → validates JWTs from the frontend
  │       BILLING_ENABLED=true
  │       STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
  │       STRIPE_PRICE_STARTER / _GROWTH / _ENTERPRISE
  │       EMAIL_ENABLED=true
  │       RESEND_API_KEY, EMAIL_FROM
  │       FRONTEND_URL                → https://app.yourdomain.com
  │       CORS_ORIGINS                → https://app.yourdomain.com
  │
  └──► Postgres (Supabase, recommended — single project bundles auth + DB)
```

You'll create accounts at: **Supabase**, **Stripe**, **Resend**, **Railway** (or Fly/Render), **Vercel**. All have free tiers that cover dev/preview traffic.

---

## Pre-flight check

These are already done in this repo — don't re-do them:

- ✅ Backend `/health` and `/health/ready` endpoints for liveness/readiness probes
- ✅ CORS configured via `CORS_ORIGINS` + optional `CORS_ORIGIN_REGEX` env vars
- ✅ `Dockerfile` for the backend (Python 3.11 slim + Tesseract + Arabic + English language packs + Poppler)
- ✅ `scripts/bootstrap_db.py` — deploy-safe bootstrap that handles both fresh DBs and incremental migrations
- ✅ Alembic migration chain through `204ed108a8af` (teams + activity + comments)
- ✅ `.env.example` files in `backend/` and `frontend/`

Verify locally before deploying:

```bash
cd backend
docker build -t etimad-backend .
docker run --rm -p 8000:8000 \
  -e DATABASE_URL=sqlite:////tmp/test.db \
  -e CORS_ORIGINS=http://localhost:3000 \
  etimad-backend
# In another tab:
curl http://localhost:8000/health
curl http://localhost:8000/health/ready
```

---

## Step 1 — Supabase: database + auth

Supabase gives you Postgres AND Auth in one project, so I recommend doing both here.

1. Sign up at https://supabase.com → **New project**
   - Project name: `etimad-copilot-prod`
   - Database password: generate a strong one and save it
   - Region: closest to your users (e.g. `eu-west-1` for Saudi Arabia / EU)

2. Once the project is provisioned, go to **Settings → API**:
   - Copy **Project URL** → this is `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY` (backend only — never put in `NEXT_PUBLIC_`)

3. **Settings → API → JWT Settings**:
   - Copy **JWT Secret** → `SUPABASE_JWT_SECRET` (the backend uses this to validate tokens)

4. **Settings → Database → Connection string → URI** (the Pooler "transaction" connection):
   - This is your `DATABASE_URL`. Replace `postgres://` with `postgresql+psycopg2://` so SQLAlchemy is happy.
   - Example: `postgresql+psycopg2://postgres.xxx:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`

5. **Authentication → Providers**:
   - Enable **Email** (required)
   - Optional: enable Google, GitHub, etc.

6. **Authentication → URL Configuration**:
   - Site URL: `https://app.yourdomain.com` (or your Vercel URL initially)
   - Redirect URLs: add the same plus `http://localhost:3000` for local dev

---

## Step 2 — Stripe: products + webhook

1. Sign up at https://stripe.com → **Activate live mode** later, **start in test mode**.

2. **Products → Add product** — create three:
   | Product name        | Price (monthly)  | Internal tag |
   |---------------------|------------------|--------------|
   | Etimad Copilot Starter | SAR 199 / mo (recurring) | starter |
   | Etimad Copilot Growth  | SAR 799 / mo (recurring) | growth  |
   | Etimad Copilot Enterprise | SAR 2499 / mo (recurring) | enterprise |
   
   After creating each, copy the **Price ID** (starts with `price_…`). These become:
   - `STRIPE_PRICE_STARTER`
   - `STRIPE_PRICE_GROWTH`
   - `STRIPE_PRICE_ENTERPRISE`

3. **Developers → API keys**:
   - Copy **Secret key** (test) → `STRIPE_SECRET_KEY`

4. **Developers → Webhooks → Add endpoint**:
   - You don't have a backend URL yet — come back to this **after Step 4**.
   - Endpoint URL: `https://api.yourdomain.com/api/billing/webhook`
   - Events to send: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - After creating, click **Reveal signing secret** → `STRIPE_WEBHOOK_SECRET`

---

## Step 3 — Resend: transactional email

1. Sign up at https://resend.com.
2. **Domains → Add domain** → enter your domain. Add the DNS records they show you (DKIM + SPF + DMARC). Wait until status is **Verified** (~5–15 min after DNS propagates).
3. **API keys → Create API key** → `RESEND_API_KEY`.
4. Set `EMAIL_FROM=Etimad Copilot <hello@yourdomain.com>` (the address must be on the verified domain).

---

## Step 3.5 — Cloudflare R2 (object storage)

R2 is recommended over S3: same API, but **zero egress fees** — important because every PDF page preview is served from storage. Free tier covers 10 GB and 1M ops/month.

1. https://dash.cloudflare.com → **R2** → **Create bucket**
   - Name: `etimad-uploads` (must be globally unique within your account)
   - Location hint: closest to your Railway region

2. **Manage R2 API Tokens → Create API Token**:
   - Permissions: **Object Read & Write**
   - Specify bucket: select the one you just made
   - Copy **Access Key ID** → `S3_ACCESS_KEY_ID`
   - Copy **Secret Access Key** → `S3_SECRET_ACCESS_KEY`
   - Copy the **S3 API endpoint** shown at the bottom → `S3_ENDPOINT_URL` (looks like `https://<account-id>.r2.cloudflarestorage.com`)

3. Env vars you'll paste into Railway in Step 4:
   ```
   STORAGE_BACKEND=s3
   S3_BUCKET=etimad-uploads
   S3_REGION=auto
   S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
   S3_ACCESS_KEY_ID=...
   S3_SECRET_ACCESS_KEY=...
   S3_KEY_PREFIX=prod
   ```

> **AWS S3 alternative:** create a bucket in the AWS Console, an IAM user with `s3:GetObject/PutObject/DeleteObject` scoped to that bucket, and use those credentials. Leave `S3_ENDPOINT_URL` blank and set `S3_REGION` to your bucket's region (e.g. `eu-west-1`).
>
> **MinIO** (self-hosted) works the same — point `S3_ENDPOINT_URL` at your MinIO server.

---

## Step 4 — Backend: deploy to Railway

Railway is simplest for FastAPI + Docker. (Fly.io or Render are interchangeable — instructions below adapt.)

1. https://railway.app → **New Project → Deploy from GitHub repo** → pick this repo.
2. Railway will detect the `backend/Dockerfile`. **Root directory:** `backend`.
3. **Variables** tab — paste all of these (replacing placeholders):
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   DATABASE_URL=postgresql+psycopg2://postgres.xxx:PASSWORD@aws-0-...:6543/postgres
   FRONTEND_URL=https://app.yourdomain.com
   CORS_ORIGINS=https://app.yourdomain.com
   AUTH_ENABLED=true
   SUPABASE_JWT_SECRET=...
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=...
   BILLING_ENABLED=true
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_STARTER=price_...
   STRIPE_PRICE_GROWTH=price_...
   STRIPE_PRICE_ENTERPRISE=price_...
   EMAIL_ENABLED=true
   RESEND_API_KEY=re_...
   EMAIL_FROM=Etimad Copilot <hello@yourdomain.com>
   STORAGE_BACKEND=s3
   S3_BUCKET=etimad-uploads
   S3_REGION=auto
   S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
   S3_ACCESS_KEY_ID=...
   S3_SECRET_ACCESS_KEY=...
   S3_KEY_PREFIX=prod
   ```
4. **Settings → Networking → Generate Domain** → copy the URL (e.g. `etimad-copilot.up.railway.app`).
5. **Settings → Custom Domain** (optional, recommended) → `api.yourdomain.com`. Add the CNAME they show in your DNS.
6. Trigger a deploy. Watch logs — you should see:
   - `[bootstrap_db] No alembic_version table — treating as fresh DB.`
   - `[bootstrap_db] Created 16 tables.`
   - `Uvicorn running on http://0.0.0.0:PORT`
7. Smoke test: `curl https://api.yourdomain.com/health` → `{"status":"ok"}`
8. Go back to **Step 2.4** and create the Stripe webhook pointing at this URL.

> **Fly.io alternative:** `fly launch` from `backend/`, accept the Dockerfile, set the same env vars with `fly secrets set`, attach a Postgres add-on if you prefer over Supabase Postgres.

---

## Step 5 — Frontend: deploy to Vercel

1. https://vercel.com → **Add New → Project** → import this repo.
2. **Root Directory:** `frontend`. Framework preset will auto-detect Next.js.
3. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Deploy. Vercel gives you a `*.vercel.app` URL — open it, verify the homepage loads.
5. **Custom domain:** Settings → Domains → add `app.yourdomain.com`. Add the records Vercel shows in DNS.
6. Once the custom domain resolves, update on the backend:
   - `FRONTEND_URL=https://app.yourdomain.com`
   - `CORS_ORIGINS=https://app.yourdomain.com`
   - Optional for preview deploys: `CORS_ORIGIN_REGEX=https://etimad-copilot-.*\.vercel\.app`
7. Redeploy backend (Railway "Redeploy" button).

---

## Step 6 — End-to-end verification

Open `https://app.yourdomain.com` and do this in order:

| # | Action | What should happen |
|---|--------|--------------------|
| 1 | Sign up with a real email | Supabase sends a verification email. You verify → land on `/dashboard`. |
| 2 | Check welcome email | Resend delivers a "Welcome to Etimad Copilot" email. |
| 3 | Go to `/team` → invite another email | They receive an invite email with a `/invite/[token]` link. |
| 4 | Open invite link in incognito → sign up with that email → accept | They join the team and see your RFPs. |
| 5 | Go to `/pricing` → upgrade to Growth | Stripe Checkout opens. Use card `4242 4242 4242 4242`. After paying, you return to `/account?upgraded=1`. |
| 6 | Check Stripe Dashboard → Subscriptions | Active subscription is created. |
| 7 | Upload an RFP PDF | Background analysis runs; requirements appear within a minute. |
| 8 | Generate a proposal | Both EN and AR documents generated; "proposal ready" email arrives. |
| 9 | On the RFP page, post a comment mentioning the teammate | Bell badge appears in the teammate's nav within 30s. |
| 10 | Mark the RFP "won" | Status-won email fires; confetti animation plays. |

If all 10 pass, you're live.

---

## Going from test → live mode (Stripe)

When you're ready to take real money:
1. Stripe: toggle to **Live mode**.
2. Recreate the three Price IDs (they're per-mode).
3. Recreate the webhook in Live mode (new signing secret).
4. Update `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the three `STRIPE_PRICE_*` env vars on Railway.
5. Redeploy.

---

## Operational notes

- **Uploads** — Railway containers have ephemeral disk. Set `STORAGE_BACKEND=s3` plus the `S3_*` env vars to persist uploads in Cloudflare R2 or AWS S3 (see Step 3.5 below). The default `local` backend is fine for single-container dev but loses files on every redeploy.
- **PDF export** (`docx2pdf`) requires LibreOffice/Word and **won't work in the slim Docker image** as configured. The Word `.docx` export works fine. If you need server-side PDF rendering, swap docx2pdf for a different pipeline (e.g. weasyprint with HTML rendering, or rely on the user's browser print-to-PDF).
- **Cold starts**: Railway's free tier sleeps idle services. Upgrade to Hobby ($5/mo) for always-on.
- **Backups**: Supabase has daily backups on the Pro plan ($25/mo). On the free tier you must export manually.
- **Logs**: Railway → "View logs". For long-term retention, pipe to a service like Better Stack or Axiom.

---

## Rollback

- Backend: Railway → Deployments → click an older deploy → "Redeploy".
- Frontend: Vercel → Deployments → "Promote to Production" on the previous build.
- Database: Supabase → Database → Backups (Pro plan) or manual `pg_dump` snapshot before risky changes.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Frontend signs in but every API call returns 401 | `AUTH_ENABLED=true` on backend but `SUPABASE_JWT_SECRET` is wrong or missing. |
| CORS errors in browser console | `CORS_ORIGINS` doesn't include the exact origin of your frontend (no trailing slash, scheme must match). |
| Stripe checkout completes but plan doesn't update | Webhook signing secret mismatch, or webhook URL points at a stale Railway URL. Check Stripe → Webhooks → recent attempts. |
| Backend boot fails with `relation does not exist` | The bootstrap script didn't run. Check Railway logs for `[bootstrap_db]` lines. |
| Invite email never arrives | Resend domain not yet verified. Resend → Domains → status must be "Verified". |
