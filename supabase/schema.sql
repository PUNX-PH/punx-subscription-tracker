-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS PROFILE (Linked to Auth)
create type user_role as enum ('admin', 'employee', 'finance');

create table public.profiles (
  id uuid references auth.users not null primary key,
  email text not null,
  full_name text,
  role user_role default 'employee',
  team text, -- e.g. Tech, Design
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- CLIENTS / PROJECTS
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  code text, -- e.g. SUN, PUNX
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- VENDORS / TOOLS
create table public.vendors (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  website_url text,
  category text, -- e.g. SaaS, Infrastructure
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SUBSCRIPTIONS
create type billing_type as enum ('monthly', 'annual', 'usage_based', 'one_time');
create type subscription_status as enum ('active', 'inactive', 'cancelled', 'pending_approval', 'rejected');

create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  tool_id uuid references public.vendors(id),
  owner_id uuid references public.profiles(id),
  client_id uuid references public.clients(id),
  
  plan_name text, -- e.g. Pro, Enterprise
  billing_type billing_type not null,
  amount numeric(10, 2), -- Fixed amount or estimated for usage-based
  currency text default 'USD',
  
  start_date date,
  renewal_date date,
  
  status subscription_status default 'active',
  remarks text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- REQUESTS (Separate table for clean workflow, or could be same table with status)
-- Using separate table allows clean separation of "drafts" vs "contracts"
create table public.subscription_requests (
  id uuid default uuid_generate_v4() primary key,
  requester_id uuid references public.profiles(id) not null,
  tool_name text not null, -- User might enter free text if vendor doesn't exist
  intent text, -- Justification
  
  billing_type billing_type,
  amount numeric(10, 2),
  currency text,
  client_id uuid references public.clients(id),
  
  status subscription_status default 'pending_approval',
  rejection_reason text,
  
  attachment_url text, -- Link to invoice/quote in Storage
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TRANSACTIONS
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  subscription_id uuid references public.subscriptions(id),
  amount numeric(10, 2) not null,
  currency text default 'USD',
  
  period_start date,
  period_end date,
  payment_date date,
  
  invoice_url text,
  notes text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- AUDIT LOGS
create table public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  actor_id uuid references public.profiles(id),
  action text not null, -- e.g. 'CREATED_SUBSCRIPTION', 'APPROVED_REQUEST'
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES (Basic examples)
-- Profiles: Users can view all profiles (for directory) but only edit their own.
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Subscriptions: Employees view own. Admins/Finance view all.
create policy "Employees view own subscriptions" on public.subscriptions for select using (
  auth.uid() = owner_id or 
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'finance'))
);
