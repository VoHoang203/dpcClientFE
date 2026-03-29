-- ============================================================================
-- CHẠY FILE NÀY TRƯỚC (ngắn, ít lỗi nhất)
--
-- Neon Console:
--   1. Vào project ĐÚNG với connection string trong .env (DATABASE_URL).
--   2. Trái menu: "SQL Editor" (KHÔNG phải chỉ xem Table Editor — phải chạy SQL).
--   3. Branch góc trên = "main" (hoặc branch trùng URL pooler của bạn).
--   4. Dán TOÀN BỘ file → nút Run / Ctrl+Enter.
--   5. Refresh Table Editor (F5) — sẽ thấy party_cells, party_admissions, ...
--
-- Không dùng CREATE EXTENSION (tránh một số project bị chặn extension).
-- gen_random_uuid() có sẵn trên PostgreSQL 13+ (Neon thường dùng 15+).
-- ============================================================================

CREATE TABLE IF NOT EXISTS party_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS party_admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_cell_id UUID REFERENCES party_cells (id) ON DELETE SET NULL,
  demo_session_key TEXT UNIQUE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  phone TEXT,
  email TEXT,
  permanent_address TEXT,
  reason TEXT,
  documents_url TEXT,
  documents_meta JSONB,
  current_step SMALLINT NOT NULL DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 8),
  workflow_status TEXT NOT NULL DEFAULT 'active'
    CHECK (workflow_status IN ('active', 'rejected', 'completed')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('priority', 'normal', 'low')),
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_party_admissions_session ON party_admissions (demo_session_key);
CREATE INDEX IF NOT EXISTS idx_party_admissions_step ON party_admissions (current_step);
CREATE INDEX IF NOT EXISTS idx_party_admissions_status ON party_admissions (workflow_status);

CREATE TABLE IF NOT EXISTS admission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID NOT NULL REFERENCES party_admissions (id) ON DELETE CASCADE,
  step_number SMALLINT NOT NULL CHECK (step_number >= 1 AND step_number <= 7),
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completion_date TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (admission_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_admission_progress_admission ON admission_progress (admission_id);

CREATE TABLE IF NOT EXISTS admission_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiver_role TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'admission',
  admission_id UUID REFERENCES party_admissions (id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admission_notif_role_read ON admission_notifications (receiver_role, is_read, created_at DESC);

-- 1 chi bộ để POST /api/admissions (mã FPTU-DPC2) không lỗi
INSERT INTO party_cells (id, name, code, address)
VALUES (
  '11111111-1111-1111-1111-111111111101',
  'Chi bộ FPTU DPC2',
  'FPTU-DPC2',
  'Hòa Lạc'
)
ON CONFLICT (code) DO NOTHING;

-- Kiểm tra (sau Run phải thấy 4 dòng)
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'party_cells',
    'party_admissions',
    'admission_progress',
    'admission_notifications'
  )
ORDER BY tablename;
