/**
 * Legacy helper — mobile home no longer displays numeric /api/home-stats counters.
 * Prefer non-numeric trust labels. If callers need counts, use API values as-is
 * with no local floors or fabricated fallbacks.
 */
export function displayHomeStats(
  stats?: {
    expertCount?: number;
    productCount?: number;
    appointmentCount?: number;
    orderCount?: number;
  } | null
) {
  return {
    expertCount: Math.max(Number(stats?.expertCount) || 0, 0),
    productCount: Math.max(Number(stats?.productCount) || 0, 0),
    appointmentCount: Math.max(Number(stats?.appointmentCount) || 0, 0),
    orderCount: Math.max(Number(stats?.orderCount) || 0, 0),
  };
}

/** Explicit: no fabricated local fallbacks. */
export const HOME_STATS_FALLBACK = null;
