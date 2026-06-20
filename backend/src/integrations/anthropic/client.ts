import { config } from "../../config/env";
import { AIError, MissingConfigError } from "@glamspot/shared/schemas";
import { ANTHROPIC_MODELS } from "@glamspot/shared/constants";
import type { ScanResult } from "@glamspot/shared/schemas";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export async function analyzeHairOrSkin(imageUrl: string): Promise<ScanResult> {
  if (!config.anthropic.apiKey) {
    throw new MissingConfigError("ANTHROPIC_API_KEY");
  }

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new AIError(`Failed to fetch image for analysis: ${imageResponse.status}`);
  }

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const imageBase64 = imageBuffer.toString("base64");
  const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";

  const aiResponse = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropic.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODELS.VISION,
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

  const clean = text.replace(/```json|```/g, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch {
    const m = clean.match(/\{[\s\S]*\}/);
    if (!m) throw new AIError("Could not parse AI response as JSON");
    parsed = JSON.parse(m[0]);
  }

  return parsed as ScanResult;
}
