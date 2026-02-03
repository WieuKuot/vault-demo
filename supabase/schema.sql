-- Vault Demo V2 schema (demo-only simulated money)

create extension if not exists pgcrypto;

-- Enums

do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_type') then
    create type account_type as enum ('main', 'vault');
  end if;

  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type transaction_type as enum ('deposit', 'withdraw', 'scheduled');
  end if;

  if not exists (select 1 from pg_type where typname = 'vault_destination_type') then
    create type vault_destination_type as enum ('bank', 'vendor');
  end if;

  if not exists (select 1 from pg_type where typname = 'schedule_frequency') then
    create type schedule_frequency as enum ('one_time', 'weekly', 'monthly');
  end if;

  if not exists (select 1 from pg_type where typname = 'vault_activity_type') then
    create type vault_activity_type as enum (
      'wallet_top_up',
      'vault_fund',
      'vault_withdraw_bank',
      'vault_pay_vendor',
      'vault_early_fee',
      'p2p_send',
      'p2p_request',
      'pool_create'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'activity_direction') then
    create type activity_direction as enum ('in', 'out', 'info');
  end if;
end
$$;

alter type schedule_frequency add value if not exists 'biweekly';
alter type vault_activity_type add value if not exists 'group_vault_create';
alter type vault_activity_type add value if not exists 'group_vault_contribution';
alter type vault_activity_type add value if not exists 'group_vault_withdraw';
alter type vault_activity_type add value if not exists 'group_vault_settle';

-- Legacy tables from V1 (kept for compatibility)

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type account_type not null,
  balance numeric(12,2) not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, type)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  from_account_id uuid not null references public.accounts(id),
  to_account_id uuid not null references public.accounts(id),
  amount numeric(12,2) not null check (amount > 0),
  transaction_type transaction_type not null,
  created_at timestamptz not null default now(),
  check (from_account_id <> to_account_id)
);

-- New V2 tables

