import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export async function uploadScanImage(
  imageBase64: string,
  mediaType: string,
): Promise<{ scanId: string; imageUrl: string }> {
  return authRequest("/glamai/upload", {
    method: "POST",
    body: JSON.stringify({ imageBase64, mediaType }),
  });
}

export async function analyzeScan(
  scanId: string,
  imageUrl: string,
): Promise<{ scanId: string; result: any }> {
  return authRequest("/glamai/analyze", {
    method: "POST",
    body: JSON.stringify({ scanId, imageUrl }),
  });
}

export async function getUserScans(
  limit = 10,
  offset = 0,
): Promise<{ scans: any[]; total: number }> {
  return authRequest(`/glamai/scans?limit=${limit}&offset=${offset}`);
}
