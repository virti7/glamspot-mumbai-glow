import { getSupabaseServerClient } from "../integrations/supabase/client";
import { AppError } from "@glamspot/shared/schemas";

export interface ScanRecord {
  id: string;
  user_id: string;
  image_url: string;
  analysis_json: Record<string, unknown>;
  created_at: string;
}

export async function createScan(
  userId: string,
  imageUrl: string,
): Promise<{ id: string }> {
  const supabase = getSupabaseServerClient();

  const { data: scanRow, error: insertError } = await supabase
    .from("glam_scans")
    .insert({
      user_id: userId,
      image_url: imageUrl,
      analysis_json: {},
    })
    .select("id")
    .single();

  if (insertError || !scanRow) {
    throw new AppError(`Failed to create scan record: ${insertError?.message}`, "DB_ERROR", 500);
  }

  return { id: scanRow.id as string };
}

export async function updateScanAnalysis(
  scanId: string,
  analysisJson: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error: updateError } = await supabase
    .from("glam_scans")
    .update({ analysis_json: analysisJson })
    .eq("id", scanId);

  if (updateError) {
    console.error("Failed to save analysis:", updateError);
  }
}

export async function getUserScans(
  userId: string,
  offset: number,
  limit: number,
): Promise<{ scans: ScanRecord[]; total: number }> {
  const supabase = getSupabaseServerClient();

  const { count } = await supabase
    .from("glam_scans")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const { data: scans, error } = await supabase
    .from("glam_scans")
    .select("id, image_url, analysis_json, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new AppError(`Failed to fetch scans: ${error.message}`, "DB_ERROR", 500);
  }

  return {
    scans: (scans ?? []).map((s) => ({
      id: s.id,
      user_id: userId,
      image_url: s.image_url,
      analysis_json: s.analysis_json,
      created_at: s.created_at,
    })),
    total: count ?? 0,
  };
}
