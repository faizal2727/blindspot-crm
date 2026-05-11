# BlindSpot CRM

> A B2B CRM for curtain & blinds suppliers. Built for Kerala-based businesses, but works anywhere.

**Stack:** React + Vite frontend · Supabase (Postgres database) · Deploys as a static site to Netlify.

---

## Architecture

```
Browser  ─►  Netlify (static site)  ─►  Supabase (Postgres + REST)
```

The frontend talks to Supabase directly using the anon key. No serverless functions, no backend code to deploy. Simpler, faster, cheaper.

---

## Setup (10 minutes)

### Step 1 — Supabase project

1. **[supabase.com/dashboard](https://supabase.com/dashboard)** → New project
2. Region: **South Asia (Mumbai)** for fastest queries from Kerala
3. Wait ~2 minutes for provisioning
4. Once ready, go to **SQL Editor** (left sidebar) → **New query**
5. Open `supabase-setup.sql` from this repo, **copy all contents, paste into the editor, click Run**
6. You should see "Success. No rows returned." — schema is created with sample data
7. Go to **Settings → API** in Supabase. Copy these two values (you'll need them in Step 2):
   - **Project URL** (e.g. `https://abcd1234.supabase.co`)
   - **anon public key** (a long JWT string, starts with `eyJ...`)

### Step 2 — Configure Netlify env vars

1. Go to your Netlify project: **app.netlify.com/projects/blindspot-crm-kerala**
2. **Project configuration → Environment variables → Add a variable** (twice):
   - `VITE_SUPABASE_URL` = your Project URL from Step 1
   - `VITE_SUPABASE_ANON_KEY` = your anon key from Step 1
3. Make sure both are scoped to **All scopes** (or at least Builds + Runtime)

### Step 3 — Deploy

If your GitHub repo is already linked: **Deploys → Trigger deploy → Deploy site**.

That's it. The build will pick up the env vars, bundle them into the site, and you're live at:
**https://blindspot-crm-kerala.netlify.app**

---

## Local development

```bash
cd blindspot
npm install

# Create a .env.local file with your Supabase keys:
echo "VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co" > .env.local
echo "VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY" >> .env.local

npm run dev   # opens http://localhost:5173
```

---

## Customizing

**Update company details first.** Once deployed, open the app → **Settings** in the sidebar → fill in real company name, GST, address, phone, bank info. These auto-flow into every printed quote and WhatsApp message.

**Replace sample data.** The seed customers/leads/inventory are placeholders. Delete them through the UI, or run `DELETE FROM customers; DELETE FROM leads; DELETE FROM inventory;` in Supabase SQL Editor.

**Custom domain.** Netlify dashboard → Domain management → Add domain. Free SSL automatically.

---

## Security notes

The current setup uses Supabase Row Level Security with permissive policies for the anon key. This means:

- **Anyone with the URL + anon key can read/write all data.** The anon key is bundled into the frontend JS, so it's effectively public.
- This is acceptable because your site URL is private (you don't link it publicly).
- For added safety, enable **Netlify password protection**: Project configuration → Visitor access → require password.

When you're ready for proper user accounts (multi-user with login):

1. Enable Supabase Auth (Email or Google providers in Supabase dashboard)
2. Replace the RLS policies in `supabase-setup.sql` with `auth.uid()`-based ones
3. Add login UI in the frontend using `supabase.auth.signInWithPassword()` or `signInWithOAuth({ provider: 'google' })`

I can guide you through this whenever you want.

---

## Project layout

```
blindspot/
├── index.html
├── netlify.toml             # Static-site build config
├── package.json
├── vite.config.js
├── supabase-setup.sql       # ← Run this in Supabase SQL Editor
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx             # React entry
    ├── App.jsx              # All views: dashboard, leads, customers, etc.
    ├── api.js               # Supabase client + thin API surface
    ├── components.jsx       # Pill, ModalWrap, Toast, WaIcon
    ├── forms.jsx            # All form modals
    ├── utils.js             # Formatters + WhatsApp templates
    └── styles.css           # All app styling
```

---

## Adding new features

**To add a new field** (e.g. `customers.website`):

1. In Supabase SQL Editor: `ALTER TABLE customers ADD COLUMN website TEXT;`
2. Add the field to `CustomerForm` in `src/forms.jsx`
3. Push to GitHub — Netlify auto-deploys

**To add a new resource** (e.g. `vendors`):

1. Add table + RLS policy in Supabase SQL Editor
2. Build a new view in `App.jsx` modeled on `Customers`
3. Push to GitHub

The Supabase client handles all CRUD generically via `api.list/get/create/update/remove`.

---

Built with care. Nothing slips through.
