/** Must match backend DEFAULT_SETTINGS.homeStatsFloor — web + mobile fallback if API is stale */
export const HOME_STATS_FLOOR = {
  expertCount: 50,
  productCount: 120,
  appointmentCount: 1000,
};

export function displayHomeStats(stats?: {
  expertCount?: number;
  productCount?: number;
  appointmentCount?: number;
  orderCount?: number;
} | null) {
  return {
    expertCount: Math.max(Number(stats?.expertCount) || 0, HOME_STATS_FLOOR.expertCount),
    productCount: Math.max(Number(stats?.productCount) || 0, HOME_STATS_FLOOR.productCount),
    appointmentCount: Math.max(
      Number(stats?.appointmentCount) || 0,
      HOME_STATS_FLOOR.appointmentCount
    ),
    orderCount: Number(stats?.orderCount) || 0,
  };
}
