-- BlindSpot CRM — Initial Schema
-- All tables use UUIDs for IDs to make them URL-safe and merge-friendly.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Settings (single row, app-wide config)
CREATE TABLE settings (
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
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Designer',
  contact TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  address TEXT,
  gst TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_customers_name ON customers (LOWER(name));
CREATE INDEX idx_customers_city ON customers (LOWER(city));

-- Leads
CREATE TABLE leads (
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
CREATE INDEX idx_leads_stage ON leads (stage);
CREATE INDEX idx_leads_customer ON leads (customer_id);

-- Quotes
CREATE TABLE quotes (
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
CREATE INDEX idx_quotes_customer ON quotes (customer_id);
CREATE INDEX idx_quotes_number ON quotes (number);

-- Orders
CREATE TABLE orders (
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
CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_orders_status ON orders (status);

-- Payments
CREATE TABLE payments (
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
CREATE INDEX idx_payments_customer ON payments (customer_id);
CREATE INDEX idx_payments_order ON payments (order_id);

-- Inventory
CREATE TABLE inventory (
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
CREATE INDEX idx_inventory_sku ON inventory (sku);
CREATE INDEX idx_inventory_category ON inventory (category);

-- Seed sample data so the app isn't empty on first deploy.
-- This makes the app feel alive immediately; users can delete and replace as needed.
INSERT INTO customers (id, name, type, contact, phone, email, city, address, gst, notes) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Aaranya Interiors', 'Designer', 'Priya Menon', '+91 98470 12345', 'priya@aaranya.in', 'Kochi', 'MG Road, Ernakulam', '32AABCA1234M1Z5', 'Premium projects, prefers linen blends'),
  ('22222222-2222-2222-2222-222222222222', 'Skyline Builders', 'Builder', 'Rajesh Kurian', '+91 94470 67890', 'rajesh@skylinebuilders.com', 'Trivandrum', 'Vazhuthacaud', '32AAGCS5678P1Z3', 'Bulk apartment orders, 50+ units typical'),
  ('33333333-3333-3333-3333-333333333333', 'Decor Junction', 'Dealer', 'Faisal Ahmed', '+91 99950 11223', 'faisal@decorjunction.in', 'Kozhikode', 'Mavoor Road', '32AACFD9012Q1Z1', 'Showroom dealer, fast mover for roller blinds'),
  ('44444444-4444-4444-4444-444444444444', 'Studio Vermillion', 'Architect', 'Anita Pillai', '+91 98950 33445', 'anita@vermillion.studio', 'Kochi', 'Panampilly Nagar', '32AAACS3456R1Z7', 'Boutique villa projects');

INSERT INTO leads (customer_id, title, stage, value, source, next_action, next_date, notes) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Marriott Suite Renovation', 'Quoted', 285000, 'Referral', 'Follow up on quote approval', NOW() + INTERVAL '2 days', 'Need motorized blinds for 12 suites'),
  ('22222222-2222-2222-2222-222222222222', 'Skyline Heights — 80 Units', 'Negotiation', 1450000, 'Direct', 'Site visit for measurement', NOW() + INTERVAL '5 days', 'Vertical blinds for all bedrooms'),
  ('33333333-3333-3333-3333-333333333333', 'Quarterly Stock Order', 'New', 175000, 'Repeat', 'Send catalogue', NOW() + INTERVAL '1 day', 'Roller blinds, mixed colors'),
  ('44444444-4444-4444-4444-444444444444', 'Villa Calicut Project', 'Won', 95000, 'Website', 'Order in production', NOW() + INTERVAL '7 days', 'Roman blinds, raw silk');

INSERT INTO inventory (sku, name, category, unit, stock, rate, gst) VALUES
  ('RB-PRM-001', 'Premium Roller Blind — Cream', 'Roller Blind', 'sqft', 850, 180, 12),
  ('RB-PRM-002', 'Premium Roller Blind — Charcoal', 'Roller Blind', 'sqft', 420, 180, 12),
  ('VB-VRT-001', 'Vertical Blind — Off White', 'Vertical Blind', 'sqft', 1200, 145, 12),
  ('RM-SLK-001', 'Roman Blind — Raw Silk Cream', 'Roman Blind', 'piece', 24, 8500, 12),
  ('RM-SLK-002', 'Roman Blind — Raw Silk Sage', 'Roman Blind', 'piece', 18, 8500, 12),
  ('MOT-RB-001', 'Motorized Roller Blind 6x5ft', 'Motorized', 'piece', 6, 18500, 18),
  ('CTN-LIN-001', 'Linen Curtain Fabric — Natural', 'Curtain Fabric', 'meter', 340, 650, 12),
  ('CTN-VEL-001', 'Velvet Curtain Fabric — Wine', 'Curtain Fabric', 'meter', 85, 1200, 12),
  ('ACC-ROD-001', 'Brass Curtain Rod 8ft', 'Accessory', 'piece', 45, 1800, 18);
