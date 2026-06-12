import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL } from "@/lib/openai";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { goals, today } = await req.json();

  const prompt = `You are a concise, encouraging nutrition coach in dietBuddy.
  
Given the user's nutrition data, write ONE insight in 2-3 sentences.
Be specific — reference their actual numbers. Sound like a knowledgeable friend.
Never be preachy. Never give generic advice. Plain text only, no markdown.

User goals: ${JSON.stringify(goals)}
Today so far: ${JSON.stringify(today)}
Current time: ${new Date().toLocaleTimeString()}`;

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      max_tokens: 150,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    return NextResponse.json({
      success: true,
      insight: response.choices[0].message.content?.trim(),
    });
  } catch {
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }
}
