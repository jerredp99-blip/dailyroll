import { NextRequest, NextResponse } from "next/server";
import { getComments, addComment, getUsers } from "@/lib/store";
import { getCurrentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const key = `casino:${decodeURIComponent(id).trim().toLowerCase()}`;
    const comments = await getComments(key);

    return NextResponse.json({ comments }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Failed to get casino comments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { error: "Please sign in to join the conversation." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as { content?: string };
    const content = body.content?.trim();

    if (!content) {
      return NextResponse.json({ error: "Message content cannot be empty." }, { status: 400 });
    }

    const users = await getUsers();
    const userProfile = users.find(
      (u) => u.email.toLowerCase() === session.email.toLowerCase()
    );

    const authorName =
      userProfile?.name?.trim() ||
      session.email.split("@")[0] ||
      "Player";

    const authorAvatar =
      userProfile?.avatarUrl || userProfile?.preferences?.avatarUrl || undefined;

    const key = `casino:${decodeURIComponent(id).trim().toLowerCase()}`;

    const newComment = await addComment(key, {
      postId: key,
      authorId: userProfile?.id || session.email,
      authorName,
      authorEmail: session.email,
      authorAvatar,
      content,
    });

    return NextResponse.json({ comment: newComment }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Failed to post casino comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
