import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { addComment, getComments } from "@/lib/store";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const comments = await getComments(id);
    return NextResponse.json({ success: true, comments });
  } catch (error: any) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getCurrentSession();
    const body = await request.json();

    const { content, authorName, authorEmail } = body;
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Comment content cannot be empty." },
        { status: 400 }
      );
    }

    const effectiveEmail = session?.email || authorEmail || "guest@dailyroll.app";
    const effectiveName = session ? session.email.split("@")[0] : (authorName || "Roller");

    const newComment = await addComment(id, {
      postId: id,
      authorId: session?.email || "guest-" + crypto.randomUUID().slice(0, 8),
      authorName: effectiveName,
      authorEmail: effectiveEmail,
      content: content.trim(),
    });

    return NextResponse.json({ success: true, comment: newComment }, { status: 201 });
  } catch (error: any) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to add comment" },
      { status: 500 }
    );
  }
}

