import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { processCopilotRequest } from "@/lib/copilot-service";

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getCurrentUser();
    let userId = sessionUser?.id;

    // Dev fallback if not logged in locally yet
    if (!userId && process.env.NODE_ENV !== "production") {
      const fallbackUser = await prisma.user.findFirst();
      userId = fallbackUser?.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to use Hyir Copilot." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { message, history } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Check for user-provided API key in header or body
    const apiKey =
      req.headers.get("x-gemini-api-key") ||
      body.apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY;

    const result = await processCopilotRequest({
      userId,
      message: message.trim(),
      history: history || [],
      apiKey: apiKey || undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Copilot route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
