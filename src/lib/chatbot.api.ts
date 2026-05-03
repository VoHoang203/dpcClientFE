import axios from "axios";
import httpService from "./http";

export type AskChatbotBody = {
  query: string;
  conversationId?: string;
};

const ASK_API_URL = process.env.NEXT_PUBLIC_ASK_API_URL;

if (!ASK_API_URL) {
  throw new Error("NEXT_PUBLIC_ASK_API_URL is not configured");
}

const askHttp = axios.create({
  baseURL: ASK_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

askHttp.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

const extractApiPayload = <T>(result: any): T => {
  return (result?.data?.data ?? result?.data ?? result ?? {}) as T;
};

export const chatbotApi = {
  async ask<T = unknown>(body: AskChatbotBody): Promise<T> {
    const response = await askHttp.post("/chatbot/ask", body);
    return extractApiPayload<T>(response);
  },

  async getConversations<T = unknown>(): Promise<T> {
    const response = await httpService.get("/chatbot/conversations");
    return extractApiPayload<T>(response);
  },

  async getConversationMessages<T = unknown>(
    conversationId: string,
  ): Promise<T> {
    const response = await httpService.get(
      `/chatbot/messages/${conversationId}`,
    );
    return extractApiPayload<T>(response);
  },

  async deleteConversation<T = unknown>(
    conversationId: string,
  ): Promise<T> {
    const response = await httpService.delete(
      `/chatbot/conversations/${conversationId}`,
    );
    return extractApiPayload<T>(response);
  },

  async renameConversation<T = unknown>(
    conversationId: string,
    title: string,
  ): Promise<T> {
    const response = await httpService.patch(
      `/chatbot/conversations/${conversationId}/title`,
      { title },
    );
    return extractApiPayload<T>(response);
  },
};