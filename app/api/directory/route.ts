import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  casinoKey,
  getCasinos,
  getDirectory,
  queueMutation,
  type Casino,
} from "@/lib/store";
import { ADMIN_EMAIL, ADMIN_EMAILS, getCurrentSession } from "@/lib/auth";

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
      ...((await getCasinos(casinoKey("timber420@gmail.com"))) ?? []),
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
    const dailyBonuses: Record<string, string> = { ...(directory.dailyBonuses || {}) };
    const resetTimes: Record<string, string | null> = { ...(directory.resetTimes || {}) };
    const details: Record<string, string> = { ...(directory.details || {}) };

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
      if (casino.dailyBonus) dailyBonuses[casino.name] = casino.dailyBonus;
      if (casino.resetAtTime) resetTimes[casino.name] = casino.resetAtTime;
      if (casino.details) details[casino.name] = casino.details;
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
        dailyBonuses,
        resetTimes,
        details,
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
      dailyBonuses?: Record<string, string>;
      resetTimes?: Record<string, string | null>;
      details?: Record<string, string>;
    };

    // Atomic mutation: update directory and propagate changes to all user records in ONE step
    const directory = await queueMutation((store) => {
      if (body.list) store.directoryList = body.list;
      if (body.urls) store.directoryUrls = { ...(store.directoryUrls || {}), ...body.urls };
      if (body.affiliateUrls)
        store.affiliateUrls = { ...(store.affiliateUrls || {}), ...body.affiliateUrls };
      if (body.claimUrls) store.claimUrls = { ...(store.claimUrls || {}), ...body.claimUrls };
      if (body.bonusUrls) store.bonusUrls = { ...(store.bonusUrls || {}), ...body.bonusUrls };
      if (body.bonusTitles)
        store.bonusTitles = { ...(store.bonusTitles || {}), ...body.bonusTitles };
      if (body.ratings)
        store.directoryRatings = { ...(store.directoryRatings || {}), ...body.ratings };
      if (body.dailyBonuses)
        store.directoryDailyBonuses = {
          ...(store.directoryDailyBonuses || {}),
          ...body.dailyBonuses,
        };
      if (body.resetTimes)
        store.directoryResetTimes = {
          ...(store.directoryResetTimes || {}),
          ...body.resetTimes,
        };
      if (body.details)
        store.directoryDetails = {
          ...(store.directoryDetails || {}),
          ...body.details,
        };

      if (
        body.urls ||
        body.affiliateUrls ||
        body.claimUrls ||
        body.bonusUrls ||
        body.bonusTitles ||
        body.ratings ||
        body.dailyBonuses ||
        body.resetTimes ||
        body.details
      ) {
        const siteUrlsByLowerName = new Map(
          Object.entries(body.urls || {}).map(([name, url]) => [name.trim().toLowerCase(), url]),
        );
        const affiliateUrlsByLowerName = new Map(
          Object.entries(body.affiliateUrls || {}).map(([name, url]) => [
            name.trim().toLowerCase(),
            url,
          ]),
        );
        const claimUrlsByLowerName = new Map(
          Object.entries(body.claimUrls || {}).map(([name, url]) => [
            name.trim().toLowerCase(),
            url,
          ]),
        );
        const bonusUrlsByLowerName = new Map(
          Object.entries(body.bonusUrls || {}).map(([name, url]) => [
            name.trim().toLowerCase(),
            url,
          ]),
        );
        const bonusTitlesByLowerName = new Map(
          Object.entries(body.bonusTitles || {}).map(([name, title]) => [
            name.trim().toLowerCase(),
            title,
          ]),
        );
        const ratingsByLowerName = new Map(
          Object.entries(body.ratings || {}).map(([name, rating]) => [
            name.trim().toLowerCase(),
            rating,
          ]),
        );
        const dailyBonusesByLowerName = new Map(
          Object.entries(body.dailyBonuses || {}).map(([name, b]) => [
            name.trim().toLowerCase(),
            b,
          ]),
        );
        const resetTimesByLowerName = new Map(
          Object.entries(body.resetTimes || {}).map(([name, r]) => [
            name.trim().toLowerCase(),
            r,
          ]),
        );
        const detailsByLowerName = new Map(
          Object.entries(body.details || {}).map(([name, d]) => [
            name.trim().toLowerCase(),
            d,
          ]),
        );

        const targetKeys = new Set<string>([
          ...store.users.map((u) => casinoKey(u.email)),
          ...ADMIN_EMAILS.map((email) => casinoKey(email)),
          casinoKey(ADMIN_EMAIL),
          "admin",
          ...Object.keys(store.casinos || {}),
        ]);

        for (const key of targetKeys) {
          const records = store.casinos[key];
          if (!records || !Array.isArray(records)) continue;

          store.casinos[key] = records.map((casino) => {
            const lowerName = casino.name.trim().toLowerCase();
            const nextSite = siteUrlsByLowerName.get(lowerName);
            const nextAffiliate = affiliateUrlsByLowerName.get(lowerName);
            const nextClaim = claimUrlsByLowerName.get(lowerName);
            const nextBonus = bonusUrlsByLowerName.get(lowerName);
            const nextBonusTitle = bonusTitlesByLowerName.get(lowerName);
            const nextRating = ratingsByLowerName.get(lowerName);
            const nextDailyBonus = dailyBonusesByLowerName.get(lowerName);
            const nextReset = resetTimesByLowerName.get(lowerName);
            const nextDetail = detailsByLowerName.get(lowerName);

            const updated = { ...casino };
            if (nextSite !== undefined) {
              updated.siteUrl = nextSite;
              updated.url = nextSite;
            }
            if (nextAffiliate !== undefined) updated.affiliateUrl = nextAffiliate;
            if (nextClaim !== undefined) updated.claimUrl = nextClaim;
            if (nextBonus !== undefined) updated.bonusUrl = nextBonus;
            if (nextBonusTitle !== undefined) updated.bonusTitle = nextBonusTitle;
            if (nextRating !== undefined) updated.trustpilotRating = nextRating;
            if (nextDailyBonus !== undefined) updated.dailyBonus = nextDailyBonus;
            if (nextReset !== undefined) updated.resetAtTime = nextReset;
            if (nextDetail !== undefined) updated.details = nextDetail;
            return updated;
          });
        }
      }

      return {
        list: store.directoryList,
        urls: store.directoryUrls || {},
        affiliateUrls: store.affiliateUrls || {},
        claimUrls: store.claimUrls || {},
        bonusUrls: store.bonusUrls || {},
        bonusTitles: store.bonusTitles || {},
        ratings: store.directoryRatings || {},
        dailyBonuses: store.directoryDailyBonuses || {},
        resetTimes: store.directoryResetTimes || {},
        details: store.directoryDetails || {},
      };
    });

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