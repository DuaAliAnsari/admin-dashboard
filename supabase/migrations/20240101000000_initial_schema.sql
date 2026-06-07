-- ============================================================
-- Migration: initial schema
-- Run this against a fresh Supabase project
-- ============================================================

-- Enable UUID extension (enabled by default on Supabase)
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────
-- ENUMS
-- ──────────────────────────────────────────────
create type public.org_type as enum (
  'school',
  'nonprofit',
  'business',
  'government',
  'healthcare'
);

create type public.member_status as enum (
  'invited',
  'active',
  'declined'
);

create type public.member_role as enum (
  'admin',
  'member'
);

-- ──────────────────────────────────────────────
-- PROFILES
-- Mirror of auth.users with extra app data
-- ──────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Admins can read/update their own profile
create policy "profiles: owner can read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner can update"
  on public.profiles for update
  using (auth.uid() = id);

-- ──────────────────────────────────────────────
-- ORGANIZATIONS
-- ──────────────────────────────────────────────
create table public.organizations (
  id                       uuid primary key default uuid_generate_v4(),
  name                     text not null check (char_length(name) between 2 and 100),
  type                     public.org_type not null,
  description              text check (char_length(description) <= 500),
  created_by               uuid not null references auth.users(id) on delete cascade,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- Type-specific fields (nullable; validated in Edge Function + Zod)
  school_district          text,
  nonprofit_ein            text check (nonprofit_ein ~ '^\d{2}-\d{7}$' or nonprofit_ein is null),
  business_registration    text,
  government_jurisdiction  text,
  healthcare_license       text
);

alter table public.organizations enable row level security;

-- Admins can only see orgs they created
create policy "organizations: creator can select"
  on public.organizations for select
  using (auth.uid() = created_by);

create policy "organizations: creator can insert"
  on public.organizations for insert
  with check (auth.uid() = created_by);

create policy "organizations: creator can update"
  on public.organizations for update
  using (auth.uid() = created_by);

create policy "organizations: creator can delete"
  on public.organizations for delete
  using (auth.uid() = created_by);

-- ──────────────────────────────────────────────
-- ORGANIZATION MEMBERS
-- ──────────────────────────────────────────────
create table public.organization_members (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  user_id          uuid references auth.users(id) on delete set null,
  email            text not null check (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  role             public.member_role not null default 'member',
  status           public.member_status not null default 'invited',
  invited_by       uuid not null references auth.users(id),
  invited_at       timestamptz not null default now(),
  joined_at        timestamptz,

  -- Prevent duplicate invitations to the same email in the same org
  unique (organization_id, email)
);

alter table public.organization_members enable row level security;

-- Only the org admin (creator) can manage members
create policy "members: org creator can select"
  on public.organization_members for select
  using (
    exists (
      select 1 from public.organizations o
      where o.id = organization_id
        and o.created_by = auth.uid()
    )
  );

create policy "members: org creator can insert"
  on public.organization_members for insert
  with check (
    exists (
      select 1 from public.organizations o
      where o.id = organization_id
        and o.created_by = auth.uid()
    )
  );

create policy "members: org creator can update"
  on public.organization_members for update
  using (
    exists (
      select 1 from public.organizations o
      where o.id = organization_id
        and o.created_by = auth.uid()
    )
  );

create policy "members: org creator can delete"
  on public.organization_members for delete
  using (
    exists (
      select 1 from public.organizations o
      where o.id = organization_id
        and o.created_by = auth.uid()
    )
  );

-- ──────────────────────────────────────────────
-- TRIGGER: auto-create profile on sign-up
-- ──────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, is_admin)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    -- First user gets admin by default; adjust to your needs
    not exists (select 1 from public.profiles)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ──────────────────────────────────────────────
-- TRIGGER: updated_at auto-update
-- ──────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute procedure public.set_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ──────────────────────────────────────────────
-- SEED: promote a specific user to admin
-- Run this manually after sign-up if needed:
-- update public.profiles set is_admin = true where email = 'your@email.com';
-- ──────────────────────────────────────────────
