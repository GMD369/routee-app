import { API_BASE_URL } from "./config";

let authToken: string | null = null;
let authExpiredHandler: (() => void | Promise<void>) | null = null;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  method: HttpMethod;
  body?: unknown;
  timeoutMs?: number;
};

export class HttpError extends Error {
  status?: number;
  data?: unknown;
  isNetworkError: boolean;

  constructor(
    message: string,
    options?: { status?: number; data?: unknown; isNetworkError?: boolean },
  ) {
    super(message);
    this.name = "HttpError";
    this.status = options?.status;
    this.data = options?.data;
    this.isNetworkError = options?.isNetworkError ?? false;
  }
}

async function parseResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : null;
}

function formatErrorDetail(data: unknown, status: number) {
  if (typeof data === "string") {
    return data;
  }

  if (Array.isArray(data)) {
    const messages = data
      .map((item) => {
        if (!item || typeof item !== "object") return null;

        const detailItem = item as {
          loc?: unknown;
          msg?: unknown;
        };

        const location = Array.isArray(detailItem.loc)
          ? detailItem.loc.join(".")
          : null;
        const message =
          typeof detailItem.msg === "string" ? detailItem.msg : null;

        if (location && message) {
          return `${location}: ${message}`;
        }

        return message;
      })
      .filter((message): message is string => Boolean(message));

    if (messages.length > 0) {
      return messages.join("; ");
    }
  }

  if (typeof data === "object" && data && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return formatErrorDetail(detail, status);
    }
  }

  return `Request failed with status ${status}`;
}

async function request<T>(path: string, options: RequestOptions) {
  const timeoutMs = options.timeoutMs ?? 20000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "1",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const data = await parseResponseBody(response);

    if (!response.ok) {
      if (
        authToken &&
        (response.status === 401 || response.status === 403) &&
        authExpiredHandler
      ) {
        void authExpiredHandler();
      }

      const message = formatErrorDetail(data, response.status);

      throw new HttpError(message, { status: response.status, data });
    }

    return {
      data: data as T,
      status: response.status,
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;

    const isNetworkError =
      error instanceof TypeError ||
      (error instanceof Error && error.name === "AbortError");

    throw new HttpError(
      isNetworkError ? "Network request failed" : "Unexpected request error",
      { isNetworkError },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const http = {
  get<T>(path: string) {
    return request<T>(path, { method: "GET" });
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, { method: "POST", body });
  },
  put<T>(path: string, body?: unknown) {
    return request<T>(path, { method: "PUT", body });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, { method: "PATCH", body });
  },
  delete<T>(path: string) {
    return request<T>(path, { method: "DELETE" });
  },
};

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setAuthExpiredHandler(
  handler: (() => void | Promise<void>) | null,
) {
  authExpiredHandler = handler;
}
