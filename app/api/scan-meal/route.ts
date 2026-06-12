import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL } from "@/lib/openai";
import { checkScanRateLimit } from "@/lib/rateLimit";

const SCAN_SYSTEM_PROMPT = `You are a precision nutrition AI embedded in dietBuddy.

The user has uploaded a photo of their meal. Identify every distinct food item visible, estimate portion weight in grams, and return structured nutritional data using USDA values.

RULES:
- Only identify food items visible with reasonable confidence.
- If not a food photo, return: { "error": "not_food" }
- Never hallucinate nutrition values.
- Weights are conservative estimates.
- Return valid JSON only. No markdown, no preamble.

OUTPUT FORMAT:
{
  "meal_name": "string",
  "confidence": 0.0-1.0,
  "items": [
    {
      "name": "string",
      "weight_g": number,
      "calories": number,
      "protein_g": number,
      "fat_g": number,
      "carbs_g": number,
      "fiber_g": number
    }
  ],
  "totals": { "calories": number, "protein_g": number, "fat_g": number, "carbs_g": number, "fiber_g": number },
  "notes": "string | null"
}`;

export async function POST(req: NextRequest) {
  // 1. Auth
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Rate limit
  const { allowed, remaining } = await checkScanRateLimit(
    session.user.id,
    session.user.isPremium
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limit", message: "You've used your 5 free scans today. Upgrade for unlimited." },
      { status: 429 }
    );
  }

  // 3. Parse body
  const { imageBase64, mimeType } = await req.json();
  if (!imageBase64 || !mimeType) {
    return NextResponse.json({ error: "missing_image" }, { status: 400 });
  }

  // 4. Validate mime type server-side
  const allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed_types.includes(mimeType)) {
    return NextResponse.json({ error: "invalid_mime" }, { status: 400 });
  }

  // 5. Call OpenAI gpt-4o with vision
  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SCAN_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this meal photo and return the nutrition data." },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const raw = response.choices[0].message.content ?? "";
    const parsed = JSON.parse(raw);

    if (parsed.error === "not_food") {
      return NextResponse.json({
        error: "not_food",
        message: "Doesn't look like a meal. Try a photo of your plate.",
      });
    }

    return NextResponse.json({ success: true, data: parsed, remaining });
  } catch (err: any) {
    console.error("[scan-meal] OpenAI error:", err?.message);
    return NextResponse.json(
      { error: "ai_error", message: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
