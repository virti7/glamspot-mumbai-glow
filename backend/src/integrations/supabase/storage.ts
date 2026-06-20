import { getSupabaseServerClient } from "./client";
import { StorageError } from "@glamspot/shared/schemas";
import { SUPABASE_BUCKETS } from "@glamspot/shared/constants";

export async function uploadImage(
  userId: string,
  imageBase64: string,
  mediaType: string,
): Promise<{ filePath: string; signedUrl: string }> {
  const supabase = getSupabaseServerClient();

  const ext = mediaType.split("/")[1] ?? "jpeg";
  const filePath = `${userId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(imageBase64, "base64");

  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_BUCKETS.GLAM_SCANS)
    .upload(filePath, buffer, {
      contentType: mediaType,
      upsert: false,
    });

  if (uploadError) {
    throw new StorageError(`Upload failed: ${uploadError.message}`);
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(SUPABASE_BUCKETS.GLAM_SCANS)
    .createSignedUrl(filePath, 3600);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    throw new StorageError(`Failed to generate signed URL: ${signedUrlError?.message}`);
  }

  return { filePath, signedUrl: signedUrlData.signedUrl };
}

export async function getImageUrl(filePath: string): Promise<string> {
  const supabase = getSupabaseServerClient();

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(SUPABASE_BUCKETS.GLAM_SCANS)
    .createSignedUrl(filePath, 3600);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    throw new StorageError(`Failed to generate signed URL: ${signedUrlError?.message}`);
  }

  return signedUrlData.signedUrl;
}
