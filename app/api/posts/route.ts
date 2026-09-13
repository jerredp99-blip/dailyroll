import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentSession, isAdminEmail } from "@/lib/auth";
import { createPost, getPosts, getUsers, type PostType } from "@/lib/store";

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

    return NextResponse.json({ success: true, posts });
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
    const session = await getCurrentSession();
    const body = await request.json();

    const {
      content,
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
      casinoTag: effectiveTags[0] || (casinoTag ? casinoTag.trim().toUpperCase() : undefined),
      tags: effectiveTags,
      type: (type as PostType) || "discussion",
      content: content.trim(),
      winAmount: winAmount ? winAmount.trim() : undefined,
      multiplier: multiplier ? multiplier.trim() : undefined,
      dropCode: dropCode ? dropCode.trim().toUpperCase() : undefined,
      targetUrl: resolvedDestinationUrl,
      linkUrl: resolvedDestinationUrl,
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

