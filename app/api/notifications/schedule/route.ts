import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    status: "disabled",
    message: "Push notification scheduling is currently disabled.",
  });
}

export async function DELETE() {
  return NextResponse.json({
    status: "disabled",
    message: "Push notification scheduling is currently disabled.",
  });
}
