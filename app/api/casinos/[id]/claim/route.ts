import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { casinoKey, getCasinos, saveCasinos, Casino } from "@/lib/store";
import { trackUserActivity } from "@/lib/activity";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || !session.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const key = casinoKey(session.email);
    const casinos = (await getCasinos(key)) || [];

    let claimedCasino: Casino | null = null;
    const nowIso = new Date().toISOString();

    const updated = casinos.map((c: Casino) => {
      if (c.id === id || c.name.toLowerCase() === id.toLowerCase()) {
        claimedCasino = {
          ...c,
          lastClaimedAt: nowIso,
          ...(body.claimedAt ? { lastClaimedAt: body.claimedAt } : {}),
        };
        return claimedCasino;
      }
      return c;
    });

    if (!claimedCasino) {
      return NextResponse.json({ error: "Casino not found in rollcall" }, { status: 404 });
    }

    await saveCasinos(key, updated);

    // Track claim activity telemetry
    const amount = body.amount || (claimedCasino as Casino).dailyBonusSc || (claimedCasino as Casino).dailyBonus || "Daily Bonus";
    await trackUserActivity(session.email, "CLAIM", {
      casinoId: id,
      casinoName: (claimedCasino as Casino).name,
      amount,
    });

    return NextResponse.json({ success: true, casino: claimedCasino });
  } catch (error) {
    console.error("Error processing casino claim:", error);
    return NextResponse.json({ error: "Failed to record claim" }, { status: 500 });
  }
}
