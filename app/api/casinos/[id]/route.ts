import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  casinoKey,
  getCasinos,
  getDirectory,
  Casino,
} from "@/lib/store";
import { updateCasinoMetadata } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { casinoDirectory, casinoDirectoryUrls } from "@/lib/casino-directory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DEFAULT_KNOWN_CASINOS: Partial<Casino>[] = [
  {
    id: "1",
    name: "Crown Coins",
    dailyBonus: "1.00 SC",
    siteUrl: "https://crowncoinscasino.com",
    intervalHours: 24,
    dailyBonusSc: "1.00 SC",
    dailyBonusGc: "100,000 CC",
    minRedemption: "$50 (Gift Card) / $100 (Bank Transfer)",
    payoutMethods: "Online Banking, Skrill, Prizeout",
    payoutSpeed: "24-48 Hours",
    resetRule: "Rolling 24 Hours",
    restrictedStates: "WA, ID, NV, MI, KY",
  },
  {
    id: "2",
    name: "Stake.us",
    dailyBonus: "1.00 Stake Cash",
    siteUrl: "https://stake.us",
    intervalHours: 24,
    dailyBonusSc: "1.00 SC",
    dailyBonusGc: "10,000 GC",
    minRedemption: "$50 (Crypto)",
    payoutMethods: "Bitcoin, Ethereum, USDT, LTC, Doge",
    payoutSpeed: "Instant - 10 Minutes",
    resetRule: "Fixed 7:00 PM EST",
    restrictedStates: "WA, ID, NV, NY, MI, KY, VT",
  },
  {
    id: "3",
    name: "Pulsz",
    dailyBonus: "0.30 SC",
    siteUrl: "https://pulsz.com",
    intervalHours: 24,
    dailyBonusSc: "0.30 SC",
    dailyBonusGc: "5,000 GC",
    minRedemption: "$10 (Gift Card) / $100 (Bank)",
    payoutMethods: "Trustly Online Banking, Skrill, Prizeout",
    payoutSpeed: "1-3 Business Days",
    resetRule: "Rolling 24 Hours",
    restrictedStates: "WA, ID, NV, MI",
  },
  {
    id: "4",
    name: "McLuck",
    dailyBonus: "0.25 SC",
    siteUrl: "https://mcluck.com",
    intervalHours: 24,
    dailyBonusSc: "0.25 SC",
    dailyBonusGc: "2,500 GC",
    minRedemption: "$75 (Gift Card) / $100 (Bank)",
    payoutMethods: "Online Banking, Visa/Mastercard, Gift Cards",
    payoutSpeed: "24-48 Hours",
    resetRule: "Rolling 24 Hours",
    restrictedStates: "WA, ID, NV, MI, GA, AL, MT",
  },
];

