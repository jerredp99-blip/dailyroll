import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { casinoKey, getCasinos, saveCasinos, Casino } from "@/lib/store";
import { trackUserActivity } from "@/lib/activity";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || !session.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const currentBalance = typeof body.currentBalance === "number" ? body.currentBalance : Number(body.currentBalance);

    if (isNaN(currentBalance) || currentBalance < 0) {
      return NextResponse.json({ error: "Invalid balance value" }, { status: 400 });
    }

    const key = casinoKey(session.email);
    const casinos = (await getCasinos(key)) || [];

    const updated = casinos.map((c: Casino) => {
      if (c.id === id || c.name.toLowerCase() === id.toLowerCase()) {
        return { ...c, currentBalance };
      }
      return c;
    });

    await saveCasinos(key, updated);

    await trackUserActivity(session.email, "BALANCE_EDIT", {
      casinoId: id,
      newBalance: currentBalance,
    });

    return NextResponse.json({ success: true, currentBalance });
  } catch (error) {
    console.error("Error updating casino balance:", error);
    return NextResponse.json({ error: "Failed to update balance" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context);
}

