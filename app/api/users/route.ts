import { NextRequest, NextResponse } from "next/server";
import { getUsers, saveUsers, UserProfile } from "@/lib/store";

export async function GET() {
  const users = await getUsers();
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { users: UserProfile[] };
  const users = await saveUsers(body.users);
  return NextResponse.json({ users });
}
