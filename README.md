# GY Power Watch

Mobile-first power outage tracker for Guyana. Auto-scrapes GPL public advisory
pages every 30 minutes (Vercel cron) and lets an admin add notices from GPL's
Facebook page in seconds.

## Deploy (5 minutes)

1. **Supabase** — new project, schema already applied via migration.
2. **GitHub** — push this folder to a new repo (ericjewan-spec/gy-power-watch).
3. **Vercel** — import the repo, add env vars from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ADMIN_KEY` (your admin passcode; must match the admin_key in Supabase private.app_config)
4. Deploy. Cron in `vercel.json` hits `/api/scrape` every 30 min automatically.
5. Trigger the first scrape manually: open `https://your-app.vercel.app/api/scrape`.

## Pages

- `/` — public board: live outages with elapsed duration, planned outages with
  countdowns, maintenance notices, restored-in-24h list.
- `/admin` — enter `ADMIN_KEY`, paste GPL Facebook advisories, mark restored.

## Sources

- gplinc.com Power Alerts, Power Watch and Dashboard advisories (scraped).
- GPL Facebook — added via /admin (Facebook blocks server-side scraping).
