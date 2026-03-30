-- Migration: submitter user, QCUT-scoped notifications, attachments, party_member_id, xóa seed demo cũ
-- Chạy trên cùng Neon project/branch với DATABASE_URL.

ALTER TABLE party_admissions
  ADD COLUMN IF NOT EXISTS submitter_user_id TEXT,
  ADD COLUMN IF NOT EXISTS party_member_id TEXT;

CREATE INDEX IF NOT EXISTS idx_party_admissions_submitter ON party_admissions (submitter_user_id);

ALTER TABLE admission_notifications
  ADD COLUMN IF NOT EXISTS receiver_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_admission_notif_role_user ON admission_notifications (receiver_role, receiver_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS admission_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID NOT NULL REFERENCES party_admissions (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  file_name TEXT,
  file_url TEXT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admission_attachments_admission ON admission_attachments (admission_id);

-- Xóa dữ liệu mẫu cũ (UUID cố định từ 006)
DELETE FROM admission_notifications
WHERE id IN (
  '33333333-3333-3333-3333-333333333301',
  '33333333-3333-3333-3333-333333333302',
  '33333333-3333-3333-3333-333333333303',
  '33333333-3333-3333-3333-333333333304'
);

DELETE FROM admission_progress
WHERE admission_id IN (
  '22222222-2222-2222-2222-222222222201',
  '22222222-2222-2222-2222-222222222202',
  '22222222-2222-2222-2222-222222222203',
  '22222222-2222-2222-2222-222222222204'
);

DELETE FROM party_admissions
WHERE id IN (
  '22222222-2222-2222-2222-222222222201',
  '22222222-2222-2222-2222-222222222202',
  '22222222-2222-2222-2222-222222222203',
  '22222222-2222-2222-2222-222222222204'
);
