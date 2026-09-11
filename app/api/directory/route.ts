import { NextRequest, NextResponse } from "next/server";
import { getDirectory, saveDirectory } from "@/lib/store";

export async function GET() {
  const directory = await getDirectory();
  return NextResponse.json(directory);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    list?: string[];
    urls?: Record<string, string>;
    ratings?: Record<string, number>;
  };
  const directory = await saveDirectory(body);
  return NextResponse.json(directory);
}
