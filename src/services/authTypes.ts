/**
 * Cấu trúc bản ghi đảng viên (legacy / import) — dùng chung cho test data, không gắn với authService runtime.
 */
export interface RawPartyUser {
  ma_so_nhan_vien: string;
  stt: string;
  ho_ten: string;
  ten: string;
  chi_bo: string;
  doi_tuong: string;
  nam_sinh: string;
  dan_toc_ton_giao: string;
  que_quan: string;
  trinh_do_hoc_van: string;
  trinh_do_ly_luan: string;
  chuc_vu: string;
  ngay_vao_dang: string;
  ngay_chinh_thuc: string;
  email: string;
}
