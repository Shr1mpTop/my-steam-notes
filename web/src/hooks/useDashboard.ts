import { useEffect, useState } from "react";
import type { DashboardData } from "../types";

const REFRESH_MS = 60_000;
// Live data served by the phone server (M11P, rebuilt every 5min / on state
// change). Falls back to the bundled build-time snapshot whenever the phone
// or the tunnel is unavailable.
const REMOTE_DASHBOARD_URL = "https://steam-data.zhili-he.top/steam/dashboard.json";
const REMOTE_TIMEOUT_MS = 12_000;
const LOCAL_TIMEOUT_MS = 20_000;
const REMOTE_COOLDOWN_MS = 10 * 60_000;

// On the phone site (/app/) the "remote" endpoint serves the very same live
// file — skip the detour and load the same-origin copy directly.
const SAME_ORIGIN_LIVE =
  typeof location !== "undefined" && location.hostname === "steam.zhili-he.top";

let remoteDisabledUntil = 0;

async function fetchDashboard(url: string, timeoutMs = REMOTE_TIMEOUT_MS): Promise<DashboardData> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as DashboardData;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw new Error("timeout");
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

function localDashboardUrl() {
  return `${import.meta.env.BASE_URL}data/dashboard.json?t=${Date.now()}`;
}

async function loadDashboardData(): Promise<{ data: DashboardData; source: "live" | "snapshot" }> {
  if (!SAME_ORIGIN_LIVE && Date.now() >= remoteDisabledUntil) {
    try {
      const data = await fetchDashboard(`${REMOTE_DASHBOARD_URL}?t=${Date.now()}`);
      return { data, source: "live" };
    } catch {
      remoteDisabledUntil = Date.now() + REMOTE_COOLDOWN_MS;
    }
  }
  return { data: await fetchDashboard(localDashboardUrl(), LOCAL_TIMEOUT_MS), source: "snapshot" };
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
