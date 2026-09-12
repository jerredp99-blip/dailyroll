import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUsers } from "@/lib/store";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ user: null, isAdmin: false });
  }

  const users = await getUsers();
  const profile = users.find(
    (user) => user.email.toLowerCase() === session.email.toLowerCase(),
  );

  return NextResponse.json({
    user: profile
      ? {
          name: profile.name,
          email: profile.email,
          avatarUrl: profile.avatarUrl ?? profile.preferences?.avatarUrl ?? null,
        }
      : { name: session.email.split("@")[0], email: session.email, avatarUrl: null },
    isAdmin: session.role === "admin",
  });
}