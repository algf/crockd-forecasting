import { NextRequest, NextResponse } from "next/server";
import { processChat, type ChatMessage } from "@/lib/ai/chat";

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

    const response = await processChat(messages || [], userMessage);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
