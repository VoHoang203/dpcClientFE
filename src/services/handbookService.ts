import httpService from "@/lib/http";
import { toastServiceErrorOnce } from "@/lib/serviceErrorToast";

export interface GetHandbooksParams {
  categoryId?: string | number;
  search?: string;
  isPinned?: boolean | string;
  page?: number;
  limit?: number;
}

export const handbookService = {
  // Lấy danh sách bài viết (Chỉ lấy bài PUBLISHED cho client)
  async getHandbooks(params?: GetHandbooksParams) {
    try {
      const response = await httpService.get<any>("/handbooks", { params });
      const items =
        response.data?.data?.items ??
        response.data?.items ??
        response.data?.data ??
        response.data ??
        [];
      return items;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể tải danh sách bài viết." });
      throw error;
    }
  },

  // Xem chi tiết 1 bài viết theo Slug (+1 Lượt xem)
  async getHandbookBySlug(slug: string) {
    try {
      const response = await httpService.get<any>(`/handbooks/${slug}`);
      return response.data?.data ?? response.data;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể tải chi tiết bài viết." });
      throw error;
    }
  },

  // Lấy tối đa 3 bài viết cùng chuyên mục
  async getRelatedHandbooks(slug: string) {
    try {
      const response = await httpService.get<any>(`/handbooks/${slug}/related`);
      const items =
        response.data?.data?.items ??
        response.data?.items ??
        response.data?.data ??
        response.data ??
        [];
      return items;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể tải bài viết liên quan." });
      throw error;
    }
  },

  // Lấy danh sách chuyên mục (Dành cho UI Lọc)
  async getHandbookCategories() {
    try {
      const response = await httpService.get<any>("/handbooks/categories");
      const items =
        response.data?.data?.items ??
        response.data?.items ??
        response.data?.data ??
        response.data ??
        [];
      return items;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể tải danh sách chuyên mục." });
      throw error;
    }
  },

  // ===== ADMIN / CMS METHODS =====
  async getAdminHandbooks(params?: GetHandbooksParams) {
    try {
      const response = await httpService.get<any>("/handbooks/admin/list", { params });
      return response.data?.data?.items ?? response.data?.items ?? response.data?.data ?? response.data ?? [];
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể tải danh sách bài viết (Admin)." });
      throw error;  
    }
  },

  async createHandbook(payload: FormData | Record<string, any>) {
    try {
      const isFormData = payload instanceof FormData;
      const response = await httpService.post<any>("/handbooks", payload, {
        headers: isFormData ? { "Content-Type": "multipart/form-data" } : { "Content-Type": "application/json" },
      });
      return response.data;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể tạo bài viết mới." });
      throw error;
    }
  },

  async updateHandbook(id: string | number, payload: FormData | Record<string, any>) {
    try {
      const isFormData = payload instanceof FormData;
      const response = await httpService.patch<any>(`/handbooks/${id}`, payload, {
        headers: isFormData ? { "Content-Type": "multipart/form-data" } : { "Content-Type": "application/json" },
      });
      return response.data;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể cập nhật bài viết." });
      throw error;
    }
  },

  async deleteHandbook(id: string | number) {
    try {
      const response = await httpService.delete<any>(`/handbooks/${id}`);
      return response.data;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể xóa bài viết." });
      throw error;
    }
  },

  async createHandbookCategory(data: { name: string; description?: string; icon?: string }) {
    try {
      const response = await httpService.post<any>("/handbooks/categories", data);
      return response.data;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể tạo chuyên mục." });
      throw error;
    }
  },

  async updateHandbookCategory(id: string | number, data: { name?: string; description?: string; icon?: string }) {
    try {
      const response = await httpService.patch<any>(`/handbooks/categories/${id}`, data);
      return response.data;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể cập nhật chuyên mục." });
      throw error;
    }
  },

  async deleteHandbookCategory(id: string | number) {
    try {
      const response = await httpService.delete<any>(`/handbooks/categories/${id}`);
      return response.data;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể xóa chuyên mục." });
      throw error;
    }
  },
};
