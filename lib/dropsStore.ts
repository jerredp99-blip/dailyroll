"use client";

import { useEffect, useState } from "react";

export type DropFeedback = "worked" | "expired";

/**
 * Checks if a post represents a bonus drop code / promotion.
 */
export function isBonusDrop(post: any): boolean {
  if (!post) return false;
  return Boolean(
    post.type === "drop_code" ||
      post.type === "bonus_drop" ||
      Boolean(post.dropCode) ||
      (Array.isArray(post.tags) &&
        post.tags.some(
          (t: string) =>
            typeof t === "string" &&
            ["BONUS_CODE", "BONUS_DROP", "DROP_CODE", "PROMO_CODE"].includes(
              t.toUpperCase()
            )
        ))
  );
}

/**
 * Retrieves the set of drop post IDs claimed by the user from localStorage.
 */
export function getClaimedDropIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const s1 = JSON.parse(localStorage.getItem("dailyroll_claimed_drops") || "[]");
    const s2 = JSON.parse(localStorage.getItem("dailyroll_claimed_drop_ids") || "[]");
    const s3 = JSON.parse(localStorage.getItem("claimed_bonus_drop_ids") || "[]");
    const a1 = Array.isArray(s1) ? s1 : [];
    const a2 = Array.isArray(s2) ? s2 : [];
    const a3 = Array.isArray(s3) ? s3 : [];
    return Array.from(new Set([...a1, ...a2, ...a3]));
  } catch {
    return [];
  }
}

/**
 * Retrieves the set of drop post IDs reported as expired / non-working by the user from localStorage.
 */
export function getUserReportedExpiredDropIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(
      localStorage.getItem("dailyroll_reported_expired_drops") || "[]"
    );
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

/**
 * Checks if a drop post is currently valid, active, and unclaimed by the user.
 */
export function isBonusDropActive(
  post: any,
  claimedDropIds: Set<string> | string[] = [],
  userReportedExpiredIds: Set<string> | string[] = []
): boolean {
  if (!post || !isBonusDrop(post)) return false;

  // Exclude if pending admin approval
  if (post.isApproved === false || post.status === "pending") return false;

  const id = post.id;
  const claimedSet =
    claimedDropIds instanceof Set ? claimedDropIds : new Set(claimedDropIds);
  const reportedSet =
    userReportedExpiredIds instanceof Set
      ? userReportedExpiredIds
      : new Set(userReportedExpiredIds);

  // 1. Exclude if claimed by user
  if (id && claimedSet.has(id)) return false;

  // 2. Exclude if reported expired or non-working by the user
  if (id && reportedSet.has(id)) return false;

  // 3. Exclude if explicitly marked expired on the post object
  if (post.expired || post.isExpired) return false;

  // 4. Exclude if expiresAt <= Date.now()
  if (post.expiresAt) {
    const expireTime = new Date(post.expiresAt).getTime();
    if (!Number.isNaN(expireTime) && expireTime <= Date.now()) {
      return false;
    }
  }

  // 5. Exclude if community negative feedback exceeds threshold (>= 3 reports, or >= 2 and exceeds works)
  const expiredCount =
    post.reactions?.["👎"]?.length || post.negativeReports || 0;
  const worksCount =
    post.reactions?.["👍"]?.length || post.positiveReports || 0;

  if (
    expiredCount >= 3 ||
    (expiredCount > 0 && expiredCount > worksCount && expiredCount >= 2)
  ) {
    return false;
  }

  return true;
}

/**
 * Retrieves cached drop posts from sessionStorage to prevent flash of 0 count.
 */
export function getCachedDrops(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(
      sessionStorage.getItem("dailyroll_cached_drops") || "[]"
    );
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

/**
 * Saves drop posts to sessionStorage and notifies subscribers.
 */
export function setCachedDrops(posts: any[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("dailyroll_cached_drops", JSON.stringify(posts));
  } catch {}
}

/**
 * Computes active valid drops count reactively from posts, claimed state, and feedback.
 */
export function computeActiveDropsCount(posts?: any[]): number {
  const list = posts && posts.length > 0 ? posts : getCachedDrops();
  const claimed = getClaimedDropIds();
  const reported = getUserReportedExpiredDropIds();
  return list.filter((p) => isBonusDropActive(p, claimed, reported)).length;
}

/**
 * Marks a drop as claimed, records it in localStorage, and broadcasts an event.
 */
export function notifyDropClaimed(postId: string): void {
  if (typeof window === "undefined" || !postId) return;
  try {
    const list = getClaimedDropIds();
    if (!list.includes(postId)) {
      const next = [...list, postId];
      localStorage.setItem("dailyroll_claimed_drops", JSON.stringify(next));
      localStorage.setItem("dailyroll_claimed_drop_ids", JSON.stringify(next));
      localStorage.setItem("claimed_bonus_drop_ids", JSON.stringify(next));
    }
  } catch {}
  window.dispatchEvent(
    new CustomEvent("dailyroll_drop_claimed", { detail: { postId } })
  );
}

/**
 * Records user feedback (e.g. "Expired 👎" or "Works 👍") and broadcasts an event.
 */
export function notifyDropFeedback(
  postId: string,
  feedback: DropFeedback
): void {
  if (typeof window === "undefined" || !postId) return;
  if (feedback === "expired") {
    try {
      const list = getUserReportedExpiredDropIds();
      if (!list.includes(postId)) {
        localStorage.setItem(
          "dailyroll_reported_expired_drops",
          JSON.stringify([...list, postId])
        );
      }
    } catch {}
  }
  window.dispatchEvent(
    new CustomEvent("dailyroll_drop_feedback", { detail: { postId, feedback } })
  );
}

/**
 * Broadcasts an updated drops list and saves it to session cache.
 */
export function notifyDropsUpdated(posts: any[]): void {
  if (typeof window === "undefined" || !Array.isArray(posts)) return;
  setCachedDrops(posts);
  window.dispatchEvent(
    new CustomEvent("dailyroll_drops_updated", { detail: { posts } })
  );
}

/**
 * React hook that returns a live, reactive count of active unclaimed bonus drops.
 * Updates immediately when drops are claimed, reported expired, or updated.
 */
export function useActiveDropsCount(): number {
  const [count, setCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return computeActiveDropsCount();
  });

  useEffect(() => {
    const update = () => {
      setCount(computeActiveDropsCount());
    };

    // Sync on mount
    update();

    window.addEventListener("dailyroll_drop_claimed", update);
    window.addEventListener("dailyroll_drop_feedback", update);
    window.addEventListener("dailyroll_drops_updated", update);
    window.addEventListener("storage", update);

    return () => {
      window.removeEventListener("dailyroll_drop_claimed", update);
      window.removeEventListener("dailyroll_drop_feedback", update);
      window.removeEventListener("dailyroll_drops_updated", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return count;
}
