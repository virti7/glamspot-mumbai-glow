import { analyzeHairOrSkin } from "../integrations/anthropic/client";
import { updateScanAnalysis } from "../repositories/scan.repository";
import type { ScanResult } from "@glamspot/shared/schemas";

export async function analyzeScanService(
  scanId: string,
  imageUrl: string,
): Promise<{ scanId: string; result: ScanResult }> {
  const result = await analyzeHairOrSkin(imageUrl);
  await updateScanAnalysis(scanId, result as unknown as Record<string, unknown>);

  return { scanId, result };
}
