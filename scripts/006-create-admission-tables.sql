-- =============================================================================
-- Admission workflow (QCUT → Chi ủy → Phó Bí thư → Bí thư) + notifications
--
-- CÁCH CHẠY (bắt buộc — không chạy thì API /api/admissions trả 500):
--   1. Neon Dashboard → chọn đúng project (cùng connection string với DATABASE_URL trong .env).
--   2. SQL Editor → dán TOÀN BỘ file này → Run.
--   3. Branches: nếu dùng branch "development", tạo bảng trên branch đó hoặc đổi DATABASE_URL cho khớp.
--   4. Khởi động lại Next sau khi sửa .env: `npm run dev`
--
-- Nếu Table Editor vẫn KHÔNG có bảng admission: chạy trước file
-- scripts/007-admission-ddl-only.sql (ngắn, không dùng extension).
-- =============================================================================

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

-- Thông báo theo role (demo): chi_uy | pho_bi_thu | bi_thu | qcut
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

COMMENT ON TABLE party_cells IS 'Chi bộ';
COMMENT ON TABLE party_admissions IS 'Hồ sơ xin kết nạp (demo, không FK users)';
COMMENT ON TABLE admission_progress IS '7 bước quy trình / hồ sơ';
COMMENT ON TABLE admission_notifications IS 'Thông báo realtime (lọc theo receiver_role)';

-- -----------------------------------------------------------------------------
-- Seed: 1 chi bộ + 4 hồ sơ mẫu (giống UI pending-review) + tiến độ + vài thông báo
-- -----------------------------------------------------------------------------

INSERT INTO party_cells (id, name, code, address)
VALUES (
    '11111111-1111-1111-1111-111111111101',
    'Chi bộ FPTU DPC2',
    'FPTU-DPC2',
    'Hòa Lạc'
  )
ON CONFLICT (code) DO NOTHING;

INSERT INTO party_admissions (
    id,
    party_cell_id,
    demo_session_key,
    full_name,
    date_of_birth,
    phone,
    email,
    permanent_address,
    reason,
    documents_meta,
    current_step,
    workflow_status,
    priority
  )
VALUES
  (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    'demo-session-qcut-001',
    'Nguyễn Văn B',
    '2000-03-15',
    '0912000001',
    'vanb@example.com',
    'Q. Thủ Đức, TP.HCM',
    'Lý do xin vào Đảng (mẫu).',
    '{"don": true, "ly_lich": true, "gioi_thieu": false, "nghi_quyet_doan": true}'::jsonb,
    3,
    'active',
    'priority'
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111101',
    NULL,
    'Trần Thị C',
    '1999-07-20',
    '0912000002',
    'thic@example.com',
    'Q. Bình Thạnh, TP.HCM',
    NULL,
    '{"don": true, "ly_lich": true, "gioi_thieu": true, "nghi_quyet_doan": true}'::jsonb,
    4,
    'active',
    'normal'
  ),
  (
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111101',
    NULL,
    'Lê Văn D',
    '2001-11-10',
    '0923456789',
    'levand@example.com',
    'Q. Bình Thạnh, TP.HCM',
    NULL,
    '{"don": true, "ly_lich": true, "gioi_thieu": true, "nghi_quyet_doan": true}'::jsonb,
    6,
    'active',
    'normal'
  ),
  (
    '22222222-2222-2222-2222-222222222204',
    '11111111-1111-1111-1111-111111111101',
    NULL,
    'Phạm Minh E',
    '2002-01-05',
    '0912000004',
    'minhe@example.com',
    'Q. Gò Vấp, TP.HCM',
    NULL,
    '{"don": true, "ly_lich": false, "gioi_thieu": false, "nghi_quyet_doan": false}'::jsonb,
    2,
    'active',
    'low'
  )
ON CONFLICT (id) DO NOTHING;

-- Tiến độ chi tiết (theo từng hồ sơ): chỉ insert nếu chưa có
INSERT INTO admission_progress (admission_id, step_number, title, description, is_completed, completion_date, note)
SELECT
  a.id,
  s.step,
  s.tit,
  s.des,
  s.done,
  CASE WHEN s.cd IS NOT NULL THEN s.cd::timestamptz ELSE NULL END,
  s.nt
