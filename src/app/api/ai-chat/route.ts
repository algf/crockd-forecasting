import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are a helpful AI assistant for Crockd Studios. You help users learn about the company and answer their questions in a friendly, professional manner.

About Crockd Studios:
- We are a creative technology studio specializing in web development, mobile apps, and AI solutions
- We focus on delivering high-quality, innovative digital products
- Our team is passionate about helping businesses grow through technology

Be helpful, concise, and friendly in your responses. If you don't know something specific about Crockd Studios, be honest about it and offer to help in other ways.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, userMessage } = body as {
      messages: ChatMessage[];
      userMessage: string;
    };

    if (!userMessage) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const chatMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || "";

    return NextResponse.json({ content });
  } catch (error) {
    console.error("AI Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
