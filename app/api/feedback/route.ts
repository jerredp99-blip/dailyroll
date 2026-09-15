import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, metadata } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Feedback message is required." },
        { status: 400 }
      );
    }

    if (message.trim().length > 2000) {
      return NextResponse.json(
        { error: "Feedback message too long (max 2000 characters)." },
        { status: 400 }
      );
    }

    // Get session for email attribution (optional)
    let userEmail: string | null = null;
    try {
      const session = await getCurrentSession();
      userEmail = session?.email || null;
    } catch {}

    const feedbackId = `feedback:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`;
    const feedbackData = {
      id: feedbackId,
      message: message.trim(),
      userEmail,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
    };

    // Store to Upstash Redis
    await redis.set(feedbackId, JSON.stringify(feedbackData));
    // Auto-expire after 90 days
    await redis.expire(feedbackId, 90 * 24 * 60 * 60);

    // Optional: Discord webhook notification
    const discordWebhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK_URL;
    if (discordWebhookUrl) {
      try {
        await fetch(discordWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `📬 **New Feedback** from ${userEmail || "Guest"}\n\n${message.trim().slice(0, 500)}\n\n_${metadata?.userAgent?.slice(0, 80) || "Unknown device"} • ${metadata?.viewport || "?"} • ${metadata?.pathname || "/"}_`,
          }),
        });
      } catch (webhookErr) {
        console.warn("Discord webhook failed:", webhookErr);
      }
    }

    return NextResponse.json({ success: true, id: feedbackId }, { status: 201 });
  } catch (error: any) {
    console.error("Error saving feedback:", error);
    return NextResponse.json(
      { error: "Failed to save feedback." },
      { status: 500 }
    );
  }
}
