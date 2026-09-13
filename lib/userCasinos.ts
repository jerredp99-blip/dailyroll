import type { Casino } from "@/types/casino";
import type { Post } from "@/lib/store";

/**
 * Returns a normalized set of casino IDs, names, and slug variants that are currently
 * active (not hidden) in the user's Rollcall tracker.
 */
export function getActiveRollcallCasinoKeys(casinos?: Casino[] | null): Set<string> {
  const activeKeys = new Set<string>();
  if (!casinos || !Array.isArray(casinos)) return activeKeys;

  for (const c of casinos) {
    if (!c.hidden) {
      if (c.id) {
        activeKeys.add(c.id.toLowerCase().trim());
      }
      if (c.name) {
        const nameLower = c.name.toLowerCase().trim();
        activeKeys.add(nameLower);
        // Add alphanumeric normalized key (e.g. "stakeus" or "crowncoins")
        activeKeys.add(nameLower.replace(/[^a-z0-9]/g, ""));
      }
      if (c.provider) {
        activeKeys.add(c.provider.toLowerCase().trim());
      }
    }
  }
  return activeKeys;
}

/**
 * Checks if a bonus drop post matches the user's active Rollcall casinos.
 * Universal drops (no specific casino affiliation) are always visible to all users.
 */
export function isDropInUserRollcall(post: Post, activeCasinoKeys: Set<string>): boolean {
  // If the user has no casinos tracked, allow viewing all drops so feed isn't empty
  if (activeCasinoKeys.size === 0) {
    return true;
  }

  // If post has no casino affiliation, treat as universal drop for all players
  if (!post.casinoId && !post.casinoName && !post.casinoTag) {
    return true;
  }

  // Explicit casinoId check
  if (post.casinoId) {
    const idLower = post.casinoId.toLowerCase().trim();
    if (activeCasinoKeys.has(idLower)) {
      return true;
    }
  }

  // Explicit casinoName check
  if (post.casinoName) {
    const nameLower = post.casinoName.toLowerCase().trim();
    if (
      activeCasinoKeys.has(nameLower) ||
      activeCasinoKeys.has(nameLower.replace(/[^a-z0-9]/g, ""))
    ) {
      return true;
    }
  }

  // Casino tag check (e.g. "STAKE", "CROWN", "WOW")
  if (post.casinoTag) {
    const tagLower = post.casinoTag.toLowerCase().trim();
    if (
      activeCasinoKeys.has(tagLower) ||
      activeCasinoKeys.has(tagLower.replace(/[^a-z0-9]/g, ""))
    ) {
      return true;
    }
  }

  // Check tags array if present
  if (post.tags && Array.isArray(post.tags)) {
    for (const tag of post.tags) {
      const t = tag.toLowerCase().trim();
      if (
        activeCasinoKeys.has(t) ||
        activeCasinoKeys.has(t.replace(/[^a-z0-9]/g, ""))
      ) {
        return true;
      }
    }
  }

  return false;
}

