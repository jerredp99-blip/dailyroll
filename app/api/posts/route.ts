import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentSession, isAdminEmail } from "@/lib/auth";
import { createPost, getPosts, getUsers, type PostType } from "@/lib/store";

// --- In-memory Rate Limiter (3 posts per 5 minutes per IP) ---
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 3;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }
  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}

// Cleanup stale entries every 10 minutes
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
      if (now >= entry.resetAt) rateLimitMap.delete(ip);
    }
  }, 10 * 60 * 1000);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as PostType | null;
    const tag = searchParams.get("tag") || searchParams.get("casinoTag") || undefined;
    const authorEmail = searchParams.get("authorEmail") || undefined;

    const posts = await getPosts({
      type: type || undefined,
      tag: tag || undefined,
      authorEmail: authorEmail || undefined,
    });

    const userCasinoIdsParam = searchParams.get("userCasinoIds");
    let resultPosts = posts;
    if (userCasinoIdsParam) {
      const allowedIds = new Set(
        userCasinoIdsParam
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      );
      if (allowedIds.size > 0) {
        resultPosts = resultPosts.filter((p) => {
          if (p.type === "drop_code" || p.dropCode) {
            if (p.casinoId) {
              return allowedIds.has(p.casinoId.toLowerCase().trim());
            }
          }
          return true;
        });
      }
    }

    return NextResponse.json({ success: true, posts: resultPosts });
  } catch (error: any) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many posts. Please wait a few minutes before posting again." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)) },
        }
      );
    }

    const session = await getCurrentSession();
    const body = await request.json();

    const {
      content,
      casinoId,
      casinoName,
      casinoTag,
      tags,
      type,
      winAmount,
      multiplier,
      dropCode,
      targetUrl,
      linkUrl,
      authorName,
      authorEmail,
      mediaUrl,
      mediaType,
    } = body;

    const resolvedDestinationUrl = (targetUrl || linkUrl || "").trim() || undefined;

    // Sanitize URL to enforce https://
    const sanitizedUrl = resolvedDestinationUrl && !resolvedDestinationUrl.startsWith("https://")
      ? (resolvedDestinationUrl.startsWith("http://") ? resolvedDestinationUrl.replace("http://", "https://") : `https://${resolvedDestinationUrl}`)
      : resolvedDestinationUrl;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Post content cannot be empty." },
        { status: 400 }
      );
    }

    const isBonusDropPost =
      type === "drop_code" ||
      type === "bonus_drop" ||
      Boolean(dropCode) ||
      (Array.isArray(tags) &&
        tags.some((t: string) =>
          typeof t === "string" &&
          ["BONUS_CODE", "BONUS_DROP", "DROP_CODE", "PROMO_CODE"].includes(t.toUpperCase())
        ));

    if (isBonusDropPost) {
      const isAdmin = session?.role === "admin" || isAdminEmail(session?.email);
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Only admins can post Bonus Drops" },
          { status: 403 }
        );
      }
    }

    const effectiveEmail = session?.email || authorEmail || "guest@dailyroll.app";
    const effectiveName = session ? session.email.split("@")[0] : authorName || "Guest Roller";

    let effectiveAvatar = body.authorAvatar;
    if (!effectiveAvatar && session?.email) {
      const users = await getUsers();
      const profile = users.find(
        (u) => u.email.trim().toLowerCase() === session.email.trim().toLowerCase()
      );
      effectiveAvatar = profile?.avatarUrl ?? profile?.preferences?.avatarUrl;
    }

    const effectiveTags: string[] = Array.isArray(tags)
      ? tags.map((t: string) => String(t).trim().toUpperCase()).filter(Boolean)
      : casinoTag
      ? [casinoTag.trim().toUpperCase()]
      : [];

    const newPost = await createPost({
      authorId: session?.email || "guest-" + crypto.randomUUID().slice(0, 8),
      authorName: effectiveName,
      authorEmail: effectiveEmail,
      authorAvatar: effectiveAvatar || undefined,
      casinoId: casinoId ? String(casinoId).trim() : null,
      casinoName: casinoName ? String(casinoName).trim() : null,
      casinoTag: effectiveTags[0] || (casinoTag ? casinoTag.trim().toUpperCase() : undefined),
      tags: effectiveTags,
      type: (type as PostType) || "discussion",
      content: content.trim(),
      winAmount: winAmount ? winAmount.trim() : undefined,
      multiplier: multiplier ? multiplier.trim() : undefined,
      dropCode: dropCode ? dropCode.trim().toUpperCase() : undefined,
      targetUrl: sanitizedUrl,
      linkUrl: sanitizedUrl,
      mediaUrl: mediaUrl ? mediaUrl.trim() : undefined,
      mediaType: mediaType || undefined,
    });

    try {
      revalidatePath("/tracker");
      revalidatePath("/dashboard");
      try {
        revalidateTag("posts", "default");
      } catch {}
    } catch (revalErr) {
      console.warn("Revalidation warning:", revalErr);
    }

    return NextResponse.json({ success: true, post: newPost }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create post" },
      { status: 500 }
    );
  }
}

