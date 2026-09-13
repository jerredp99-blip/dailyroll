import { NextResponse } from "next/server";
import { getCurrentSession, isAdminEmail } from "@/lib/auth";
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

  const isAdmin = session.role === "admin" || isAdminEmail(session.email);

  return NextResponse.json({
    user: profile
      ? {
          name: profile.name,
          email: profile.email,
          avatarUrl: profile.avatarUrl ?? profile.preferences?.avatarUrl ?? null,
          role: isAdmin ? "admin" : (profile.role ?? "user"),
          isAdmin,
        }
      : {
          name: session.email.split("@")[0],
          email: session.email,
          avatarUrl: null,
          role: isAdmin ? "admin" : "user",
          isAdmin,
        },
    isAdmin,
  });
}