async function resolveCasino(idOrSlug: string, userEmail?: string | null): Promise<{
  casino: Casino | null;
  isTracked: boolean;
  userCasino: Casino | null;
}> {
  const rawQuery = decodeURIComponent(idOrSlug).trim();
  const querySlug = slugify(rawQuery);
  const queryLower = rawQuery.toLowerCase();

  // 1. If signed in, search user's casino list
  let userMatchedCasino: Casino | null = null;
  let isTracked = false;

  if (userEmail) {
    const userCasinos = (await getCasinos(casinoKey(userEmail))) || [];
    for (const c of userCasinos) {
      if (
        c.id === rawQuery ||
        c.name.toLowerCase() === queryLower ||
        slugify(c.name) === querySlug ||
        slugify(c.id) === querySlug
      ) {
        userMatchedCasino = c;
        isTracked = true;
        break;
      }
    }
  }

  // 2. Fetch canonical directory
  const directory = await getDirectory();
  const dirList = directory.list && directory.list.length > 0 ? directory.list : casinoDirectory;

  // Check admin store list
  const adminCasinos = (await getCasinos("admin")) || [];
  let adminMatchedCasino = adminCasinos.find(
    (c) =>
      c.id === rawQuery ||
      c.name.toLowerCase() === queryLower ||
      slugify(c.name) === querySlug ||
      slugify(c.id) === querySlug
  );

  // Check directory names
  let matchedDirectoryName = dirList.find(
    (name) => name.toLowerCase() === queryLower || slugify(name) === querySlug
  );

  // Check known defaults
  const knownDefault = DEFAULT_KNOWN_CASINOS.find(
    (k) =>
      k.id === rawQuery ||
      (k.name && k.name.toLowerCase() === queryLower) ||
      (k.name && slugify(k.name) === querySlug)
  );

  const canonicalName =
    userMatchedCasino?.name ||
    adminMatchedCasino?.name ||
    matchedDirectoryName ||
    knownDefault?.name ||
    rawQuery;

  // Build canonical specs from directory maps or known defaults
  const siteUrl =
    directory.urls[canonicalName] ||
    userMatchedCasino?.siteUrl ||
    adminMatchedCasino?.siteUrl ||
    casinoDirectoryUrls[canonicalName] ||
    knownDefault?.siteUrl ||
    null;

  const dailyBonus =
    directory.dailyBonuses[canonicalName] ||
    userMatchedCasino?.dailyBonus ||
    adminMatchedCasino?.dailyBonus ||
    knownDefault?.dailyBonus ||
    "Free daily";

  const dailyBonusSc =
    directory.dailyBonusSc?.[canonicalName] ??
    userMatchedCasino?.dailyBonusSc ??
    adminMatchedCasino?.dailyBonusSc ??
    knownDefault?.dailyBonusSc ??
    null;

  const dailyBonusGc =
    directory.dailyBonusGc?.[canonicalName] ??
    userMatchedCasino?.dailyBonusGc ??
    adminMatchedCasino?.dailyBonusGc ??
    knownDefault?.dailyBonusGc ??
    null;

  const minRedemption =
    directory.minRedemption?.[canonicalName] ??
    userMatchedCasino?.minRedemption ??
    adminMatchedCasino?.minRedemption ??
    knownDefault?.minRedemption ??
    null;

  const payoutMethods =
    directory.payoutMethods?.[canonicalName] ??
    userMatchedCasino?.payoutMethods ??
    adminMatchedCasino?.payoutMethods ??
    knownDefault?.payoutMethods ??
    null;

  const payoutSpeed =
    directory.payoutSpeed?.[canonicalName] ??
    userMatchedCasino?.payoutSpeed ??
    adminMatchedCasino?.payoutSpeed ??
    knownDefault?.payoutSpeed ??
    null;

  const resetRule =
    directory.resetRules?.[canonicalName] ??
    userMatchedCasino?.resetRule ??
    adminMatchedCasino?.resetRule ??
    knownDefault?.resetRule ??
    null;

  const restrictedStates =
    directory.restrictedStates?.[canonicalName] ??
    userMatchedCasino?.restrictedStates ??
    adminMatchedCasino?.restrictedStates ??
    knownDefault?.restrictedStates ??
    null;

  const affiliateUrl =
    directory.affiliateUrls[canonicalName] ??
    userMatchedCasino?.affiliateUrl ??
    adminMatchedCasino?.affiliateUrl ??
    null;

  const claimUrl =
    directory.claimUrls[canonicalName] ??
    userMatchedCasino?.claimUrl ??
    adminMatchedCasino?.claimUrl ??
    null;

  const bonusUrl =
    directory.bonusUrls[canonicalName] ??
    userMatchedCasino?.bonusUrl ??
    adminMatchedCasino?.bonusUrl ??
    null;

  const bonusTitle =
    directory.bonusTitles[canonicalName] ??
    userMatchedCasino?.bonusTitle ??
    adminMatchedCasino?.bonusTitle ??
    null;

  const trustpilotRating =
    directory.ratings[canonicalName] ??
    userMatchedCasino?.trustpilotRating ??
    adminMatchedCasino?.trustpilotRating ??
    null;

  const details =
    directory.details[canonicalName] ??
    userMatchedCasino?.details ??
    adminMatchedCasino?.details ??
    null;

  const provider =
    directory.providers[canonicalName] ??
    userMatchedCasino?.provider ??
    adminMatchedCasino?.provider ??
    null;

  const resetAtTime =
    directory.resetTimes[canonicalName] ??
    userMatchedCasino?.resetAtTime ??
    adminMatchedCasino?.resetAtTime ??
    null;

  const resolvedCasino: Casino = {
    id: userMatchedCasino?.id || adminMatchedCasino?.id || slugify(canonicalName),
    name: canonicalName,
    dailyBonus,
    dailyBonusSc,
    dailyBonusGc,
    minRedemption,
    payoutMethods,
    payoutSpeed,
    resetRule,
    restrictedStates,
    siteUrl,
    affiliateUrl,
    claimUrl,
    bonusUrl,
    bonusTitle,
    trustpilotRating,
    details,
    provider,
    resetAtTime,
    intervalHours: userMatchedCasino?.intervalHours || adminMatchedCasino?.intervalHours || 24,
    lastClaimedAt: userMatchedCasino?.lastClaimedAt || null,
    snoozedUntil: userMatchedCasino?.snoozedUntil || null,
    targetResetTimestamp: userMatchedCasino?.targetResetTimestamp || null,
    currentBalance: userMatchedCasino?.currentBalance ?? null,
    notes: userMatchedCasino?.notes ?? null,
    hidden: userMatchedCasino?.hidden ?? false,
  };

  return {
    casino: resolvedCasino,
    isTracked,
    userCasino: userMatchedCasino,
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getCurrentSession();

    const { casino, isTracked, userCasino } = await resolveCasino(id, session?.email);

    if (!casino) {
      return NextResponse.json({ error: "Casino not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        casino,
        isTracked,
        userTracking: userCasino
          ? {
              lastClaimedAt: userCasino.lastClaimedAt,
              snoozedUntil: userCasino.snoozedUntil,
              targetResetTimestamp: userCasino.targetResetTimestamp,
              currentBalance: userCasino.currentBalance,
              notes: userCasino.notes,
            }
          : null,
        isAdmin: session?.role === "admin",
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Failed to retrieve casino detail:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getCurrentSession();

    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can edit casino operational specs." },
        { status: 403 }
      );
    }

    const { casino } = await resolveCasino(id, session.email);
    if (!casino) {
      return NextResponse.json({ error: "Casino not found" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    // Helper to sanitize fields: converts empty strings to null or preserves defined values
    const sanitizeField = (val: unknown) => {
      if (val === "" || val === null || val === undefined) return null;
      return typeof val === "string" ? val.trim() : val;
    };

    const updatePayload: Parameters<typeof updateCasinoMetadata>[0] = {
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : casino.name,
    };

    if ("siteUrl" in body) updatePayload.siteUrl = sanitizeField(body.siteUrl) as string | null;
    if ("affiliateUrl" in body) updatePayload.affiliateUrl = sanitizeField(body.affiliateUrl) as string | null;
    if ("claimUrl" in body) updatePayload.claimUrl = sanitizeField(body.claimUrl) as string | null;
    if ("bonusUrl" in body) updatePayload.bonusUrl = sanitizeField(body.bonusUrl) as string | null;
    if ("bonusTitle" in body) updatePayload.bonusTitle = sanitizeField(body.bonusTitle) as string | null;
    if ("trustpilotRating" in body) {
      const rating = sanitizeField(body.trustpilotRating);
      updatePayload.trustpilotRating = rating !== null && !isNaN(Number(rating)) ? Number(rating) : null;
    }
    if ("dailyBonus" in body) updatePayload.dailyBonus = sanitizeField(body.dailyBonus) as string | null;
    if ("dailyBonusSc" in body) updatePayload.dailyBonusSc = sanitizeField(body.dailyBonusSc) as string | null;
    if ("dailyBonusGc" in body) updatePayload.dailyBonusGc = sanitizeField(body.dailyBonusGc) as string | null;
    if ("minRedemption" in body) updatePayload.minRedemption = sanitizeField(body.minRedemption) as string | null;
    if ("payoutMethods" in body) updatePayload.payoutMethods = sanitizeField(body.payoutMethods) as string | null;
    if ("payoutSpeed" in body) updatePayload.payoutSpeed = sanitizeField(body.payoutSpeed) as string | null;
    if ("resetRule" in body) updatePayload.resetRule = sanitizeField(body.resetRule) as string | null;
    if ("restrictedStates" in body) updatePayload.restrictedStates = sanitizeField(body.restrictedStates) as string | null;
    if ("details" in body) updatePayload.details = sanitizeField(body.details) as string | null;
    if ("provider" in body) updatePayload.provider = sanitizeField(body.provider) as string | null;
    if ("resetAtTime" in body) updatePayload.resetAtTime = sanitizeField(body.resetAtTime) as string | null;
    if ("intervalHours" in body) {
      const hours = sanitizeField(body.intervalHours);
      updatePayload.intervalHours = hours !== null && !isNaN(Number(hours)) ? Number(hours) : 24;
    }

    await updateCasinoMetadata(updatePayload);

    // Revalidate caches
    try {
      revalidatePath(`/casinos/${encodeURIComponent(id)}`);
      revalidatePath("/tracker");
      revalidateTag("casinos", "default");
    } catch (cacheErr) {
      console.warn("Revalidation warning:", cacheErr);
    }

    const { casino: updatedCasino } = await resolveCasino(id, session.email);

    return NextResponse.json({ ok: true, casino: updatedCasino }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Failed to update casino operational specs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
