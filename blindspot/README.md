# BlindSpot CRM

> A B2B CRM for curtain & blinds suppliers. Built for Kerala-based businesses, but works anywhere.

**Stack:** React + Vite frontend · Netlify Functions (serverless API) · Netlify Database (managed Postgres) · Deploys to Netlify.

---

## What's inside

- **Dashboard** — pipeline value, won deals, outstanding receivables, this week's follow-ups
- **Leads & Pipeline** — 5-stage pipeline (New → Quoted → Negotiation → Won / Lost) with next-action dates
- **Customers** — designers, architects, builders, dealers — with full contact info, GST, business history
- **Quotes** — multi-line GST quotes, print/PDF, WhatsApp share
- **Orders** — production status tracking with payment progress
- **Payments** — multi-mode payment ledger that auto-reconciles to orders
- **Inventory** — SKU-based stock with low-stock alerts
- **Reports** — sales trends, top customers, lead sources, pipeline funnel, receivables
- **Settings** — company profile that flows into invoices and WhatsApp messages
- **WhatsApp integration** — one-click follow-ups, quote sharing, payment reminders

---

## Deploy in 2 minutes

A Netlify project named **blindspot-crm-kerala** has already been created for you. The live URL will be: **https://blindspot-crm-kerala.netlify.app**

### Option A: Deploy via Netlify CLI (recommended)

This is the fastest path. From the `blindspot/` folder:

```bash
# 1. Install Netlify CLI globally (one-time, takes ~30s)
npm install -g netlify-cli

# 2. Log in to your Netlify account in the browser
netlify login

# 3. Link this folder to your existing site
netlify link --id c579b952-7855-4238-946f-f7620674e1e6

# 4. Deploy
netlify deploy --build --prod
```

The first `--prod` deploy will:
1. Provision a fresh Postgres database for the site
2. Run the migration in `netlify/database/migrations/001_initial_schema/` (creates tables + seeds sample data)
3. Build the frontend with Vite
4. Bundle the `/api/*` serverless function
5. Publish to `https://blindspot-crm-kerala.netlify.app`

### Option B: Connect a GitHub repo

If you'd prefer Git-based deploys (recommended for ongoing development):

1. Push this folder to a new GitHub repo
2. Go to https://app.netlify.com/projects/blindspot-crm-kerala
3. Settings → Build & Deploy → Link to a Git repository
4. Select your repo. Netlify auto-detects `netlify.toml` settings.
5. Every `git push` to main = auto-deploy. Every PR = preview deployment with its own database branch.

---

## Local development

```bash
cd blindspot
npm install
netlify dev      # starts at http://localhost:8888
```

`netlify dev` provisions a local Postgres branch automatically — no manual DB setup required.

---

## Architecture in one paragraph

The frontend is a single-page React app served as static files from Netlify's CDN. It talks to one serverless function at `/api/*` (mapped via `netlify.toml`) which dispatches REST CRUD operations against a managed Postgres database. The function uses `@netlify/database`'s tagged-template SQL driver — no ORM, just safe parameterized queries. The schema lives in `netlify/database/migrations/` and is automatically applied on first deploy. Each pull request gets its own isolated database branch with a copy of production data, so you can test changes risk-free.

---

## Customizing on day one

**1. Update company details (most important).** Open the deployed app → **Settings** in the sidebar → fill in your real company name, GST, address, phone, bank info, and terms. These auto-flow into every printed quote and WhatsApp message.

**2. Replace sample data.** Delete the four sample customers / leads / inventory items and add your own. The seed data lives at the bottom of `netlify/database/migrations/001_initial_schema/migration.sql` if you want to remove it before the first deploy entirely.

**3. Custom domain.** In the Netlify dashboard → Domain settings → add your domain (e.g. `crm.yourbrand.in`). Free SSL is provisioned automatically.

---

## What's intentionally NOT included (yet)

- **Authentication.** Anyone with the URL can access the CRM. To restrict it: Netlify dashboard → Site settings → Visitor access → enable password protection (free) or invite team members via Netlify Identity.
- **Multi-user roles.** Single-tenant for now. When you're ready, add Netlify Identity + role-based checks in `netlify/functions/api.js`.
- **PDF generation server-side.** Currently uses browser print-to-PDF (works great, zero infrastructure). For server-rendered PDFs (e.g. emailed invoices), add Puppeteer in a separate function.
- **Email notifications.** WhatsApp links cover the urgent cases. Add SendGrid or Resend later if you want automated daily digests.

---

## Project layout

```
blindspot/
├── index.html                  # Vite entry
├── netlify.toml                # Netlify build config + /api routing
├── package.json
├── vite.config.js              # Vite + Netlify plugin
├── public/
│   └── favicon.svg
├── netlify/
│   ├── functions/
│   │   └── api.js              # Single REST function — all CRUD lives here
│   └── database/
│       └── migrations/
│           └── 001_initial_schema/
│               └── migration.sql
└── src/
    ├── main.jsx                # React entry
    ├── App.jsx                 # All views: dashboard, leads, customers, etc.
    ├── api.js                  # Frontend REST client
    ├── components.jsx          # Reusable UI: Pill, ModalWrap, Toast
    ├── forms.jsx               # All form modals
    ├── utils.js                # Formatters + WhatsApp templates
    └── styles.css              # All app styles (Fraunces serif + Inter)
```

---

## Adding new features

**To add a new field to an existing table** (e.g. `customers.website`):

1. Create a new migration:
   ```
   netlify/database/migrations/002_add_customer_website/migration.sql
   ALTER TABLE customers ADD COLUMN website TEXT;
   ```
2. Add `'website'` to the `customers` array in `netlify/functions/api.js` (the `TABLES` config).
3. Add the field to `CustomerForm` in `src/forms.jsx`.
4. Deploy. Migration runs automatically.

**To add a new resource** (e.g. `vendors`):

1. New migration creating the table.
2. Add `vendors: ['name', 'phone', ...]` to `TABLES` in `api.js`.
3. Build a new view in `App.jsx` modeled on `Customers`.

The single-function REST pattern keeps things simple at this scale. If you eventually outgrow it, splitting into per-resource functions is straightforward.

---

Built with care. Nothing slips through.
