import httpService from "@/lib/http";
import { toast } from "@/components/ui/sonner";

export const fileService = {
  async uploadFile(file: File) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await httpService.post<any>("/file/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      return response.data;
    } catch (error: any) {
      console.error("Upload error:", error);
      throw error;
    }
  },
};