FROM party_admissions a
  CROSS JOIN (
    VALUES
      (1, 'Nộp hồ sơ', 'QCUT nộp hồ sơ xin kết nạp', true, '2025-01-15'::text, 'Hồ sơ đầy đủ'),
      (2, 'Chi ủy kiểm tra', 'Đ/c Hồng (CU) kiểm tra lỗi hồ sơ', true, '2025-01-18'::text, 'Đã kiểm tra, không có lỗi'),
      (3, 'PBT duyệt nội dung', 'Đ/c Ngân (PBT) duyệt nội dung hồ sơ', false, NULL::text, NULL::text),
      (4, 'Xác minh lý lịch', 'QCUT đi xác minh lý lịch tại địa phương', false, NULL::text, NULL::text),
      (5, 'Kiểm tra dấu đỏ', 'Đ/c Ngân (PBT) kiểm tra dấu đỏ và chốt', false, NULL::text, NULL::text),
      (6, 'Soạn nghị quyết', 'Đ/c Hồng (CU) soạn Nghị quyết kết nạp', false, NULL::text, NULL::text),
      (7, 'Duyệt nghị quyết', 'Đ/c Thủy (BT) duyệt Nghị quyết', false, NULL::text, NULL::text)
  ) AS s (step, tit, des, done, cd, nt)
WHERE a.id = '22222222-2222-2222-2222-222222222201'
ON CONFLICT (admission_id, step_number) DO NOTHING;

-- Hồ sơ 2: tiến độ đến bước 4 (2 bước đầu xong)
INSERT INTO admission_progress (admission_id, step_number, title, description, is_completed, completion_date, note)
SELECT
  a.id,
  s.step,
  s.tit,
  s.des,
  s.done,
  CASE WHEN s.cd IS NOT NULL THEN s.cd::timestamptz ELSE NULL END,
  s.nt
FROM party_admissions a
  CROSS JOIN (
    VALUES
      (1, 'Nộp hồ sơ', 'QCUT nộp hồ sơ xin kết nạp', true, '2025-01-10', 'OK'),
      (2, 'Chi ủy kiểm tra', 'Đ/c Hồng (CU) kiểm tra lỗi hồ sơ', true, '2025-01-12', 'OK'),
      (3, 'PBT duyệt nội dung', 'Đ/c Ngân (PBT) duyệt nội dung hồ sơ', true, '2025-01-14', 'Đã duyệt'),
      (4, 'Xác minh lý lịch', 'QCUT đi xác minh lý lịch tại địa phương', false, NULL, NULL),
      (5, 'Kiểm tra dấu đỏ', 'Đ/c Ngân (PBT) kiểm tra dấu đỏ và chốt', false, NULL, NULL),
      (6, 'Soạn nghị quyết', 'Đ/c Hồng (CU) soạn Nghị quyết kết nạp', false, NULL, NULL),
      (7, 'Duyệt nghị quyết', 'Đ/c Thủy (BT) duyệt Nghị quyết', false, NULL, NULL)
  ) AS s (step, tit, des, done, cd, nt)
WHERE a.id = '22222222-2222-2222-2222-222222222202'
ON CONFLICT (admission_id, step_number) DO NOTHING;

-- Hồ sơ 3: đang bước 6 (soạn NQ)
INSERT INTO admission_progress (admission_id, step_number, title, description, is_completed, completion_date, note)
SELECT
  a.id,
  s.step,
  s.tit,
  s.des,
  s.done,
  CASE WHEN s.cd IS NOT NULL THEN s.cd::timestamptz ELSE NULL END,
  s.nt
