import { createServerFn } from "@tanstack/react-start";

export const analyzePhoto = createServerFn({ method: "POST" })
  .inputValidator((input: { imageBase64: string; mediaType?: string }) => {
    if (!input?.imageBase64 || typeof input.imageBase64 !== "string") {
      throw new Error("imageBase64 is required");
    }
    if (input.imageBase64.length > 12_000_000) {
      throw new Error("Image too large");
    }
    return {
      imageBase64: input.imageBase64,
      mediaType: input.mediaType ?? "image/jpeg",
    };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const dataUrl = `data:${data.mediaType};base64,${data.imageBase64}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are GlamAI, an expert beauty diagnosis AI for a luxury salon platform. Always respond with ONLY a valid raw JSON object — no markdown, no backticks, no commentary.",
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl } },
              {
                type: "text",
                text:
                  'Analyze the hair or skin visible in this photo. Return ONLY raw JSON of this exact shape: {"condition":string,"damage_level":1-5,"concern_type":"hair"|"skin","treatments":[string,string,string],"urgency":"routine"|"important"|"urgent","tip":string}',
              },
            ],
          },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Rate limit exceeded. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits.");
    if (!res.ok) throw new Error(`Gateway error ${res.status}`);

    const json: any = await res.json();
    const text: string = json?.choices?.[0]?.message?.content ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const m = clean.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Could not parse AI response");
      parsed = JSON.parse(m[0]);
    }
    return parsed as {
      condition: string;
      damage_level: number;
      concern_type: "hair" | "skin";
      treatments: string[];
      urgency: "routine" | "important" | "urgent";
      tip: string;
    };
  });
