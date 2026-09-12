import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { toggleLikePost, toggleReactionPost } from "@/lib/store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getCurrentSession();
    const body = await request.json().catch(() => ({}));

    const userEmail = session?.email || body?.userEmail;
    if (!userEmail) {
      return NextResponse.json(
        { error: "User identity required to react." },
        { status: 401 }
      );
    }

    const { emoji } = body;

    let updatedPost;
    if (emoji) {
      updatedPost = await toggleReactionPost(id, userEmail, emoji);
    } else {
      updatedPost = await toggleLikePost(id, userEmail);
    }

    if (!updatedPost) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (error: any) {
    console.error("Error reacting to post:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update reaction" },
      { status: 500 }
    );
  }
}

