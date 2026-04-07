import httpService from "@/lib/http";
import { toast } from "@/components/ui/sonner";

export interface GetDocumentsParams {
  categoryId?: string | number;
  search?: string;
  fileType?: string;
  featured?: boolean | string;
  page?: number;
  limit?: number;
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

export const documentService = {
  async getDocuments(params?: GetDocumentsParams) {
    try {
      const response = await httpService.get<any>("/documents", { params });
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
        "Không thể tải danh sách tài liệu."
      );
      toastOnce(error, message);
      throw error;
    }
  },

  async getDocumentById(id: string | number) {
    try {
      const response = await httpService.get(`/documents/${id}`);
      return response.data;
    } catch (error: unknown) {
      const message = extractResponseMessage(
        error,
        "Không thể tải chi tiết tài liệu."
      );
      toastOnce(error, message);
      throw error;
    }
  },

  async createDocument(data: FormData) {
    try {
      const response = await httpService.post("/documents", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error: unknown) {
      const message = extractResponseMessage(
        error,
        "Không thể tải lên tài liệu mới."
      );
      toastOnce(error, message);
      throw error;
    }
  },

  async updateDocument(id: string | number, payload: any) {
    try {
      const isFormData = payload instanceof FormData;
      const headers = isFormData
        ? { "Content-Type": "multipart/form-data" }
        : undefined;
      const response = await httpService.put(`/documents/${id}`, payload, {
        headers,
      });
      return response.data;
    } catch (error: unknown) {
      const message = extractResponseMessage(
        error,
        "Không thể cập nhật tài liệu."
      );
      toastOnce(error, message);
      throw error;
    }
  },

  async deleteDocument(id: string | number) {
    try {
      const response = await httpService.delete<any>(`/documents/${id}`);
      return response.data;
    } catch (error: unknown) {
      const message = extractResponseMessage(error, "Không thể xóa tài liệu.");
      toastOnce(error, message);
      throw error;
    }
  },

  async downloadDocument(id: string | number) {
    try {
      const response = await httpService.get<Blob>(`/documents/${id}/download`, {
        responseType: "blob",
      });
      return response.data;
    } catch (error: unknown) {
      const message = extractResponseMessage(error, "Không thể tải tài liệu.");
      toastOnce(error, message);
      throw error;
    }
  },
};
