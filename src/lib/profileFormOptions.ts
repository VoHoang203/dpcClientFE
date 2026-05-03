/** Dùng chung cho `/complete-profile` và chỉnh sửa `/profile`. */

export const DEFAULT_PARTY_CELL_ID =
  "4dc9d414-0e5d-47dc-828a-e0a249b2b888";

export const targetGroupOptions = [
  {
    value: "CBGV FPTU",
    label: "CBGV FPTU (Cán bộ giảng viên Đại học FPT)",
  },
  { value: "Cán bộ quản lý", label: "Cán bộ quản lý" },
  { value: "Nhân viên hành chính", label: "Nhân viên hành chính" },
  { value: "Sinh viên/Học viên", label: "Sinh viên/Học viên" },
] as const;

export const academicLevelOptions = [
  "Tiến sĩ khoa học",
  "Tiến sĩ",
  "Thạc sĩ",
  "Đại học",
  "Cao đẳng",
  "THPT",
] as const;

export const politicalTheoryLevelOptions = [
  "Cử nhân (Dành cho người tốt nghiệp chuyên ngành chính trị hoặc tương đương)",
  "Cao cấp",
  "Trung cấp",
  "Sơ cấp",
  "Chưa qua đào tạo",
] as const;

export const memberStatusOptions = [
  { value: "MASSES", label: "Quần chúng (MASSES)" },
  { value: "OFFICIAL", label: "Đảng viên chính thức" },
  { value: "PROBATION", label: "Đảng viên dự bị" },
] as const;

/** Mã chức vụ gửi BE (không dùng UUID). */
export const positionCodeOptions = [
  { value: "__none__", label: "— Chưa có —" },
  { value: "PARTY_MEMBER", label: "Đảng viên" },
  { value: "MEMBER", label: "Đảng viên (MEMBER)" },
  { value: "COMMITTEE_MEMBER", label: "Chi ủy viên" },
  { value: "DEPUTY_SECRETARY", label: "Phó Bí thư" },
  { value: "SECRETARY", label: "Bí thư" },
] as const;

/** `roleCode` từ BE — quyền trong chi bộ. */
export const roleCodeOptions = [
  { value: "PARTY_MEMBER", label: "Đảng viên (PARTY_MEMBER)" },
  { value: "COMMITTEE_MEMBER", label: "Chi ủy viên (COMMITTEE_MEMBER)" },
  { value: "DEPUTY_SECRETARY", label: "Phó Bí thư (DEPUTY_SECRETARY)" },
  { value: "SECRETARY", label: "Bí thư (SECRETARY)" },
] as const;
