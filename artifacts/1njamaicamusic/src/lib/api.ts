const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export interface ApiErrorResponse {
  error?: string;
  message?: string;
}

async function parseResponse(response: Response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = (data && (data.error || data.message || JSON.stringify(data))) || response.statusText;
    const error = new Error(message);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }
  return data;
}

function getAuthToken() {
  return typeof window !== "undefined" ? localStorage.getItem("1jm_token") : null;
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers ?? {});

  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  if (options.body != null && !(options.body instanceof FormData) && typeof options.body !== "string") {
    headers.set("content-type", "application/json");
    options.body = JSON.stringify(options.body);
  }

  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const response = await fetch(path.startsWith("http") ? path : `${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  return parseResponse(response) as Promise<T>;
}

export const apiGet = <T = unknown>(path: string) => apiFetch<T>(path, { method: "GET" });
export const apiPost = <T = unknown>(path: string, body: unknown) => apiFetch<T>(path, { method: "POST", body });
export const apiPut = <T = unknown>(path: string, body: unknown) => apiFetch<T>(path, { method: "PUT", body });
export const apiDelete = <T = unknown>(path: string) => apiFetch<T>(path, { method: "DELETE" });
