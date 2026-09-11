import { NextRequest, NextResponse } from "next/server";
import { getDirectory, saveDirectory } from "@/lib/store";

export async function GET() {
  try {
    const directory = await getDirectory();
    return NextResponse.json(directory);
  } catch (error) {
    console.error("Unable to load casino directory", error);
    return NextResponse.json({ error: "Unable to load casino directory." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      list?: string[];
      urls?: Record<string, string>;
      ratings?: Record<string, number>;
    };
    const directory = await saveDirectory(body);
    return NextResponse.json(directory);
  } catch (error) {
    console.error("Unable to save casino directory", error);
    return NextResponse.json({ error: "Unable to save casino directory." }, { status: 503 });
  }
}
