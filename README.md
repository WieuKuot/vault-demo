# Vault Demo V2 (Simulated Money Only)

Cash App-style demo with:
- Money tab (cash balance + multiple vaults)
- Pay tab (send/request/pool + vault payouts)
- Activity tab (most recent first)
- Profile/settings page with discipline report
- 5% early-withdraw fee (bank withdrawals before vault release date)
- Interactive profile controls (security/privacy/limits/notifications/theme/banks)
- Group Vaults (invite person, add contributions, leader assignment, release-date settlement)
- Funding confirmation popups + vault creation warning popup + payout warning popup

## Run the app

```bash
cd /Users/wieukuot/Documents/vault-demo
npm install
npm run dev
```

## Supabase setup

1. Copy env file and fill keys:

```bash
cp .env.example .env.local
```

2. In Supabase SQL Editor, run:
   - `supabase/schema.sql`

3. Refresh your app and sign in.
4. On `/profile`, click `+$10,000 Cash` to instantly top up demo balance.
5. Put your logo image at `public/vault-logo.png` to render it in the top-left app header.

## If you already had V1 running

- Re-run `supabase/schema.sql` in SQL Editor (safe/idempotent)
- Use your real auth user id if you need manual inserts

## Main routes

- `/login`
- `/dashboard` (Money)
- `/pay`
- `/activity`
- `/profile`

## Demo disclaimer

Footer text appears on all screens:

> Demo only. No real money. Balances are simulated.
