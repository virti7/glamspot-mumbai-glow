import { api } from "./api";
import type { ScanResult } from "@/data/glamai";

export async function uploadScanImage(imageBase64: string, mediaType: string) {
  return api.post<{ scanId: string; imageUrl: string }>("/glamai/upload", {
    imageBase64,
    mediaType,
  });
}

export async function analyzeScan(scanId: string, imageUrl: string) {
  return api.post<{ scanId: string; result: ScanResult }>("/glamai/analyze", {
    scanId,
    imageUrl,
  });
}

export async function getUserScans(limit = 10, offset = 0) {
  return api.get<{ scans: Array<{ id: string; image_url: string; analysis_json: ScanResult; created_at: string }>; total: number }>(
    `/glamai/scans?limit=${limit}&offset=${offset}`,
  );
}
