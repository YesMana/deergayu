/**
 * Legacy helper — homepage no longer displays floored `/api/home-stats` numbers.
 * Backend `homeStatsFloor` (50 / 120 / 1000) still inflates that endpoint for
 * other clients; public Home must use non-numeric trust messaging or verified
 * live counts only.
 */
export function displayHomeStats(stats = {}) {
  return {
    expertCount: Math.max(0, Number(stats.expertCount) || 0),
    productCount: Math.max(0, Number(stats.productCount) || 0),
    appointmentCount: Math.max(0, Number(stats.appointmentCount) || 0),
    orderCount: Math.max(0, Number(stats.orderCount) || 0),
  };
}
