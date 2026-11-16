import { useEffect, useState } from "react";
import type { DashboardData } from "../types";

const REFRESH_MS = 60_000;
// Live data served by the phone server (M11P, rebuilt every 5min / on state
// change). Falls back to the bundled build-time snapshot whenever the phone
// or the tunnel is unavailable.
const REMOTE_DASHBOARD_URL = "https://steam-data.zhili-he.top/steam/dashboard.json";
const REMOTE_TIMEOUT_MS = 5_000;
const REMOTE_COOLDOWN_MS = 10 * 60_000;

let remoteDisabledUntil = 0;

async function fetchDashboard(url: string): Promise<DashboardData> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as DashboardData;
  } finally {
    window.clearTimeout(timer);
  }
}

function localDashboardUrl() {
  return `${import.meta.env.BASE_URL}data/dashboard.json?t=${Date.now()}`;
}

async function loadDashboardData(): Promise<{ data: DashboardData; source: "live" | "snapshot" }> {
  if (Date.now() >= remoteDisabledUntil) {
    try {
      const data = await fetchDashboard(`${REMOTE_DASHBOARD_URL}?t=${Date.now()}`);
      return { data, source: "live" };
    } catch {
      remoteDisabledUntil = Date.now() + REMOTE_COOLDOWN_MS;
    }
  }
  return { data: await fetchDashboard(localDashboardUrl()), source: "snapshot" };
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"live" | "snapshot">("snapshot");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard(showLoading: boolean) {
      if (showLoading) setLoading(true);
      try {
        const { data: json, source: src } = await loadDashboardData();
        if (!cancelled) {
          setData(json);
          setSource(src);
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

  return { data, loading, error, source };
}
