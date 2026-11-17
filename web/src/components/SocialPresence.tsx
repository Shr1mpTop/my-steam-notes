import { useMemo, useState } from "react";
import type { PresenceSegment, SocialPresenceData, SocialPresenceMember } from "../types";
import { useLocale } from "../useLocale";
import { Panel } from "./ui";

interface Props {
  presence?: SocialPresenceData;
}

const SG_TZ = "Asia/Singapore";
const HOUR = 3600_000;
const PRESETS = [
  { key: "24h", zh: "24 小时", en: "24h", ms: 24 * HOUR },
  { key: "72h", zh: "72 小时", en: "72h", ms: 72 * HOUR },
  { key: "7d", zh: "7 天", en: "7d", ms: 7 * 24 * HOUR },
] as const;

type PresetKey = (typeof PRESETS)[number]["key"];

function hashHue(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h % 360;
}

function segColor(seg: PresenceSegment) {
  const key = seg.gameid || seg.game.trim().toLowerCase() || "playing";
  return `hsl(${hashHue(key)} 70% 55%)`;
}

function fmtStamp(v: string) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toLocaleString([], { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: SG_TZ });
}

function minutesIn(seg: PresenceSegment, viewStart: number, viewEnd: number) {
  const s = new Date(seg.start).getTime();
  const e = new Date(seg.end).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e)) return 0;
  return Math.max(0, Math.min(e, viewEnd) - Math.max(s, viewStart)) / 60000;
}

function fmtDur(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h}h${m}m` : `${h}h`;
}

function cutName(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

interface Row {
  member: SocialPresenceMember;
  segments: PresenceSegment[];
  minutes: number;
}

export function SocialPresence({ presence }: Props) {
  const { t, locale } = useLocale();
  const [presetKey, setPresetKey] = useState<PresetKey>("24h");
  const [showAll, setShowAll] = useState(true);

  const view = useMemo(() => {
    if (!presence) return null;
    const end = Math.max(new Date(presence.window_end).getTime(), Date.now());
    const ws = new Date(presence.window_start).getTime();
    const preset = PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0];
    const fullStart = Number.isFinite(ws) ? ws : end - 7 * 24 * HOUR;
    const start = Math.max(fullStart, end - preset.ms);
    return { start, end, preset };
  }, [presence, presetKey]);

  const rows = useMemo<Row[]>(() => {
    if (!presence || !view) return [];
    const enriched = presence.members.map((member) => {
      const segments = member.segments.filter((s) => {
        const s0 = new Date(s.start).getTime();
        const s1 = new Date(s.end).getTime();
        return Number.isFinite(s0) && Number.isFinite(s1) && s1 > view.start && s0 < view.end;
      });
      const minutes = segments.reduce((acc, s) => acc + minutesIn(s, view.start, view.end), 0);
      return { member, segments, minutes };
    });
    const keep = showAll
      ? enriched
      : enriched.filter((x) => x.minutes > 0 || x.member.current.playing);
    const playing = keep.filter((x) => x.member.current.playing);
    const rest = keep
      .filter((x) => !x.member.current.playing)
      .sort((a, b) => b.minutes - a.minutes);
    return [...playing, ...rest];
  }, [presence, view, showAll]);

  const ticks = useMemo(() => {
    if (!view) return [];
    const span = view.end - view.start;
    const step = span <= 24 * HOUR ? 2 * HOUR : span <= 72 * HOUR ? 6 * HOUR : 24 * HOUR;
    const out: { pct: number; label: string }[] = [];
    const first = Math.ceil(view.start / step) * step;
    for (let ts = first; ts <= view.end; ts += step) {
      const d = new Date(ts);
      out.push({
        pct: ((ts - view.start) / span) * 100,
        label: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: SG_TZ }),
      });
    }
    return out;
  }, [view]);

  const nowPct = view ? ((Date.now() - view.start) / (view.end - view.start)) * 100 : 0;
  const showNow = Boolean(view && Date.now() >= view.start && Date.now() <= view.end);
  const totalMinutes = rows.reduce((acc, r) => acc + r.minutes, 0);

  return (
    <Panel
      kicker={t("kickSocial")}
      title={t("socialPresence")}
      sub={t("socialPresenceSubtitle")}
      delay={0.05}
      actions={
        <div className="presence-controls">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`presence-pill${presetKey === p.key ? " is-active" : ""}`}
              onClick={() => setPresetKey(p.key)}
              aria-pressed={presetKey === p.key}
            >
              {locale === "zh" ? p.zh : p.en}
            </button>
          ))}
          <button
            type="button"
            className={`presence-pill${showAll ? " is-active" : ""}`}
            onClick={() => setShowAll((v) => !v)}
            aria-pressed={showAll}
          >
            {showAll ? (locale === "zh" ? "全部好友" : "All friends") : locale === "zh" ? "近期活跃" : "Active only"}
          </button>
        </div>
      }
    >
      {!view || rows.length === 0 ? (
        <span className="presence-empty">{t("noDataInRange")}</span>
      ) : (
        <div className="presence-timeline">
          <div className="presence-axis">
            <span className="presence-axis-spacer" />
            <div className="presence-axis-track">
              {ticks.map((tick) => (
                <span key={tick.label} className="presence-axis-tick" style={{ left: `${tick.pct}%` }}>
                  {tick.label}
                </span>
              ))}
            </div>
            <span className="presence-axis-total dim">
              {locale === "zh" ? "合计" : "total"} {fmtDur(totalMinutes)}
            </span>
          </div>

          {rows.map(({ member, segments, minutes }) => (
            <div key={member.id} className="presence-row">
              <div className="presence-person" title={member.profileurl || undefined}>
                {member.avatarfull && <img src={member.avatarfull} alt="" />}
                <div>
                  <strong>{member.is_self ? t("me") : member.name}</strong>
                  <span>
                    {member.current.playing
                      ? `▶ ${cutName(member.current.game || `App ${member.current.gameid}`, 14)}`
                      : member.current.online
                        ? t("onlineNotPlaying")
                        : `${fmtDur(minutes)}`}
                  </span>
                </div>
              </div>
              <div className="presence-track">
                {ticks.map((tick) => (
                  <span key={`g${tick.label}`} className="presence-gridline" style={{ left: `${tick.pct}%` }} />
                ))}
                {showNow && nowPct >= 0 && nowPct <= 100 && (
                  <span className="presence-now" style={{ left: `${nowPct}%` }} title={t("now")} />
                )}
                {segments.map((seg, index) => {
                  const s0 = new Date(seg.start).getTime();
                  const s1 = new Date(seg.end).getTime();
                  const left = ((Math.max(s0, view.start) - view.start) / (view.end - view.start)) * 100;
                  const right = ((Math.min(s1, view.end) - view.start) / (view.end - view.start)) * 100;
                  const width = Math.max(0.35, right - left);
                  const mins = minutesIn(seg, view.start, view.end);
                  return (
                    <span
                      key={`${member.id}-${seg.start}-${index}`}
                      className="presence-seg"
                      style={{ left: `${left}%`, width: `${width}%`, background: segColor(seg) }}
                      title={`${seg.game || `App ${seg.gameid}`} · ${fmtStamp(seg.start)}–${fmtStamp(seg.end)} · ${fmtDur(mins)}`}
                    >
                      {mins >= 45 && width > 9 ? <em>{cutName(seg.game, 10)}</em> : null}
                    </span>
                  );
                })}
              </div>
              <span className="presence-total">{fmtDur(minutes)}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
