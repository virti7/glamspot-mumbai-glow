import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabaseServerClient } from "../../backend/lib/supabase.server";
import {
  uploadScanImageInput,
  analyzeScanInput,
  getUserScansInput,
  scanResultSchema,
  UnauthorizedError,
  MissingConfigError,
  StorageError,
  AIError,
  AppError,
} from "../../backend/lib/schemas";

// ─────────────────────────────────────────────────────────────────────
// 1. uploadScanImage — stores the image in Supabase Storage,
//    creates a glam_scans row, and returns the scan ID + signed URL.
// ─────────────────────────────────────────────────────────────────────

export const uploadScanImage = createServerFn({ method: "POST" })
  .validator(uploadScanImageInput)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();

    // Get authenticated user from Supabase Auth
    const userResult = await supabase.auth.getUser();
    const userId = userResult.data.user?.id;

    if (!userId) {
      throw new UnauthorizedError("You must be signed in to upload scans.");
    }

    // Generate a unique file path
    const ext = data.mediaType.split("/")[1] ?? "jpeg";
    const filePath = `${userId}/${Date.now()}.${ext}`;

    // Decode base64 and upload
    const buffer = Buffer.from(data.imageBase64, "base64");

    const { error: uploadError } = await supabase.storage
      .from("glam-scans")
      .upload(filePath, buffer, {
        contentType: data.mediaType,
        upsert: false,
      });

    if (uploadError) {
      throw new StorageError(`Upload failed: ${uploadError.message}`);
    }

    // Get a signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("glam-scans")
      .createSignedUrl(filePath, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new StorageError(`Failed to generate signed URL: ${signedUrlError?.message}`);
    }

    const imageUrl = signedUrlData.signedUrl;

    // Create the glam_scans row (analysis_json will be updated after AI analysis)
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

    return {
      scanId: scanRow.id as string,
      imageUrl,
    };
  });

// ─────────────────────────────────────────────────────────────────────
// 2. analyzeScan — sends the image to Anthropic Claude,
//    stores the structured result, and returns it.
// ─────────────────────────────────────────────────────────────────────

export const analyzeScan = createServerFn({ method: "POST" })
  .validator(analyzeScanInput)
  .handler(async ({ data }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new MissingConfigError("ANTHROPIC_API_KEY");
    }

    // Fetch the image and convert to base64 for Anthropic's vision API
    const imageResponse = await fetch(data.imageUrl);
    if (!imageResponse.ok) {
      throw new AIError(`Failed to fetch image for analysis: ${imageResponse.status}`);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const imageBase64 = imageBuffer.toString("base64");
    const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";

    // Call Anthropic Claude with vision
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: contentType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: `You are GlamAI, an expert beauty diagnosis AI for a luxury salon platform in Mumbai.

Analyze the hair or skin visible in this photo. Return ONLY a valid raw JSON object with this exact shape — no markdown, no backticks, no commentary:

{
  "condition": "Brief description of what you observe",
  "damage_level": 1-5 (1=healthy, 5=severe damage),
  "concern_type": "hair" or "skin",
  "treatments": ["Treatment 1", "Treatment 2", "Treatment 3"],
  "urgency": "routine" or "important" or "urgent",
  "tip": "Personalized care tip"
}

Be specific about treatments available at premium salons in Mumbai. Be empathetic and professional.`,
              },
            ],
          },
        ],
      }),
    });

    if (aiResponse.status === 429) {
      throw new AIError("Rate limit exceeded. Please try again shortly.");
    }
    if (aiResponse.status === 401) {
      throw new MissingConfigError("ANTHROPIC_API_KEY (invalid key)");
    }
    if (!aiResponse.ok) {
      const body = await aiResponse.text().catch(() => "");
      throw new AIError(`Anthropic API error ${aiResponse.status}: ${body.slice(0, 200)}`);
    }

    const json = await aiResponse.json();
    const text: string = json?.content?.[0]?.text ?? "";

    // Parse the JSON response — strip markdown fences if present
    const clean = text.replace(/```json|```/g, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const m = clean.match(/\{[\s\S]*\}/);
      if (!m) throw new AIError("Could not parse AI response as JSON");
      parsed = JSON.parse(m[0]);
    }

    // Validate with Zod
    const result = scanResultSchema.parse(parsed);

    // Store the analysis in the database
    const supabase = getSupabaseServerClient();

    const { error: updateError } = await supabase
      .from("glam_scans")
      .update({ analysis_json: result })
      .eq("id", data.scanId);

    if (updateError) {
      console.error("Failed to save analysis:", updateError);
      // Non-fatal — we still return the result to the user
    }

    return {
      scanId: data.scanId,
      result,
    };
  });

// ─────────────────────────────────────────────────────────────────────
// 3. getUserScans — returns paginated scan history for the user.
// ─────────────────────────────────────────────────────────────────────

export const getUserScans = createServerFn({ method: "GET" })
  .validator(getUserScansInput)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();

    const userResult = await supabase.auth.getUser();
    const userId = userResult.data.user?.id;

    if (!userId) {
      throw new UnauthorizedError("You must be signed in to view scans.");
    }

    // Get total count
    const { count } = await supabase
      .from("glam_scans")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // Get paginated results
    const { data: scans, error } = await supabase
      .from("glam_scans")
      .select("id, image_url, analysis_json, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (error) {
      throw new AppError(`Failed to fetch scans: ${error.message}`, "DB_ERROR", 500);
    }

    return {
      scans: (scans ?? []).map((s) => ({
        id: s.id,
        image_url: s.image_url,
        analysis_json: s.analysis_json,
        created_at: s.created_at,
      })),
      total: count ?? 0,
    };
  });
