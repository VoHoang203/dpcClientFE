import axios from "axios";
import { toast } from "@/components/ui/sonner";

type ToastableError = {
  __toastShown?: boolean;
};

function readStatusCodeAndMessageFromAxiosError(err: unknown): {
  statusCode: number | null;
  message: string;
} {
  const fallbackMessage = "Có lỗi xảy ra. Vui lòng thử lại.";

  if (!axios.isAxiosError(err)) {
    if (err instanceof Error && err.message) {
      return { statusCode: null, message: err.message };
    }
    return { statusCode: null, message: fallbackMessage };
  }

  const statusFromHttp =
    typeof err.response?.status === "number" ? err.response.status : null;
  const data = err.response?.data as unknown;
  const anyData =
    data && typeof data === "object" ? (data as Record<string, unknown>) : null;

  const statusCode =
    (typeof anyData?.statusCode === "number" ? (anyData.statusCode as number) : null) ??
    statusFromHttp;

  const rawMessage = anyData?.message;
  const message =
    typeof rawMessage === "string"
      ? rawMessage
      : Array.isArray(rawMessage)
        ? rawMessage.filter((x) => typeof x === "string").join(", ") || fallbackMessage
        : typeof err.message === "string" && err.message
          ? err.message
          : fallbackMessage;

  return { statusCode, message };
}

export function toastServiceErrorOnce(
  error: unknown,
  opts?: { fallbackMessage?: string; overrideStatusCode?: number | null }
): void {
  if (typeof window === "undefined") return;

  const e = (error && typeof error === "object" ? (error as ToastableError) : null) ?? null;
  if (e?.__toastShown) return;
  if (e) e.__toastShown = true;

  const parsed = readStatusCodeAndMessageFromAxiosError(error);
  const message =
    (parsed.message && parsed.message.trim()) ||
    (opts?.fallbackMessage?.trim() ?? "") ||
    "Có lỗi xảy ra. Vui lòng thử lại.";

  const statusCode =
    typeof opts?.overrideStatusCode === "number"
      ? opts.overrideStatusCode
      : parsed.statusCode;

  toast.error(message, {
    description: statusCode ? `Status: ${statusCode}` : undefined,
  });
}

