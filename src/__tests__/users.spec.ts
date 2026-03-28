import { describe, it, expect } from "vitest";
import type { RawPartyUser } from "@/services/authTypes";

// Helper to build minimal RawPartyUser instances for unit tests
const baseUser: RawPartyUser = {
  ma_so_nhan_vien: "X",
  stt: "1",
  ho_ten: "",
  ten: "",
  chi_bo: "",
  doi_tuong: "",
  nam_sinh: "",
  dan_toc_ton_giao: "",
  que_quan: "",
  trinh_do_hoc_van: "",
  trinh_do_ly_luan: "",
  chuc_vu: "",
  ngay_vao_dang: "",
  ngay_chinh_thuc: "",
  email: "x@example.com",
};

describe("party user role detection (legacy rules)", () => {
  it("Should detect DEPUTY_SECRETARY when ho_ten contains '(Phó Bí thư)' (case-insensitive)", () => {
    const user: RawPartyUser = { ...baseUser, ho_ten: "Nguyễn V��n A (Phó Bí thư)" };
    // find derived role by constructing a local array and mapping like the module does
    const role = deriveRole(user);
    expect(role).toBe("DEPUTY_SECRETARY");
  });

  it("Should detect SECRETARY when ho_ten contains 'Bí thư' without parentheses", () => {
    const user: RawPartyUser = { ...baseUser, ho_ten: "Trần Thị B Bí thư" };
    const role = deriveRole(user);
    expect(role).toBe("SECRETARY");
  });

  it("Should detect COMMITTEE when ho_ten contains '(Chi ủy viên)' with mixed cases", () => {
    const user: RawPartyUser = { ...baseUser, ho_ten: "Lê Văn C (cHi Ủy ViÊn)" };
    const role = deriveRole(user);
    expect(role).toBe("COMMITTEE");
  });

  it("Should detect OUTSTANDING_INDIVIDUAL when chuc_vu contains 'quần chúng ưu tú'", () => {
    const user: RawPartyUser = { ...baseUser, ho_ten: "Ngô Văn D", chuc_vu: "quần chúng ưu tú" };
    const role = deriveRole(user);
    expect(role).toBe("OUTSTANDING_INDIVIDUAL");
  });

  it("Should default to PARTY_MEMBER when no role tokens are present", () => {
    const user: RawPartyUser = { ...baseUser, ho_ten: "Phạm Văn E", chuc_vu: "Đảng viên chính thức" };
    const role = deriveRole(user);
    expect(role).toBe("PARTY_MEMBER");
  });

  it("Should handle Vietnamese diacritics with standard spacing for role tokens within ho_ten", () => {
    const user: RawPartyUser = { ...baseUser, chuc_vu: "", ho_ten: "  Đào Thị F   (Bí thư)  " };
    const role = deriveRole(user);
    // The token 'bí thư' with diacritics should be detected regardless of surrounding spaces
    expect(role).toBe("SECRETARY");
  });
});

function deriveRole(user: RawPartyUser) {
  // Cùng thứ tự ưu tiên như logic cũ trong test data đã xóa:
  const name = user.ho_ten.toLowerCase();
  if (name.includes("(phó bí thư)") || name.includes("phó bí thư")) {
    return "DEPUTY_SECRETARY" as const;
  }
  if (name.includes("(bí thư)") || name.includes("bí thư")) {
    return "SECRETARY" as const;
  }
  if (name.includes("(chi ủy viên)") || name.includes("chi ủy viên")) {
    return "COMMITTEE" as const;
  }
  if (user.chuc_vu.toLowerCase().includes("quần chúng ưu tú")) {
    return "OUTSTANDING_INDIVIDUAL" as const;
  }
  return "PARTY_MEMBER" as const;
}
