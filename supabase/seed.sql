-- Demo seed for a known user id.

insert into public.users (id, email)
values ('11111111-1111-1111-1111-111111111111', 'demo@vault.app')
on conflict (id) do update set email = excluded.email;

insert into public.vault_wallets (user_id, cash_balance)
values ('11111111-1111-1111-1111-111111111111', 5000)
on conflict (user_id) do update set cash_balance = excluded.cash_balance;

insert into public.vaults (user_id, name, balance, release_date, destination_type, destination_name, routing_number, account_number)
values
  ('11111111-1111-1111-1111-111111111111', 'Taxes', 1500, (current_date + interval '7 day')::date, 'bank', 'Tax Reserve', '021000021', '000123456789'),
  ('11111111-1111-1111-1111-111111111111', 'Insurance', 800, (current_date + interval '14 day')::date, 'vendor', 'Acme Insurance', '021000021', '000123456789'),
  ('11111111-1111-1111-1111-111111111111', 'Maintenance', 300, (current_date + interval '5 day')::date, 'vendor', 'Fleet Service Co', '021000021', '000123456789')
on conflict do nothing;

insert into public.profile_settings (user_id, full_name, business_name, daily_send_limit, theme)
values ('11111111-1111-1111-1111-111111111111', 'Demo Owner', 'Vault Demo LLC', 2500, 'onyx')
on conflict (user_id) do nothing;

insert into public.linked_banks (user_id, bank_name, account_last4, is_primary)
values ('11111111-1111-1111-1111-111111111111', 'Primary Checking', '0123', true)
on conflict do nothing;
