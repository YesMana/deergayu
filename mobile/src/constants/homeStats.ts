/** Real API counts only — no artificial floors on public UI (P1-A). */
export function displayHomeStats(stats?: {
  expertCount?: number;
  productCount?: number;
  appointmentCount?: number;
  orderCount?: number;
}) {
  return {
    expertCount: Math.max(Number(stats?.expertCount) || 0, 0),
    productCount: Math.max(Number(stats?.productCount) || 0, 0),
    appointmentCount: Math.max(Number(stats?.appointmentCount) || 0, 0),
    orderCount: Math.max(Number(stats?.orderCount) || 0, 0),
  };
}
