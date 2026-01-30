-- Admin review workflow: roles + minimal RLS policies
-- هدف: 让管理员能真正 UPDATE/INSERT（否则前端会出现 200 但返回 [] = 0 rows affected）

-- 1) Roles system (idempotent)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'moderator', 'user');
  end if;
end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Allow users to see their own roles; admins can manage roles.
drop policy if exists "Users can view own roles" on public.user_roles;
create policy "Users can view own roles"
  on public.user_roles
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins can manage roles" on public.user_roles;
create policy "Admins can manage roles"
  on public.user_roles
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 2) Admin policies for review workflow tables

-- scan_history
alter table public.scan_history enable row level security;

drop policy if exists "Admins can select scan_history" on public.scan_history;
create policy "Admins can select scan_history"
  on public.scan_history
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update scan_history" on public.scan_history;
create policy "Admins can update scan_history"
  on public.scan_history
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- profiles
alter table public.profiles enable row level security;

drop policy if exists "Admins can select profiles" on public.profiles;
create policy "Admins can select profiles"
  on public.profiles
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- system_notifications
alter table public.system_notifications enable row level security;

drop policy if exists "Admins can insert system_notifications" on public.system_notifications;
create policy "Admins can insert system_notifications"
  on public.system_notifications
  for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can select system_notifications" on public.system_notifications;
create policy "Admins can select system_notifications"
  on public.system_notifications
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- marketplace_listings (Trade unlock + listing moderation)
alter table public.marketplace_listings enable row level security;

drop policy if exists "Admins can select marketplace_listings" on public.marketplace_listings;
create policy "Admins can select marketplace_listings"
  on public.marketplace_listings
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update marketplace_listings" on public.marketplace_listings;
create policy "Admins can update marketplace_listings"
  on public.marketplace_listings
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can insert marketplace_listings" on public.marketplace_listings;
create policy "Admins can insert marketplace_listings"
  on public.marketplace_listings
  for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
