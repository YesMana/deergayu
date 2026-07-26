/**
 * Legacy helper — web homepage uses non-numeric trust messaging only.
 * Do not display floored /api/home-stats counters (50 / 120 / 1000).
 * Backend now returns real counts; still do not reintroduce numeric homepage counters.
 */
export function displayHomeStats(stats = {}) {
  return {
    expertCount: Math.max(0, Number(stats.expertCount) || 0),
    productCount: Math.max(0, Number(stats.productCount) || 0),
    appointmentCount: Math.max(0, Number(stats.appointmentCount) || 0),
    orderCount: Math.max(0, Number(stats.orderCount) || 0),
  };
}
