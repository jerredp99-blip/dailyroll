import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentSession } from "@/lib/auth";
import { deleteSession } from "@/lib/store";

export async function POST() {
  const session = await getCurrentSession();
  if (session) {
    await deleteSession(session.token);
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}