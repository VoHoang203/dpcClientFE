import httpService from "@/lib/http";
import { toast } from "@/components/ui/sonner";

export interface CreateCategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
}

const extractResponseMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null) {
    const anyError = error as {
      response?: { status?: number; data?: { message?: string } };
      __toastShown?: boolean;
    };
    if ((anyError.response?.status ?? 0) >= 400) {
      return anyError.response?.data?.message || fallback;
    }
  }
  return fallback;
};

const toastOnce = (error: unknown, message: string) => {
  if (typeof error === "object" && error !== null) {
    const anyError = error as { __toastShown?: boolean };
    if (anyError.__toastShown) return;
    anyError.__toastShown = true;
  }
  toast.error(message);
};

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
      const message = extractResponseMessage(
        error,
        "Không thể tải danh sách danh mục."
      );
      toastOnce(error, message);
      throw error;
    }
  },

  async getCategoryById(id: string | number) {
    try {
      const response = await httpService.get<any>(`/document-categories/${id}`);
      return response.data?.data ?? response.data;
    } catch (error: unknown) {
      const message = extractResponseMessage(
        error,
        "Không thể tải chi tiết danh mục."
      );
      toastOnce(error, message);
      throw error;
    }
  },

  async createCategory(payload: CreateCategoryPayload) {
    try {
      const response = await httpService.post<any>("/document-categories", payload);
      return response.data?.data ?? response.data;
    } catch (error: unknown) {
      const message = extractResponseMessage(error, "Không thể tạo danh mục.");
      toastOnce(error, message);
      throw error;
    }
  },

  async updateCategory(id: string | number, payload: CreateCategoryPayload) {
    try {
      const response = await httpService.put<any>(`/document-categories/${id}`, payload);
      return response.data?.data ?? response.data;
    } catch (error: unknown) {
      const message = extractResponseMessage(
        error,
        "Không thể cập nhật danh mục."
      );
      toastOnce(error, message);
      throw error;
    }
  },

  async deleteCategory(id: string | number) {
    try {
      const response = await httpService.delete<any>(`/document-categories/${id}`);
      return response.data;
    } catch (error: unknown) {
      const message = extractResponseMessage(error, "Không thể xóa danh mục.");
      toastOnce(error, message);
      throw error;
    }
  },
};