create table if not exists public.vault_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  cash_balance numeric(12,2) not null default 0 check (cash_balance >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.vaults (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  balance numeric(12,2) not null default 0 check (balance >= 0),
  release_date date not null,
  destination_type vault_destination_type not null default 'bank',
  destination_name text,
  routing_number text,
  account_number text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vault_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  vault_id uuid not null references public.vaults(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  frequency schedule_frequency not null,
  next_run_at date,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vault_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  vault_id uuid references public.vaults(id) on delete set null,
  activity_type vault_activity_type not null,
  direction activity_direction not null,
  amount numeric(12,2) not null check (amount >= 0),
  counterparty text,
  note text,
  occurred_at timestamptz not null default now()
);

create table if not exists public.profile_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  full_name text,
  business_name text,
  phone text,
  daily_send_limit numeric(12,2) not null default 2500 check (daily_send_limit >= 0),
  two_factor_enabled boolean not null default false,
  biometric_lock boolean not null default false,
  privacy_mode boolean not null default false,
  promos_enabled boolean not null default true,
  shopping_enabled boolean not null default false,
  push_notifications boolean not null default true,
  email_notifications boolean not null default true,
  favorite_payee text,
  theme text not null default 'onyx',
  updated_at timestamptz not null default now()
);

create table if not exists public.linked_banks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  bank_name text not null,
  account_last4 text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.group_vaults (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  release_date date not null,
  destination_type vault_destination_type not null default 'vendor',
  destination_name text,
  leader_name text,
  all_members_approved boolean not null default false,
  total_balance numeric(12,2) not null default 0 check (total_balance >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.group_vault_members (
  id uuid primary key default gen_random_uuid(),
  group_vault_id uuid not null references public.group_vaults(id) on delete cascade,
  member_name text not null,
  contribution_balance numeric(12,2) not null default 0 check (contribution_balance >= 0),
  is_leader boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_accounts_user_id on public.accounts(user_id);
create index if not exists idx_transactions_created_at on public.transactions(created_at desc);
create index if not exists idx_vaults_user_id on public.vaults(user_id);
create index if not exists idx_vault_activity_user_time on public.vault_activity(user_id, occurred_at desc);
create index if not exists idx_linked_banks_user_id on public.linked_banks(user_id);
create index if not exists idx_group_vaults_user_id on public.group_vaults(user_id);
create index if not exists idx_group_vault_members_group_id on public.group_vault_members(group_vault_id);

-- RLS

alter table public.users enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.vault_wallets enable row level security;
alter table public.vaults enable row level security;
alter table public.vault_schedules enable row level security;
alter table public.vault_activity enable row level security;
alter table public.profile_settings enable row level security;
alter table public.linked_banks enable row level security;
alter table public.group_vaults enable row level security;
alter table public.group_vault_members enable row level security;

-- Policies: users

drop policy if exists "users can view own profile" on public.users;
create policy "users can view own profile"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "users can insert own profile" on public.users;
create policy "users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Policies: legacy accounts/transactions

drop policy if exists "users can view own accounts" on public.accounts;
create policy "users can view own accounts"
  on public.accounts for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert own accounts" on public.accounts;
create policy "users can insert own accounts"
  on public.accounts for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can view own transactions" on public.transactions;
create policy "users can view own transactions"
  on public.transactions for select
  using (
    exists (
      select 1 from public.accounts a
      where a.id = transactions.from_account_id
        and a.user_id = auth.uid()
    )
  );

-- Policies: V2

drop policy if exists "users can manage own wallet" on public.vault_wallets;
create policy "users can manage own wallet"
  on public.vault_wallets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can manage own vaults" on public.vaults;
create policy "users can manage own vaults"
  on public.vaults for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can manage own schedules" on public.vault_schedules;
create policy "users can manage own schedules"
  on public.vault_schedules for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can view own vault activity" on public.vault_activity;
create policy "users can view own vault activity"
  on public.vault_activity for select
  using (auth.uid() = user_id);

drop policy if exists "users can manage own profile settings" on public.profile_settings;
create policy "users can manage own profile settings"
  on public.profile_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can manage own linked banks" on public.linked_banks;
create policy "users can manage own linked banks"
  on public.linked_banks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can manage own group vaults" on public.group_vaults;
create policy "users can manage own group vaults"
  on public.group_vaults for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can manage own group vault members" on public.group_vault_members;
create policy "users can manage own group vault members"
  on public.group_vault_members for all
  using (
    exists (
      select 1 from public.group_vaults gv
      where gv.id = group_vault_members.group_vault_id
        and gv.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.group_vaults gv
      where gv.id = group_vault_members.group_vault_id
        and gv.user_id = auth.uid()
    )
  );

-- Signup bootstrap

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;

  insert into public.accounts (user_id, type, balance)
  values (new.id, 'main', 5000), (new.id, 'vault', 0)
  on conflict (user_id, type) do nothing;

  insert into public.vault_wallets (user_id, cash_balance)
  values (new.id, 2500)
  on conflict (user_id) do nothing;

  insert into public.vaults (user_id, name, balance, release_date, destination_type, destination_name)
  values
    (new.id, 'Taxes', 0, (current_date + interval '10 days')::date, 'bank', 'Tax Reserve'),
    (new.id, 'Insurance', 0, (current_date + interval '15 days')::date, 'vendor', 'Acme Insurance')
  on conflict do nothing;

  insert into public.profile_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.linked_banks (user_id, bank_name, account_last4, is_primary)
  values (new.id, 'Primary Checking', '0123', true)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- Legacy transfer function (kept for compatibility)

create or replace function public.transfer_funds(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_transaction_type transaction_type
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_balance numeric(12,2);
  v_from_user uuid;
  v_to_user uuid;
  v_transaction_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  if p_from_account_id = p_to_account_id then
    raise exception 'Source and destination must be different';
  end if;

  select balance, user_id
  into v_from_balance, v_from_user
  from public.accounts
  where id = p_from_account_id
  for update;

  if v_from_balance is null then
    raise exception 'Source account not found';
  end if;

  select user_id
  into v_to_user
  from public.accounts
  where id = p_to_account_id
  for update;

  if v_to_user is null then
    raise exception 'Destination account not found';
  end if;

  if v_from_user <> auth.uid() or v_to_user <> auth.uid() then
    raise exception 'Unauthorized account access';
  end if;

  if v_from_balance < p_amount then
    raise exception 'Insufficient funds';
  end if;

  update public.accounts
  set balance = balance - p_amount
  where id = p_from_account_id;

  update public.accounts
  set balance = balance + p_amount
  where id = p_to_account_id;

  insert into public.transactions (from_account_id, to_account_id, amount, transaction_type)
  values (p_from_account_id, p_to_account_id, p_amount, p_transaction_type)
  returning id into v_transaction_id;

  return v_transaction_id;
end;
$$;

-- V2 functions

create or replace function public.vault_top_up_wallet(p_amount numeric)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id uuid;
  v_activity_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select id into v_wallet_id
  from public.vault_wallets
  where user_id = auth.uid()
  for update;

  if v_wallet_id is null then
    raise exception 'Wallet not found';
  end if;

  update public.vault_wallets
  set cash_balance = cash_balance + p_amount
  where id = v_wallet_id;

  insert into public.vault_activity (user_id, activity_type, direction, amount, counterparty, note)
  values (auth.uid(), 'wallet_top_up', 'in', p_amount, 'Linked Bank', 'Added to Vault cash balance')
  returning id into v_activity_id;

  return v_activity_id;
end;
$$;

create or replace function public.vault_create(
  p_name text,
  p_release_date date,
  p_destination_type vault_destination_type,
  p_destination_name text,
  p_routing_number text,
  p_account_number text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vault_id uuid;
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Vault name is required';
  end if;

  insert into public.vaults (
    user_id, name, release_date, destination_type, destination_name, routing_number, account_number
  )
  values (
    auth.uid(),
    trim(p_name),
    p_release_date,
    p_destination_type,
    nullif(trim(coalesce(p_destination_name, '')), ''),
    nullif(trim(coalesce(p_routing_number, '')), ''),
    nullif(trim(coalesce(p_account_number, '')), '')
  )
  returning id into v_vault_id;

  return v_vault_id;
end;
$$;

create or replace function public.vault_fund(
  p_vault_id uuid,
  p_amount numeric,
  p_frequency schedule_frequency default 'one_time',
  p_next_run_at date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_balance numeric(12,2);
  v_wallet_id uuid;
  v_vault_user uuid;
  v_activity_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select id, cash_balance
  into v_wallet_id, v_wallet_balance
  from public.vault_wallets
  where user_id = auth.uid()
  for update;

  if v_wallet_id is null then
    raise exception 'Wallet not found';
  end if;

  select user_id into v_vault_user
  from public.vaults
  where id = p_vault_id
  for update;

  if v_vault_user is null or v_vault_user <> auth.uid() then
    raise exception 'Vault not found';
  end if;

  if v_wallet_balance < p_amount then
    raise exception 'Insufficient cash balance';
  end if;

  update public.vault_wallets
  set cash_balance = cash_balance - p_amount
  where id = v_wallet_id;

  update public.vaults
  set balance = balance + p_amount
  where id = p_vault_id;

  insert into public.vault_activity (user_id, vault_id, activity_type, direction, amount, note)
  values (auth.uid(), p_vault_id, 'vault_fund', 'out', p_amount, 'Moved from cash balance into vault')
  returning id into v_activity_id;

  if p_frequency <> 'one_time' then
    insert into public.vault_schedules (user_id, vault_id, amount, frequency, next_run_at)
    values (auth.uid(), p_vault_id, p_amount, p_frequency, p_next_run_at);
  end if;

  return v_activity_id;
end;
$$;

create or replace function public.vault_withdraw(
  p_vault_id uuid,
  p_amount numeric,
  p_destination vault_destination_type,
  p_counterparty text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vault_balance numeric(12,2);
  v_release_date date;
  v_vault_user uuid;
  v_wallet_id uuid;
  v_fee numeric(12,2) := 0;
  v_total numeric(12,2);
  v_is_early boolean := false;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select id into v_wallet_id
  from public.vault_wallets
  where user_id = auth.uid()
  for update;

  if v_wallet_id is null then
    raise exception 'Wallet not found';
  end if;

  select balance, release_date, user_id
  into v_vault_balance, v_release_date, v_vault_user
  from public.vaults
  where id = p_vault_id
  for update;

  if v_vault_user is null or v_vault_user <> auth.uid() then
    raise exception 'Vault not found';
  end if;

  if current_date < v_release_date then
    v_is_early := true;
    v_fee := round((p_amount * 0.05)::numeric, 2);
  end if;

  v_total := p_amount + v_fee;

  if v_vault_balance < v_total then
    raise exception 'Insufficient vault balance (including fee)';
  end if;

  update public.vaults
  set balance = balance - v_total
  where id = p_vault_id;

  if p_destination = 'bank' then
    update public.vault_wallets
    set cash_balance = cash_balance + p_amount
    where id = v_wallet_id;

    insert into public.vault_activity (user_id, vault_id, activity_type, direction, amount, counterparty, note)
    values (
      auth.uid(),
      p_vault_id,
      'vault_withdraw_bank',
      'in',
      p_amount,
      coalesce(p_counterparty, 'Linked Bank'),
      'Withdrawn from vault to cash balance'
    );
  else
    insert into public.vault_activity (user_id, vault_id, activity_type, direction, amount, counterparty, note)
    values (
      auth.uid(),
      p_vault_id,
      'vault_pay_vendor',
      'out',
      p_amount,
      coalesce(p_counterparty, 'Vendor'),
      'Paid directly to vendor'
    );
  end if;

  if v_fee > 0 then
    insert into public.vault_activity (user_id, vault_id, activity_type, direction, amount, counterparty, note)
    values (auth.uid(), p_vault_id, 'vault_early_fee', 'out', v_fee, 'Vault Company LLC', '5% early withdrawal fee');
  end if;

  return jsonb_build_object(
    'ok', true,
    'early', v_is_early,
    'fee', v_fee,
    'net_amount', p_amount
  );
end;
$$;

create or replace function public.vault_send_payment(
  p_amount numeric,
  p_counterparty text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id uuid;
  v_wallet_balance numeric(12,2);
  v_activity_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select id, cash_balance
  into v_wallet_id, v_wallet_balance
  from public.vault_wallets
  where user_id = auth.uid()
  for update;

  if v_wallet_id is null then
    raise exception 'Wallet not found';
  end if;

  if v_wallet_balance < p_amount then
    raise exception 'Insufficient cash balance';
  end if;

  update public.vault_wallets
  set cash_balance = cash_balance - p_amount
  where id = v_wallet_id;

  insert into public.vault_activity (user_id, activity_type, direction, amount, counterparty, note)
  values (auth.uid(), 'p2p_send', 'out', p_amount, nullif(trim(coalesce(p_counterparty, '')), ''), 'Sent payment')
  returning id into v_activity_id;

  return v_activity_id;
end;
$$;

create or replace function public.vault_request_payment(
  p_amount numeric,
  p_counterparty text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  insert into public.vault_activity (user_id, activity_type, direction, amount, counterparty, note)
  values (auth.uid(), 'p2p_request', 'info', p_amount, nullif(trim(coalesce(p_counterparty, '')), ''), 'Requested payment')
  returning id into v_activity_id;

  return v_activity_id;
end;
$$;

create or replace function public.vault_create_pool(
  p_amount numeric,
  p_title text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  insert into public.vault_activity (user_id, activity_type, direction, amount, counterparty, note)
  values (auth.uid(), 'pool_create', 'info', p_amount, nullif(trim(coalesce(p_title, '')), ''), 'Created money pool')
  returning id into v_activity_id;

  return v_activity_id;
end;
$$;

grant execute on function public.transfer_funds(uuid, uuid, numeric, transaction_type) to authenticated;
grant execute on function public.vault_top_up_wallet(numeric) to authenticated;
grant execute on function public.vault_create(text, date, vault_destination_type, text, text, text) to authenticated;
grant execute on function public.vault_fund(uuid, numeric, schedule_frequency, date) to authenticated;
grant execute on function public.vault_withdraw(uuid, numeric, vault_destination_type, text) to authenticated;
grant execute on function public.vault_send_payment(numeric, text) to authenticated;
grant execute on function public.vault_request_payment(numeric, text) to authenticated;
grant execute on function public.vault_create_pool(numeric, text) to authenticated;