FROM party_admissions a
  CROSS JOIN (
    VALUES
      (1, 'Nộp hồ sơ', 'QCUT nộp hồ sơ xin kết nạp', true, '2025-01-05', 'OK'),
      (2, 'Chi ủy kiểm tra', 'Đ/c Hồng (CU) kiểm tra lỗi hồ sơ', true, '2025-01-06', 'OK'),
      (3, 'PBT duyệt nội dung', 'Đ/c Ngân (PBT) duyệt nội dung hồ sơ', true, '2025-01-07', 'OK'),
      (4, 'Xác minh lý lịch', 'QCUT đi xác minh lý lịch tại địa phương', true, '2025-01-09', 'Đã xác minh'),
      (5, 'Kiểm tra dấu đỏ', 'Đ/c Ngân (PBT) kiểm tra dấu đỏ và chốt', true, '2025-01-11', 'Đã chốt'),
      (6, 'Soạn nghị quyết', 'Đ/c Hồng (CU) soạn Nghị quyết kết nạp', false, NULL, 'Đang soạn'),
      (7, 'Duyệt nghị quyết', 'Đ/c Thủy (BT) duyệt Nghị quyết', false, NULL, NULL)
  ) AS s (step, tit, des, done, cd, nt)
WHERE a.id = '22222222-2222-2222-2222-222222222203'
ON CONFLICT (admission_id, step_number) DO NOTHING;

-- Hồ sơ 4: giống hồ sơ 1 — sơ duyệt
INSERT INTO admission_progress (admission_id, step_number, title, description, is_completed, completion_date, note)
SELECT
  a.id,
  s.step,
  s.tit,
  s.des,
  s.done,
  CASE WHEN s.cd IS NOT NULL THEN s.cd::timestamptz ELSE NULL END,
  s.nt
FROM party_admissions a
  CROSS JOIN (
    VALUES
      (1, 'Nộp hồ sơ', 'QCUT nộp hồ sơ xin kết nạp', true, '2025-01-08', 'OK'),
      (2, 'Chi ủy kiểm tra', 'Đ/c Hồng (CU) kiểm tra lỗi hồ sơ', false, NULL, NULL),
      (3, 'PBT duyệt nội dung', 'Đ/c Ngân (PBT) duyệt nội dung hồ sơ', false, NULL, NULL),
      (4, 'Xác minh lý lịch', 'QCUT đi xác minh lý lịch tại địa phương', false, NULL, NULL),
      (5, 'Kiểm tra dấu đỏ', 'Đ/c Ngân (PBT) kiểm tra dấu đỏ và chốt', false, NULL, NULL),
      (6, 'Soạn nghị quyết', 'Đ/c Hồng (CU) soạn Nghị quyết kết nạp', false, NULL, NULL),
      (7, 'Duyệt nghị quyết', 'Đ/c Thủy (BT) duyệt Nghị quyết', false, NULL, NULL)
  ) AS s (step, tit, des, done, cd, nt)
WHERE a.id = '22222222-2222-2222-2222-222222222204'
ON CONFLICT (admission_id, step_number) DO NOTHING;

-- Thông báo mẫu (đọc theo receiver_role) — id cố định để chạy lại script an toàn
INSERT INTO admission_notifications (id, receiver_role, title, body, type, admission_id, is_read)
VALUES
  (
    '33333333-3333-3333-3333-333333333301',
    'chi_uy',
    'Hồ sơ mới cần sơ duyệt',
    'QCUT Nguyễn Văn B vừa nộp hồ sơ xin kết nạp.',
    'admission',
    '22222222-2222-2222-2222-222222222201',
    false
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    'pho_bi_thu',
    'Chờ duyệt nội dung hồ sơ',
    'Hồ sơ Nguyễn Văn B đã qua bước Chi ủy.',
    'admission',
    '22222222-2222-2222-2222-222222222201',
    false
  ),
  (
    '33333333-3333-3333-3333-333333333303',
    'chi_uy',
    'Cần soạn nghị quyết',
    'Hồ sơ Lê Văn D đang chờ soạn Nghị quyết kết nạp.',
    'admission',
    '22222222-2222-2222-2222-222222222203',
    false
  ),
  (
    '33333333-3333-3333-3333-333333333304',
    'qcut',
    'Nhắc: bổ sung giấy giới thiệu',
    'Hồ sơ Phạm Minh E thiếu một phần tài liệu.',
    'admission',
    '22222222-2222-2222-2222-222222222204',
    false
  )
ON CONFLICT (id) DO NOTHING;
