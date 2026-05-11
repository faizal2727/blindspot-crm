-- ============================================
-- BlindSpot CRM — Production Module Migration
-- Run this in Supabase SQL Editor after the initial schema.
-- Idempotent: safe to run multiple times.
-- ============================================

-- ---------- Workers (in-house + outsourced karigars) ----------
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'In-house',          -- 'In-house' or 'Outsourced'
  role TEXT,                              -- e.g. 'Tailor', 'Installer', 'QC'
  phone TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Production Jobs (one per order, tracks 4 stages) ----------
CREATE TABLE IF NOT EXISTS production_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Stage 1: Measurement
  measurement_worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  measurement_due TIMESTAMPTZ,
  measurement_done_at TIMESTAMPTZ,
  measurement_notes TEXT,

  -- Stage 2: Cutting
  cutting_worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  cutting_due TIMESTAMPTZ,
  cutting_done_at TIMESTAMPTZ,
  cutting_notes TEXT,

  -- Stage 3: Assembling
  assembling_worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  assembling_due TIMESTAMPTZ,
  assembling_done_at TIMESTAMPTZ,
  assembling_notes TEXT,

  -- Stage 4: Delivery
  delivery_worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  delivery_due TIMESTAMPTZ,
  delivery_done_at TIMESTAMPTZ,
  delivery_notes TEXT,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_production_order ON production_jobs (order_id);

-- ---------- RLS ----------
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "anon_all" ON workers';
  EXECUTE 'CREATE POLICY "anon_all" ON workers FOR ALL USING (true) WITH CHECK (true)';
  EXECUTE 'DROP POLICY IF EXISTS "anon_all" ON production_jobs';
  EXECUTE 'CREATE POLICY "anon_all" ON production_jobs FOR ALL USING (true) WITH CHECK (true)';
END $$;

-- ---------- Seed sample workers ----------
INSERT INTO workers (name, type, role, phone, notes)
SELECT * FROM (VALUES
  ('Suresh Kumar',  'In-house',   'Master Tailor',   '+91 98472 11111', 'Senior — handles complex Roman & motorized work'),
  ('Anil Pillai',   'In-house',   'Tailor',          '+91 98472 22222', 'Roller & vertical blinds'),
  ('Ramesh K.',     'In-house',   'Installer',       '+91 98472 33333', 'Site installation, motorized setup'),
  ('Babu Karigar',  'Outsourced', 'Stitching Unit',  '+91 99950 44444', 'Aluva unit — bulk fabric stitching'),
  ('Lijo Thomas',   'In-house',   'Measurement',     '+91 98472 55555', 'Site measurement, AutoCAD drawings')
) AS v(name, type, role, phone, notes)
WHERE NOT EXISTS (SELECT 1 FROM workers);

-- ============================================
-- Verify:
--   SELECT COUNT(*) FROM workers;          -- should be 5
--   SELECT COUNT(*) FROM production_jobs;  -- should be 0 (created on demand)
-- ============================================
