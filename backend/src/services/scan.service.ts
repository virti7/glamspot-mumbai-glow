import { uploadImage } from "../integrations/supabase/storage";
import { getUserFromRequest } from "../integrations/supabase/auth";
import { createScan } from "../repositories/scan.repository";
import { UnauthorizedError, StorageError } from "@glamspot/shared/schemas";

export async function uploadScanService(
  request: Request,
  imageBase64: string,
  mediaType: string,
): Promise<{ scanId: string; imageUrl: string }> {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new UnauthorizedError("You must be signed in to upload scans.");
  }

  const { signedUrl } = await uploadImage(user.id, imageBase64, mediaType);
  const { id: scanId } = await createScan(user.id, signedUrl);

  return { scanId, imageUrl: signedUrl };
}
