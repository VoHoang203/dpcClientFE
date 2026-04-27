export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  attachments?: Array<{ name: string; filePath?: string; url?: string }>;
}

export type ChatThread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};