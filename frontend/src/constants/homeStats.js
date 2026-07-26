/**
 * Display real API counts only — no artificial floors on public UI (P1-A).
 * Backend may still keep floor config for ops; frontend must not inflate numbers.
 */
export function displayHomeStats(stats = {}) {
  return {
    expertCount: Math.max(0, Number(stats.expertCount) || 0),
    productCount: Math.max(0, Number(stats.productCount) || 0),
    appointmentCount: Math.max(0, Number(stats.appointmentCount) || 0),
    orderCount: Math.max(0, Number(stats.orderCount) || 0),
  };
}
