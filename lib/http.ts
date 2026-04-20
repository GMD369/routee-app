import { API_BASE_URL } from "./config";

let authToken: string | null = null;

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

async function request<T>(path: string, options: RequestOptions) {
  const timeoutMs = options.timeoutMs ?? 20000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const data = await parseResponseBody(response);

    if (!response.ok) {
      const message =
        typeof data === "object" &&
        data &&
        "detail" in data &&
        typeof (data as { detail?: unknown }).detail === "string"
          ? (data as { detail: string }).detail
          : `Request failed with status ${response.status}`;

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
  post<T>(path: string, body?: unknown) {
    return request<T>(path, { method: "POST", body });
  },
};

export function setAuthToken(token: string | null) {
  authToken = token;
}
