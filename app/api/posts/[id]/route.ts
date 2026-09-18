import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
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

    const updateData: Record<string, any> = {};

    if ("content" in body) {
      updateData.content =
        body.content !== null && body.content !== undefined ? String(body.content).trim() : "";
    }
    if ("tags" in body) {
      updateData.tags = Array.isArray(body.tags)
        ? body.tags.map((t: string) => String(t).trim().toUpperCase()).filter(Boolean)
        : [];
    }
    if ("casinoTag" in body) {
      updateData.casinoTag = body.casinoTag ? String(body.casinoTag).trim().toUpperCase() : null;
    }
    if ("casinoId" in body) {
      updateData.casinoId =
        body.casinoId === "" || body.casinoId === null ? null : String(body.casinoId).trim();
    }
    if ("casinoName" in body) {
      updateData.casinoName =
        body.casinoName === "" || body.casinoName === null ? null : String(body.casinoName).trim();
    }
    if ("type" in body) {
      updateData.type = (body.type as PostType) || post.type || "discussion";
    }
    if ("winAmount" in body) {
      updateData.winAmount =
        body.winAmount === "" || body.winAmount === null ? null : String(body.winAmount).trim();
    }
    if ("multiplier" in body) {
      updateData.multiplier =
        body.multiplier === "" || body.multiplier === null ? null : String(body.multiplier).trim();
    }
    if ("dropCode" in body) {
      updateData.dropCode =
        body.dropCode === "" || body.dropCode === null
          ? null
          : String(body.dropCode).trim().toUpperCase();
    }
    if ("targetUrl" in body) {
      const val =
        body.targetUrl === "" || body.targetUrl === null ? null : String(body.targetUrl).trim();
      updateData.targetUrl = val;
      if (!("linkUrl" in body)) {
        updateData.linkUrl = val;
      }
    }
    if ("linkUrl" in body) {
      const val =
        body.linkUrl === "" || body.linkUrl === null ? null : String(body.linkUrl).trim();
      updateData.linkUrl = val;
      if (!("targetUrl" in body)) {
        updateData.targetUrl = val;
      }
    }
    if ("mediaUrl" in body) {
      updateData.mediaUrl =
        body.mediaUrl === "" || body.mediaUrl === null ? null : String(body.mediaUrl).trim();
    }
    if ("mediaType" in body) {
      updateData.mediaType =
        body.mediaType === "" || body.mediaType === null ? null : body.mediaType;
    }
    if (isAdmin) {
      if ("status" in body) {
        updateData.status = body.status;
        updateData.isApproved = body.status === "approved";
      }
      if ("isApproved" in body) {
        updateData.isApproved = Boolean(body.isApproved);
        updateData.status = body.isApproved ? "approved" : "pending";
      }
    }

    const updated = await updatePost(id, updateData);

    try {
      revalidatePath("/tracker");
      revalidatePath("/dashboard");
      try {
        revalidateTag("posts", "default");
      } catch {}
    } catch (revalErr) {
      console.warn("Revalidation warning for posts:", revalErr);
    }

    return NextResponse.json({ success: true, post: updated });
  } catch (error: any) {
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update post" },
      { status: 500 }
    );
  }
}

export const PATCH = PUT;

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

