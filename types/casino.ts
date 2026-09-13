export type SpeedRunStep = 1 | 2 | 3;

export interface Casino {
  id: string;
  name: string;
  dailyBonus: string;
  /** Canonical casino site URL — used for logo/favicon fallback and card click target. */
  siteUrl?: string;
  /** Affiliate / sign-up link used by the "Sign up" button on add-casinos page. */
  affiliateUrl?: string;
  /** Link opened by "Claim Now" from rollcall after a bonus has been claimed. */
  claimUrl?: string;
  /** Optional bonus T&C / detail page. */
  bonusUrl?: string;
  bonusTitle?: string;
  lastClaimedAt: string | null;
  intervalHours: number;
  resetAtTime?: string | null;
  trustpilotRating?: number;
  logo?: string;
  details?: string;
  hidden?: boolean;
  /** Legacy single URL field kept for backward compatibility. */
  url?: string;

  /** Casino operator / provider group (e.g. VGW, B2Services, Blazesoft, etc.). */
  provider?: string;
  /** Micro-instructions / cheat-code tip for claiming daily bonuses (e.g. "Click the green gift box"). */
  claimInstructions?: string;
  /** User's current tracked Sweeps Coins (SC) bankroll balance. */
  currentBalance?: number;
  /** User's quick note or memo for this casino. */
  notes?: string;
  /** Temporary snooze hold ISO timestamp (e.g. Snooze 1h). */
  snoozedUntil?: string | null;
}

export interface SpeedRunSessionState {
  queueIds: string[];
  currentIndex: number;
  currentStep: SpeedRunStep;
  sessionLootSc: number;
  sessionLootGc: number;
  claimedIds: string[];
  snoozedIds: Record<string, string>; // casinoId -> snoozedUntil ISO timestamp
  skippedIds: string[];
  startedAt: string;
  completed: boolean;
}
