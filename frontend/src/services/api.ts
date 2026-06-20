const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
