# OrgAdmin — Admin Dashboard

A production-minded admin dashboard for creating organizations, managing members, and tracking invitations. Built with React 18 + Vite + Supabase.

---

## Live URLs

| Environment | URL |
|---|---|
| **Production** | `https://admin-dashboard.vercel.app` *(replace with your URL)* |
| **Development** | `https://admin-dashboard-git-development.vercel.app` *(replace)* |

### Test credentials

```
Email:    admin@example.com
Password: Admin123!
```
*(Seed these via the Supabase dashboard or run the seed SQL below)*

---

## Quick Start (< 15 minutes)

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) free-tier account

### 1. Clone & install

```bash
git clone https://github.com/your-org/admin-dashboard
cd admin-dashboard
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your **Project URL** and **Anon key** from *Settings → API*

### 3. Set up the database

Paste the contents of `supabase/migrations/20240101000000_initial_schema.sql` into the **SQL Editor** in your Supabase dashboard and run it. This creates:

- `profiles`, `organizations`, `organization_members` tables
- RLS policies (admins see only their own data)
- `handle_new_user` trigger (auto-creates profile on sign-up)
- Enum types: `org_type`, `member_status`, `member_role`

### 4. Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Log in and link to your project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy both functions
supabase functions deploy create-invitation
supabase functions deploy create-organization

# Set the service-role secret (never exposed to client)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 5. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 6. Create an admin user

1. Run `npm run dev` and sign up with your email
2. In the Supabase SQL Editor, promote your account:

```sql
update public.profiles set is_admin = true where email = 'your@email.com';
```

*(The first user to sign up is automatically made admin by the trigger — see migration)*

### 7. Start the dev server

```bash
npm run dev
# → http://localhost:5173
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Build | Vite 5 + SWC |
| UI framework | React 18 (Strict Mode) |
| Language | TypeScript (strict) |
| Routing | React Router v6 |
| Styling | Tailwind CSS + shadcn/ui |
| Server state | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Theme | next-themes (dark mode) |
| Backend | Supabase (Postgres + Auth + Edge Functions) |
| Deployment | Vercel |

---

## Branching Strategy

```
main            ← Production deploys to Vercel Production URL
  └── development ← Default working branch; deploys to Vercel Preview URL
        └── feature/auth
        └── feature/organizations
        └── feature/members
```

- All feature work branches off `development`
- PRs merge `feature/*` → `development`
- When a milestone is stable, `development` is merged to `main` via PR

---

## Project Structure

```
src/
  App.tsx                   # Router definition
  main.tsx                  # Entry point, QueryClient, ThemeProvider
  components/
    ui/                     # shadcn/ui components
    auth/                   # ProtectedRoute
    layout/                 # AppLayout (sidebar + header)
  hooks/
    useAuth.tsx             # Auth context + provider
    useOrganizations.ts     # React Query hooks for org data
    useToast.ts             # Toast notification hook
  lib/
    supabase.ts             # Supabase client singleton
    schemas.ts              # Zod validation schemas
    utils.ts                # cn() utility
  pages/
    SignIn.tsx
    SignUp.tsx
    Dashboard.tsx
    Organizations.tsx       # List + create dialog
    OrganizationDetail.tsx  # Members list + invite form
  types/
    database.ts             # TypeScript types matching DB schema
  vite-env.d.ts             # import.meta.env type declarations

supabase/
  migrations/               # SQL migration files
  functions/
    create-invitation/      # Edge Function: invite a member
    create-organization/    # Edge Function: server-side org creation
```

---

## Data Model

### `organizations`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | 2–100 chars |
| type | org_type enum | school / nonprofit / business / government / healthcare |
| description | text | optional, ≤500 chars |
| created_by | uuid FK → auth.users | RLS pivot |
| school_district | text | only for `school` type |
| nonprofit_ein | text | only for `nonprofit`, format XX-XXXXXXX |
| business_registration | text | optional for `business` |
| government_jurisdiction | text | optional for `government` |
| healthcare_license | text | optional for `healthcare` |

### `organization_members`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid FK | cascade delete |
| user_id | uuid FK nullable | set when invitation is accepted |
| email | text | unique per org |
| role | member_role enum | admin / member |
| status | member_status enum | invited / active / declined |
| invited_by | uuid FK | |
| invited_at | timestamptz | |
| joined_at | timestamptz nullable | |

---

## RLS Policies Summary

Every table has RLS enabled. Policies enforce:

- **profiles**: users can only read/update their own row
- **organizations**: users can only CRUD orgs where `created_by = auth.uid()`
- **organization_members**: users can only CRUD members of orgs they created

Cross-tenant access is impossible at the database level.

---

## What I'd Do With Another Day

1. **Invitation acceptance flow** — generate a signed token, email it, let the invitee click and link their `auth.user` to the `organization_members` row
2. **Role-based permissions** — org `admin` role can manage, `member` role read-only
3. **Search & filter** on the organizations directory
4. **Playwright E2E test** — sign in → create org → invite member
5. **Optimistic updates** for the invite mutation (currently waits for server round-trip)
6. **Pagination** for large member lists

## Shortcuts & Tradeoffs

- **Org creation is direct Supabase insert** from the client (RLS enforces `created_by = uid()`). The `create-organization` Edge Function exists as a demonstration of server-side validation but isn't wired to the UI by default — swapping is a one-line change.
- **No email delivery** — per spec, the invitation record is created but no email is sent. The Edge Function has a clearly marked `TODO` comment where the send step would plug in.
- **`is_admin` flag** is set by a trigger (first user = admin) and can be set manually via SQL. A real app would have an invite-only admin flow or OAuth + role mapping.
- **Dark mode** works via `next-themes` + Tailwind's `dark:` variant, toggled from the sidebar.
