import { NextRequest, NextResponse } from "next/server";
import { extractBonusFromContent, askBonusAdvisor } from "@/lib/gemini";
import { getCurrentSession, isAdminEmail } from "@/lib/auth";
import { checkAiRateLimit, recordAiUsage } from "@/lib/ai-rate-limiter";

function getClientIdentifier(req: NextRequest, sessionEmail?: string): string {
  if (sessionEmail) return `user:${sessionEmail.trim().toLowerCase()}`;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return `ip:${forwarded.split(",")[0].trim()}`;
  }
  return `ip:${req.headers.get("x-real-ip") || "anonymous"}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const isAdmin = Boolean(
      session?.role === "admin" || (session?.email && isAdminEmail(session.email))
    );
    const identifier = getClientIdentifier(req, session?.email);
    const limitStatus = checkAiRateLimit(identifier, isAdmin);

    return NextResponse.json({
      success: true,
      remainingToday: limitStatus.remainingToday,
      limitReached: !limitStatus.allowed && limitStatus.reason === "user_daily_limit",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to check quota" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const isAdmin = Boolean(
      session?.role === "admin" || (session?.email && isAdminEmail(session.email))
    );
    const identifier = getClientIdentifier(req, session?.email);

    const body = await req.json();
    const { action, text, imageBase64, mimeType, casinosContext, apiKey: bodyKey } = body;
    const headerKey = req.headers.get("x-gemini-api-key") || undefined;
    const apiKey = bodyKey || headerKey;

    // Check rate limit
    const limitStatus = checkAiRateLimit(identifier, isAdmin);

    // Cooldown check (prevent rapid button mashing)
    if (!limitStatus.allowed && limitStatus.reason === "cooldown") {
      return NextResponse.json(
        { error: limitStatus.message || "Please wait a moment before asking again." },
        { status: 429 }
      );
    }

    // If daily limit or global cap is reached, force offline/fallback mode (100% free)
    const forceFallback = !limitStatus.allowed;

    if (action === "extract") {
      if (!text && !imageBase64) {
        return NextResponse.json(
          { error: "Please provide either text or an image to analyze." },
          { status: 400 }
        );
      }

      // If limit reached, don't use external API
      const extracted = await extractBonusFromContent({
        text,
        imageBase64,
        mimeType,
        apiKey: forceFallback ? undefined : apiKey,
      });

      if (!forceFallback) {
        recordAiUsage(identifier, isAdmin);
      }

      return NextResponse.json({
        success: true,
        data: extracted,
        fallback: forceFallback,
        message: forceFallback ? limitStatus.message : undefined,
        remainingToday: forceFallback
          ? 0
          : Math.max(0, limitStatus.remainingToday - 1),
      });
    }

    if (action === "advisor" || !action) {
      if (!text) {
        return NextResponse.json(
          { error: "Question or query text is required." },
          { status: 400 }
        );
      }

      // If limit reached, pass undefined apiKey to use free local knowledge base
      const reply = await askBonusAdvisor(
        text,
        casinosContext,
        forceFallback ? undefined : apiKey
      );

      if (!forceFallback) {
        recordAiUsage(identifier, isAdmin);
      }

      return NextResponse.json({
        success: true,
        reply,
        fallback: forceFallback,
        message: forceFallback ? limitStatus.message : undefined,
        remainingToday: forceFallback
          ? 0
          : Math.max(0, limitStatus.remainingToday - 1),
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Gemini API handler error:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to process AI request. Check your GEMINI_API_KEY.",
      },
      { status: 500 }
    );
  }
}
