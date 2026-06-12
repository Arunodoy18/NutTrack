import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL } from "@/lib/openai";

const FRIDGE_SYSTEM_PROMPT = `You are a macro-focused chef AI in dietBuddy.

The user has uploaded a photo of their fridge or pantry. 
1. Identify all visible raw ingredients.
2. Generate exactly 3 complete recipes using ONLY those ingredients.
3. Each recipe must be realistic, 30 minutes or less, and high-protein where possible.

If no identifiable ingredients are visible, return: { "error": "no_ingredients" }
Return valid JSON only.

OUTPUT FORMAT:
{
  "ingredients_found": ["string"],
  "recipes": [
    {
      "name": "string",
      "prep_time_min": number,
      "servings": number,
      "difficulty": "easy|medium|hard",
      "macros_per_serving": { "calories": number, "protein_g": number, "fat_g": number, "carbs_g": number },
      "ingredients_used": ["string"],
      "steps": ["string"]
    }
  ]
}`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { imageBase64, mimeType } = await req.json();

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: FRIDGE_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "What can I cook with what's in my fridge?" },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "high" } },
          ],
        },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content ?? "{}");
    return NextResponse.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error("[fridge-raid] error:", err?.message);
    return NextResponse.json({ error: "ai_error", message: "AI is resting. Try again in a moment." }, { status: 500 });
  }
}
