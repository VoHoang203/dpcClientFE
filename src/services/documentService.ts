import httpService from "@/lib/http";
import { toastServiceErrorOnce } from "@/lib/serviceErrorToast";

export interface GetDocumentsParams {
  categoryId?: string | number;
  search?: string;
  fileType?: string;
  featured?: boolean | string;
  page?: number;
  limit?: number;
}

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
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể tải danh sách tài liệu." });
      throw error;
    }
  },

  async getDocumentById(id: string | number) {
    try {
      const response = await httpService.get(`/documents/${id}`);
      return response.data;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể tải chi tiết tài liệu." });
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
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể tải lên tài liệu mới." });
      throw error;
    }
  },

  async updateDocument(id: string | number, payload: any) {
    try {
      const isFormData = payload instanceof FormData;
      const headers = isFormData
        ? { "Content-Type": "multipart/form-data" }
        : undefined;
      const response = await httpService.patch(`/documents/${id}`, payload, {
        headers,
      });
      return response.data;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể cập nhật tài liệu." });
      throw error;
    }
  },

  async deleteDocument(id: string | number) {
    try {
      const response = await httpService.delete<any>(`/documents/${id}`);
      return response.data;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể xóa tài liệu." });
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
      toastServiceErrorOnce(error, { fallbackMessage: "Không thể tải tài liệu." });
      throw error;
    }
  },
};
