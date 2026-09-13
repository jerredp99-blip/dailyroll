import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  casinoKey,
  getCasinos,
  getDirectory,
  getUsers,
  saveCasinos,
  saveDirectory,
  type Casino,
} from "@/lib/store";
import { ADMIN_EMAIL, getCurrentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function effectiveSiteUrl(casino: Casino): string | undefined {
  return casino.siteUrl ?? casino.url;
}

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    const directory = await getDirectory();
    const adminCasinos = [
      ...((await getCasinos(casinoKey(ADMIN_EMAIL))) ?? []),
      ...((await getCasinos("admin")) ?? []),
    ];
    const ratings: Record<string, number> = {};
    for (const [name, value] of Object.entries(directory.ratings)) {
      const numericRating = Number(value);
      if (Number.isFinite(numericRating)) ratings[name] = numericRating;
    }
    const urls: Record<string, string> = { ...directory.urls };
    const affiliateUrls: Record<string, string> = { ...directory.affiliateUrls };
    const claimUrls: Record<string, string> = { ...directory.claimUrls };
    const bonusUrls: Record<string, string> = { ...directory.bonusUrls };
    const bonusTitles: Record<string, string> = { ...directory.bonusTitles };
    for (const casino of adminCasinos ?? []) {
      const numericRating = Number(casino.trustpilotRating);
      if (Number.isFinite(numericRating)) {
        ratings[casino.name] = numericRating;
      }
      const site = effectiveSiteUrl(casino);
      if (site) urls[casino.name] = site;
      if (casino.affiliateUrl) affiliateUrls[casino.name] = casino.affiliateUrl;
      if (casino.claimUrl) claimUrls[casino.name] = casino.claimUrl;
      if (casino.bonusUrl) bonusUrls[casino.name] = casino.bonusUrl;
      if (casino.bonusTitle) bonusTitles[casino.name] = casino.bonusTitle;
    }
    return NextResponse.json(
      {
        ...directory,
        ratings,
        urls,
        affiliateUrls,
        claimUrls,
        bonusUrls,
        bonusTitles,
      },
      { headers: NO_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Unable to load casino directory", error);
    return NextResponse.json({ error: "Unable to load casino directory." }, { status: 503 });
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
    const body = (await request.json()) as {
      list?: string[];
      urls?: Record<string, string>;
      affiliateUrls?: Record<string, string>;
      claimUrls?: Record<string, string>;
      bonusUrls?: Record<string, string>;
      bonusTitles?: Record<string, string>;
      ratings?: Record<string, number>;
    };
    const directory = await saveDirectory(body);

    // Master URL/rating edits must reach every profile, so propagate the
    // changed values into each user's saved casino records (plus the admin's
    // own records, which the GET aggregation otherwise lets win).
    if (body.urls || body.affiliateUrls || body.claimUrls || body.bonusUrls || body.bonusTitles || body.ratings) {
      const siteUrlsByLowerName = body.urls
        ? new Map(Object.entries(body.urls).map(([name, url]) => [name.trim().toLowerCase(), url]))
        : new Map<string, string>();
      const affiliateUrlsByLowerName = body.affiliateUrls
        ? new Map(Object.entries(body.affiliateUrls).map(([name, url]) => [name.trim().toLowerCase(), url]))
        : new Map<string, string>();
      const claimUrlsByLowerName = body.claimUrls
        ? new Map(Object.entries(body.claimUrls).map(([name, url]) => [name.trim().toLowerCase(), url]))
        : new Map<string, string>();
      const bonusUrlsByLowerName = body.bonusUrls
        ? new Map(Object.entries(body.bonusUrls).map(([name, url]) => [name.trim().toLowerCase(), url]))
        : new Map<string, string>();
      const bonusTitlesByLowerName = body.bonusTitles
        ? new Map(Object.entries(body.bonusTitles).map(([name, title]) => [name.trim().toLowerCase(), title]))
        : new Map<string, string>();
      const ratingsByLowerName = body.ratings
        ? new Map(Object.entries(body.ratings).map(([name, rating]) => [name.trim().toLowerCase(), rating]))
        : new Map<string, number>();

      const applyToKey = async (key: string) => {
        const records = (await getCasinos(key)) ?? [];
        let changed = false;
        const updated = records.map((casino) => {
          const lowerName = casino.name.trim().toLowerCase();
          const nextSite = siteUrlsByLowerName.get(lowerName);
          const nextAffiliate = affiliateUrlsByLowerName.get(lowerName);
          const nextClaim = claimUrlsByLowerName.get(lowerName);
          const nextBonus = bonusUrlsByLowerName.get(lowerName);
          const nextBonusTitle = bonusTitlesByLowerName.get(lowerName);
          const nextRating = ratingsByLowerName.get(lowerName);
          const currentSite = effectiveSiteUrl(casino);
          const updates: Partial<Casino> = {};
          if (nextSite !== undefined && nextSite !== currentSite) updates.siteUrl = nextSite;
          if (nextAffiliate !== undefined && nextAffiliate !== casino.affiliateUrl)
            updates.affiliateUrl = nextAffiliate;
          if (nextClaim !== undefined && nextClaim !== casino.claimUrl) updates.claimUrl = nextClaim;
          if (nextBonus !== undefined && nextBonus !== casino.bonusUrl) updates.bonusUrl = nextBonus;
          if (nextBonusTitle !== undefined && nextBonusTitle !== casino.bonusTitle)
            updates.bonusTitle = nextBonusTitle;
          if (nextRating !== undefined && nextRating !== casino.trustpilotRating)
            updates.trustpilotRating = nextRating;
          if (Object.keys(updates).length === 0) return casino;
          changed = true;
          return { ...casino, ...updates } as Casino;
        });
        if (changed) await saveCasinos(key, updated);
      };

      const users = await getUsers();
      await Promise.all([
        ...users.map((user) => applyToKey(casinoKey(user.email))),
        applyToKey(casinoKey(ADMIN_EMAIL)),
        applyToKey("admin"),
      ]);
    }

    // Invalidate caches immediately after DB write succeeds
    try {
      revalidatePath("/tracker");
      revalidatePath("/dashboard/casinos");
      revalidateTag("casinos", "default");
    } catch (err) {
      console.warn("Cache revalidation warning:", err);
    }

    return NextResponse.json(directory, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Unable to save casino directory", error);
    return NextResponse.json({ error: "Unable to save casino directory." }, { status: 503 });
  }
}