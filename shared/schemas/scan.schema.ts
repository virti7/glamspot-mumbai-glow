import { z } from "zod";

// ── Scan Image Upload ────────────────────────────────────────────────

export const uploadScanImageInput = z.object({
  imageBase64: z.string().min(1, "imageBase64 is required").max(12_000_000, "Image too large"),
  mediaType: z.string().default("image/jpeg"),
});

export type UploadScanImageInput = z.infer<typeof uploadScanImageInput>;

export const uploadScanImageOutput = z.object({
  scanId: z.string().uuid(),
  imageUrl: z.string().url(),
});

export type UploadScanImageOutput = z.infer<typeof uploadScanImageOutput>;

// ── Analyze Scan ─────────────────────────────────────────────────────

export const analyzeScanInput = z.object({
  scanId: z.string().uuid(),
  imageUrl: z.string().url(),
});

export type AnalyzeScanInput = z.infer<typeof analyzeScanInput>;

export const scanResultSchema = z.object({
  condition: z.string(),
  damage_level: z.number().min(1).max(5),
  concern_type: z.enum(["hair", "skin"]),
  treatments: z.array(z.string()).min(1),
  urgency: z.enum(["routine", "important", "urgent"]),
  tip: z.string(),
});

export type ScanResult = z.infer<typeof scanResultSchema>;

export const analyzeScanOutput = z.object({
  scanId: z.string().uuid(),
  result: scanResultSchema,
});

export type AnalyzeScanOutput = z.infer<typeof analyzeScanOutput>;

// ── Get User Scans ───────────────────────────────────────────────────

export const getUserScansInput = z.object({
  limit: z.number().min(1).max(50).default(10),
  offset: z.number().min(0).default(0),
});

export type GetUserScansInput = z.infer<typeof getUserScansInput>;

export const scanRecordSchema = z.object({
  id: z.string().uuid(),
  image_url: z.string(),
  analysis_json: scanResultSchema,
  created_at: z.string(),
});

export type ScanRecord = z.infer<typeof scanRecordSchema>;

export const getUserScansOutput = z.object({
  scans: z.array(scanRecordSchema),
  total: z.number(),
});

export type GetUserScansOutput = z.infer<typeof getUserScansOutput>;

// ── Error helpers ────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class MissingConfigError extends AppError {
  constructor(missing: string) {
    super(`${missing} is not configured`, "MISSING_CONFIG", 500);
  }
}

export class StorageError extends AppError {
  constructor(message: string) {
    super(message, "STORAGE_ERROR", 500);
  }
}

export class AIError extends AppError {
  constructor(message: string) {
    super(message, "AI_ERROR", 502);
  }
}
