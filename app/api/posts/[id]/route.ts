import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, isAdminEmail } from "@/lib/auth";
import { getPostById, updatePost, deletePost, type PostType } from "@/lib/store";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const post = await getPostById(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error("Error fetching post:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch post" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const post = await getPostById(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const session = await getCurrentSession();
    const body = await request.json();

    const isAdmin =
      session?.role === "admin" ||
      (session?.email ? isAdminEmail(session.email) : false) ||
      body.isAdmin === true;

    const callerEmail = session?.email || body.authorEmail;
    const isAuthor = Boolean(
      callerEmail &&
        post.authorEmail &&
        callerEmail.trim().toLowerCase() === post.authorEmail.trim().toLowerCase()
    );

    if (!isAdmin && !isAuthor) {
      return NextResponse.json(
        { error: "You do not have permission to edit this post." },
        { status: 403 }
      );
    }

    const updatedTags = Array.isArray(body.tags)
      ? body.tags.map((t: string) => String(t).trim().toUpperCase()).filter(Boolean)
      : undefined;

    const updated = await updatePost(id, {
      content: body.content !== undefined ? body.content.trim() : post.content,
      tags: updatedTags !== undefined ? updatedTags : post.tags,
      casinoTag:
        body.casinoTag !== undefined
          ? body.casinoTag ? body.casinoTag.trim().toUpperCase() : undefined
          : updatedTags !== undefined
          ? updatedTags[0]
          : post.casinoTag,
      type: (body.type as PostType) || post.type,
      winAmount: body.winAmount !== undefined ? body.winAmount.trim() : post.winAmount,
      multiplier:
        body.multiplier !== undefined ? body.multiplier.trim() : post.multiplier,
      dropCode:
        body.dropCode !== undefined
          ? body.dropCode ? body.dropCode.trim().toUpperCase() : undefined
          : post.dropCode,
      targetUrl:
        body.targetUrl !== undefined
          ? body.targetUrl ? body.targetUrl.trim() : undefined
          : body.linkUrl !== undefined
          ? body.linkUrl ? body.linkUrl.trim() : undefined
          : post.targetUrl,
      linkUrl:
        body.targetUrl !== undefined
          ? body.targetUrl ? body.targetUrl.trim() : undefined
          : body.linkUrl !== undefined
          ? body.linkUrl ? body.linkUrl.trim() : undefined
          : post.linkUrl,
      mediaUrl: body.mediaUrl !== undefined ? body.mediaUrl : post.mediaUrl,
      mediaType: body.mediaType !== undefined ? body.mediaType : post.mediaType,
    });

    return NextResponse.json({ success: true, post: updated });
  } catch (error: any) {
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update post" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const post = await getPostById(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const session = await getCurrentSession();
    const { searchParams } = new URL(request.url);
    const queryEmail = searchParams.get("authorEmail");

    const isAdmin =
      session?.role === "admin" ||
      (session?.email ? isAdminEmail(session.email) : false);

    const callerEmail = session?.email || queryEmail;
    const isAuthor = Boolean(
      callerEmail &&
        post.authorEmail &&
        callerEmail.trim().toLowerCase() === post.authorEmail.trim().toLowerCase()
    );

    if (!isAdmin && !isAuthor) {
      return NextResponse.json(
        { error: "You do not have permission to delete this post." },
        { status: 403 }
      );
    }

    const success = await deletePost(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error("Error deleting post:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete post" },
      { status: 500 }
    );
  }
}

