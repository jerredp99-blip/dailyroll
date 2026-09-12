import { NextRequest, NextResponse } from "next/server";
import { getUsers, saveUsers, UserProfile } from "@/lib/store";
import { getCurrentSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
    const users = await getUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Unable to load user profiles", error);
    return NextResponse.json({ error: "Unable to load user profiles." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
    const body = (await request.json()) as { users: UserProfile[] };
    const users = await saveUsers(body.users);
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Unable to save user profiles", error);
    return NextResponse.json(
      { error: "Unable to save user profiles. Your profile is saved on this device." },
      { status: 503 },
    );
  }
}