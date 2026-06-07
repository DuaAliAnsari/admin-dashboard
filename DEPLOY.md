# Deployment Guide

Complete step-by-step instructions to go from zero to two live Vercel URLs.

---

## Prerequisites

- Node.js 18+ installed
- Git installed
- Accounts needed: [GitHub](https://github.com), [Supabase](https://supabase.com), [Vercel](https://vercel.com)

---

## Step 1 — Set Up Supabase (15 min)

### 1.1 Create two projects

Go to [supabase.com](https://supabase.com) → New project. Create **two** projects:
- `admin-dashboard-prod` (for `main` branch / production)
- `admin-dashboard-dev` (for `development` branch / preview)

> You can skip the second project initially and use one for both environments. Just use the same env vars in both Vercel environments.

### 1.2 Run the database migration

For **each** Supabase project:

1. In the Supabase dashboard → **SQL Editor**
2. Copy the entire contents of `supabase/migrations/20240101000000_initial_schema.sql`
3. Paste and click **Run**

You should see tables: `profiles`, `organizations`, `organization_members`

### 1.3 Deploy the Edge Functions

Install the Supabase CLI:

```bash
npm install -g supabase
```

Log in and link to your **production** project:

```bash
supabase login
# Get your project ref from: Supabase dashboard → Settings → General
supabase link --project-ref YOUR_PROD_PROJECT_REF
```

Deploy both functions:

```bash
supabase functions deploy create-invitation
supabase functions deploy create-organization
```

Set the service-role secret (find it in Supabase → Settings → API → service_role key):

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Repeat for your **dev** project:

```bash
supabase link --project-ref YOUR_DEV_PROJECT_REF
supabase functions deploy create-invitation
supabase functions deploy create-organization
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_dev_service_role_key_here
```

### 1.4 Note your API keys

From each Supabase project → **Settings → API**, copy:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon / public key** → `VITE_SUPABASE_ANON_KEY`

---

## Step 2 — Push to GitHub (5 min)

### 2.1 Create the repo

Go to [github.com/new](https://github.com/new) and create a new **empty** repository (no README, no .gitignore).

### 2.2 Set up branches and push

```bash
cd admin-dashboard

git init
git add .
git commit -m "feat: initial project scaffold"

# Push main branch
git remote add origin https://github.com/YOUR_USERNAME/admin-dashboard.git
git push -u origin main

# Create and push development branch
git checkout -b development
git push -u origin development
```

Your repo now has both `main` and `development` branches.

---

## Step 3 — Deploy to Vercel (10 min)

### 3.1 Import the project

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import your GitHub repository
3. Vercel will auto-detect it as a Vite project

### 3.2 Configure the Production deployment (`main` branch)

In the Vercel project settings:

**Build & Output Settings** (Vercel usually auto-detects these, but confirm):
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

**Environment Variables** → Add for **Production** environment:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://YOUR_PROD_PROJECT.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `your_prod_anon_key` |

Click **Deploy**. This deploys `main` → your Production URL.

### 3.3 Configure the Development (Preview) deployment

In Vercel project → **Settings → Git**:
- Under **Production Branch**: confirm it's set to `main`

Add environment variables for the **Preview** environment:

**Settings → Environment Variables** → for each variable, select **Preview** (not Production):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://YOUR_DEV_PROJECT.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `your_dev_anon_key` |

Vercel automatically deploys the `development` branch to a stable preview URL like:
`https://admin-dashboard-git-development-yourname.vercel.app`

### 3.4 Trigger a deployment of `development`

```bash
git checkout development
git commit --allow-empty -m "ci: trigger preview deployment"
git push
```

---

## Step 4 — Create Your Admin User (5 min)

### 4.1 Sign up via the app

1. Open your **Production URL**
2. Click **Sign up** and create an account with your email + password

### 4.2 Grant admin access

The first user to sign up is automatically made admin (via the `handle_new_user` trigger).

If that doesn't work, run this in the Supabase SQL Editor:

```sql
update public.profiles
set is_admin = true
where email = 'your@email.com';
```

### 4.3 Test the seeded credentials

For the assessment reviewers, seed a test admin account:

```sql
-- After the reviewer signs up with admin@example.com / Admin123!
-- run this to grant admin access:
update public.profiles
set is_admin = true
where email = 'admin@example.com';
```

---

## Step 5 — Local Development (optional)

```bash
# 1. Copy env file
cp .env.example .env
# Edit .env with your dev Supabase URL and anon key

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
# → http://localhost:5173
```

---

## Troubleshooting

### "Missing Supabase environment variables" on startup
→ Make sure `.env` exists and has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Redirected to sign-in after signing up
→ Your profile's `is_admin` is `false`. Run the SQL update above.

### Edge Function returns 401
→ The function isn't receiving your auth token. Make sure you're signed in and the Supabase client is initialized before calling the function.

### Edge Function returns 500 / "service role key missing"
→ Re-run: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...` for that project

### Vercel build fails with TypeScript errors
→ Run `npm run build` locally first. Common culprit: unused variables in strict mode.

### Page returns 404 on refresh (e.g. `/organizations`)
→ `vercel.json` handles this with a rewrite rule. Make sure it's committed.

### Supabase RLS blocking queries
→ Check the SQL Editor → **Authentication → Policies**. All four tables should show policies. If missing, re-run the migration.

---

## Environment Variable Reference

| Variable | Where to find it | Used in |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL | Client (Vite) |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key | Client (Vite) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key | Edge Functions only (Supabase secret) |

> ⚠️ The service role key bypasses RLS. It must **only** live in Supabase Edge Function secrets — never in `.env` or committed to git.
