import httpService from "@/lib/http";
import { toastServiceErrorOnce } from "@/lib/serviceErrorToast";

export interface CreateCategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
}

export const documentCategoryService = {
  async getCategories() {
    try {
      const response = await httpService.get<any>("/document-categories");
      const items =
        response.data?.data?.items ??
        response.data?.items ??
        response.data?.data ??
        response.data ??
        [];
      return items;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể tải danh sách danh mục." });
      throw error;
    }
  },

  async getCategoryById(id: string | number) {
    try {
      const response = await httpService.get<any>(`/document-categories/${id}`);
      return response.data?.data ?? response.data;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể tải chi tiết danh mục." });
      throw error;
    }
  },

  async createCategory(payload: CreateCategoryPayload) {
    try {
      const response = await httpService.post<any>("/document-categories", payload);
      return response.data?.data ?? response.data;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể tạo danh mục." });
      throw error;
    }
  },

  async updateCategory(id: string | number, payload: CreateCategoryPayload) {
    try {
      const response = await httpService.patch<any>(`/document-categories/${id}`, payload);
      return response.data?.data ?? response.data;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể cập nhật danh mục." });
      throw error;
    }
  },

  async deleteCategory(id: string | number) {
    try {
      const response = await httpService.delete<any>(`/document-categories/${id}`);
      return response.data;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể xóa danh mục." });
      throw error;
    }
  },
};
