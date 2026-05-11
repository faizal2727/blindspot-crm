-- ============================================
-- BlindSpot CRM — Supabase Setup Script
-- Run this entire file in: Supabase Dashboard → SQL Editor → New query
-- ============================================
-- Idempotent: safe to run multiple times. Tables are created only if missing.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- Settings (singleton) ----------
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  company TEXT NOT NULL DEFAULT 'BlindSpot Drapery Co.',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  gst TEXT DEFAULT '',
  bank TEXT DEFAULT '',
  terms TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT settings_singleton CHECK (id = 1)
);

INSERT INTO settings (id, company, address, phone, email, gst, bank, terms) VALUES (
  1,
  'BlindSpot Drapery Co.',
  E'Door No. 24/586, MG Road,\nKochi, Kerala 682016',
  '+91 98470 00000',
  'sales@blindspot.in',
  '32AABCB1234M1Z5',
  'HDFC Bank · A/c 50100123456789 · IFSC HDFC0001234',
  'Goods once sold will not be taken back. 50% advance with order, balance on delivery.'
) ON CONFLICT (id) DO NOTHING;

-- ---------- Customers ----------
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Designer',
  contact TEXT, phone TEXT, email TEXT,
  city TEXT, address TEXT, gst TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Leads ----------
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  stage TEXT DEFAULT 'New',
  value NUMERIC(12, 2) DEFAULT 0,
  source TEXT DEFAULT 'Direct',
  next_action TEXT,
  next_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Quotes ----------
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  number TEXT UNIQUE NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  validity INTEGER DEFAULT 30,
  status TEXT DEFAULT 'Draft',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Orders ----------
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  number TEXT UNIQUE NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  delivery_date TIMESTAMPTZ,
  status TEXT DEFAULT 'Pending',
  amount NUMERIC(12, 2) DEFAULT 0,
  paid NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Payments ----------
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  amount NUMERIC(12, 2) NOT NULL,
  mode TEXT DEFAULT 'Bank Transfer',
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Inventory ----------
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Other',
  unit TEXT DEFAULT 'piece',
  stock NUMERIC(12, 2) DEFAULT 0,
  rate NUMERIC(12, 2) DEFAULT 0,
  gst INTEGER DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security policies
-- ============================================
-- For a single-tenant CRM with no auth yet, we allow public read+write
-- through the anon key. This is fine because:
--   1. The site URL is private (no one is meant to find it).
--   2. We will add Netlify password-protection in front.
-- When you're ready for proper user auth, replace these with auth.uid() based policies.

ALTER TABLE settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory  ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if rerunning, then create fresh
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['settings','customers','leads','quotes','orders','payments','inventory']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_all" ON %I', t);
    EXECUTE format('CREATE POLICY "anon_all" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ============================================
-- Sample seed data (only inserts if tables are empty)
-- ============================================
INSERT INTO customers (id, name, type, contact, phone, email, city, address, gst, notes)
SELECT * FROM (VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Aaranya Interiors', 'Designer', 'Priya Menon', '+91 98470 12345', 'priya@aaranya.in', 'Kochi', 'MG Road, Ernakulam', '32AABCA1234M1Z5', 'Premium projects, prefers linen blends'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'Skyline Builders', 'Builder', 'Rajesh Kurian', '+91 94470 67890', 'rajesh@skylinebuilders.com', 'Trivandrum', 'Vazhuthacaud', '32AAGCS5678P1Z3', 'Bulk apartment orders, 50+ units typical'),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'Decor Junction', 'Dealer', 'Faisal Ahmed', '+91 99950 11223', 'faisal@decorjunction.in', 'Kozhikode', 'Mavoor Road', '32AACFD9012Q1Z1', 'Showroom dealer, fast mover for roller blinds'),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'Studio Vermillion', 'Architect', 'Anita Pillai', '+91 98950 33445', 'anita@vermillion.studio', 'Kochi', 'Panampilly Nagar', '32AAACS3456R1Z7', 'Boutique villa projects')
) AS v(id, name, type, contact, phone, email, city, address, gst, notes)
WHERE NOT EXISTS (SELECT 1 FROM customers);

INSERT INTO leads (customer_id, title, stage, value, source, next_action, next_date, notes)
SELECT * FROM (VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Marriott Suite Renovation', 'Quoted', 285000, 'Referral', 'Follow up on quote approval', NOW() + INTERVAL '2 days', 'Need motorized blinds for 12 suites'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'Skyline Heights — 80 Units', 'Negotiation', 1450000, 'Direct', 'Site visit for measurement', NOW() + INTERVAL '5 days', 'Vertical blinds for all bedrooms'),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'Quarterly Stock Order', 'New', 175000, 'Repeat', 'Send catalogue', NOW() + INTERVAL '1 day', 'Roller blinds, mixed colors'),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'Villa Calicut Project', 'Won', 95000, 'Website', 'Order in production', NOW() + INTERVAL '7 days', 'Roman blinds, raw silk')
) AS v(customer_id, title, stage, value, source, next_action, next_date, notes)
WHERE NOT EXISTS (SELECT 1 FROM leads);

INSERT INTO inventory (sku, name, category, unit, stock, rate, gst)
SELECT * FROM (VALUES
  ('RB-PRM-001', 'Premium Roller Blind — Cream', 'Roller Blind', 'sqft', 850::numeric, 180::numeric, 12),
  ('RB-PRM-002', 'Premium Roller Blind — Charcoal', 'Roller Blind', 'sqft', 420::numeric, 180::numeric, 12),
  ('VB-VRT-001', 'Vertical Blind — Off White', 'Vertical Blind', 'sqft', 1200::numeric, 145::numeric, 12),
  ('RM-SLK-001', 'Roman Blind — Raw Silk Cream', 'Roman Blind', 'piece', 24::numeric, 8500::numeric, 12),
  ('RM-SLK-002', 'Roman Blind — Raw Silk Sage', 'Roman Blind', 'piece', 18::numeric, 8500::numeric, 12),
  ('MOT-RB-001', 'Motorized Roller Blind 6x5ft', 'Motorized', 'piece', 6::numeric, 18500::numeric, 18),
  ('CTN-LIN-001', 'Linen Curtain Fabric — Natural', 'Curtain Fabric', 'meter', 340::numeric, 650::numeric, 12),
  ('CTN-VEL-001', 'Velvet Curtain Fabric — Wine', 'Curtain Fabric', 'meter', 85::numeric, 1200::numeric, 12),
  ('ACC-ROD-001', 'Brass Curtain Rod 8ft', 'Accessory', 'piece', 45::numeric, 1800::numeric, 18)
) AS v(sku, name, category, unit, stock, rate, gst)
WHERE NOT EXISTS (SELECT 1 FROM inventory);

-- ============================================
-- Done. Verify by running:
--   SELECT COUNT(*) FROM customers;  -- should be 4
--   SELECT COUNT(*) FROM inventory;  -- should be 9
-- ============================================
