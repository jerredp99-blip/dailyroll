import { NextRequest, NextResponse } from "next/server";
import { getUsers, saveUsers, UserProfile } from "@/lib/store";

export async function GET() {
  try {
    const users = await getUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Unable to load user profiles", error);
    return NextResponse.json({ error: "Unable to load user profiles." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
