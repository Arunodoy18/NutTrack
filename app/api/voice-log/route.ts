import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL } from "@/lib/openai";

const VOICE_SYSTEM_PROMPT = `You are a precise food logging parser for dietBuddy.

Extract every food item from the user's natural language description. Infer portions from context. Return USDA-based nutrition values.

PORTION CONVENTIONS:
- "a bowl of rice" = 200g cooked
- "a plate of pasta" = 250g cooked  
- "a cup of milk" = 240ml
- "a slice of bread" = 28g
- "a medium chicken breast" = 150g
- When ambiguous, use the most conservative standard serving

If no food is mentioned, return: { "error": "no_food_detected" }
Return valid JSON only.

OUTPUT FORMAT:
{
  "meal_name": "string",
  "items": [
    { "name": "string", "quantity": "string", "weight_g": number, "calories": number, "protein_g": number, "fat_g": number, "carbs_g": number, "fiber_g": number }
  ],
  "totals": { "calories": number, "protein_g": number, "fat_g": number, "carbs_g": number, "fiber_g": number },
  "assumptions": ["string"]
}`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { transcript } = await req.json();
  if (!transcript?.trim()) {
    return NextResponse.json({ error: "empty_transcript" }, { status: 400 });
  }

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      max_tokens: 1000,
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: VOICE_SYSTEM_PROMPT },
        { role: "user", content: transcript },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content ?? "{}");
    return NextResponse.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error("[voice-log] error:", err?.message);
    return NextResponse.json({ error: "ai_error", message: "Couldn't parse that. Try speaking more clearly or type it instead." }, { status: 500 });
  }
}
