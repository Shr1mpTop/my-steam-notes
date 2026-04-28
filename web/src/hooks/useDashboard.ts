import type { DashboardData } from "../types";
import dashboard from "../../../data/dashboard.json";

export function useDashboard() {
  return { data: dashboard as DashboardData, loading: false, error: null };
}
