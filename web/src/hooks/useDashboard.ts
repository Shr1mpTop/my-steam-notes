import { useEffect, useState } from "react";
import type { DashboardData } from "../types";

const REFRESH_MS = 60_000;

function dashboardUrl() {
  return `${import.meta.env.BASE_URL}data/dashboard.json?t=${Date.now()}`;
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard(showLoading: boolean) {
      if (showLoading) setLoading(true);
      try {
        const response = await fetch(dashboardUrl(), { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json() as DashboardData;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboard(true);
    const timer = window.setInterval(() => void loadDashboard(false), REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return { data, loading, error };
}
