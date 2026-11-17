
"use strict";
const API = "";
const ME_ID = "76561198367786896";
const $ = (id) => document.getElementById(id);
const fmtH = (h) => (h >= 100 ? Math.round(h) + "h" : h >= 10 ? h.toFixed(1) + "h" : h.toFixed(2) + "h");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cut = (s, n) => { s = String(s ?? ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const ts = (v) => { if (!v) return "--"; const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleTimeString([], { hour12: false }); };
const ST = { 0: "off", 1: "on", 2: "busy", 3: "away", 4: "snooze" };

function fail(el, err) { if (el) el.innerHTML = `<span class="err">ERR ${esc(err)}</span>`; }

async function get(path) {
  const r = await fetch(API + path, { cache: "no-store" });
  if (!r.ok) throw new Error(path + " -> " + r.status);
  return r.json();
}

async function loadStatus() {
  try {
    const s = await get("/api/status");
    const c = s.collector || {};
    $("hdb").textContent = (s.db_bytes / 1048576).toFixed(1) + "MB";
    const total = Object.values(s.counts || {}).reduce((a, b) => a + (b || 0), 0);
    $("hrows").textContent = total.toLocaleString();
    $("hcalls").textContent = (c.steam_calls_total ?? "--") + "";
    $("huptime").textContent = c.uptime_seconds ? Math.floor(c.uptime_seconds / 3600) + "h" + Math.floor((c.uptime_seconds % 3600) / 60) + "m" : "--";
    $("hsweep").textContent = (c.sweep_cycles ?? "--") + " cyc";
    $("hstatus").className = "blink err";
  } catch (e) { $("hstatus").className = "err"; }
}

async function loadMe() {
  try {
    const [me, st] = await Promise.all([get("/api/me"), get("/api/leaderboards")]);
    const p = me.latest_presence || {};
    $("meState").textContent = p.personastate ? (ST[p.personastate] || "?" + p.personastate) : "offline";
    $("meGame").textContent = p.gameextrainfo || "not playing";
    $("mePoll").textContent = ts(p.timestamp);
    $("meLib").textContent = (me.library_games || 0) + " games";
    $("meHours").textContent = (me.total_hours || 0).toLocaleString() + "h";
    $("me2w").textContent = (me.two_week_hours || 0) + "h";
    const mine = (st.leaderboard_total || []).find((x) => x.is_self);
    $("meRank").textContent = mine ? "#" + mine.rank + "/" + st.count : "--";
    $("hme").textContent = me.two_week_hours + "h/2w";
  } catch (e) { $("hme").textContent = "ERR"; }
}

let activeFriend = null;

async function loadFriends() {
  try {
    const d = await get("/api/friends");
    const rows = (d.friends || []).map((f, i) => {
      const playing = f.gameextrainfo && f.gameextrainfo.length > 0;
      const stc = f.personastate ? (ST[f.personastate] || "?") : "off";
      const active = activeFriend === f.steamid ? " is-active" : "";
      return `<tr class="clickable${active}" data-sid="${f.steamid}" data-name="${esc(f.personaname)}"><td class="rank">${i + 1}</td><td>${esc(cut(f.personaname, 14))}</td><td class="${playing ? "amber" : "dim"}">${playing ? "▶" : stc}</td><td class="${playing ? "" : "faint"}">${playing ? esc(cut(f.gameextrainfo, 16)) : "—"}</td><td class="num dim">${f.total_hours || 0}</td></tr>`;
    }).join("");
    $("friendsNow").innerHTML = rows || '<tr><td colspan="5" class="faint">no friend data</td></tr>';
    const playing = (d.friends || []).filter((f) => f.gameextrainfo);
    $("tickerText").textContent =
      "// LIVE " + (playing.length ? playing.map((f) => f.personaname + "▸" + f.gameextrainfo).join("  ｜  ") : "no friends in game right now") +
      "  ｜ " + (d.count || 0) + " friends tracked";
  } catch (e) { fail($("friendsNow"), e.message); }
}

$("friendsNow").addEventListener("click", (ev) => {
  const tr = ev.target.closest("tr[data-sid]");
  if (!tr) return;
  document.querySelectorAll("#friendsNow tr").forEach((r) => r.classList.remove("is-active"));
  tr.classList.add("is-active");
  loadFriendDetail(tr.dataset.sid, tr.dataset.name);
});

async function loadFriendDetail(steamid, name) {
  activeFriend = steamid;
  $("detailBody").innerHTML = '<span class="faint">loading ' + esc(name || steamid) + '…</span>';
  try {
    const d = await get("/api/friend/" + steamid);
    const live = d.live || {};
    const sweep = d.sweep || {};
    const lvl = d.level || {};
    const games = d.games || [];
    const total = sweep.status === "ok" ? fmtH(games.reduce((a, g) => a + (g.hours || 0), 0)) : "--";
    $("detailBody").innerHTML = `
      <div class="detail-head"><b>${esc(name || steamid)}</b><button class="detail-close" onclick="clearDetail()">×</button></div>
      <div class="detail-kv">
        <span>state</span><span>${live.personastate ? (ST[live.personastate] || "?") : "offline"}</span>
        <span>game</span><span>${esc(live.gameextrainfo || "—")}</span>
        <span>visibility</span><span>${esc(sweep.status || "?")}</span>
        <span>level</span><span>${lvl.player_level ? "lvl " + lvl.player_level + " · " + (lvl.player_xp || 0) + " xp · " + (lvl.badges_count || 0) + " badges" : "—"}</span>
        <span>country</span><span>${esc(live.loccountrycode || "—")}</span>
        <span>library</span><span>${sweep.game_count || 0} games · ${total}</span>
        <span>shared w/ me</span><span>${d.shared_count} games</span>
      </div>
      <div class="detail-games">
        <table><thead><tr><th>game</th><th class="num">them</th><th class="num">me</th></tr></thead><tbody>
        ${games.slice(0, 30).map((g) => `<tr><td>${esc(cut(g.name, 20))}</td><td class="num">${g.hours}</td><td class="num ${g.shared ? "amber" : "faint"}">${g.shared ? g.my_hours : "—"}</td></tr>`).join("")}
        </tbody></table>
      </div>`;
  } catch (e) {
    $("detailBody").innerHTML = `<span class="err">ERR ${esc(e.message)}</span>`;
  }
}

function clearDetail() {
  activeFriend = null;
  document.querySelectorAll("#friendsNow tr").forEach((r) => r.classList.remove("is-active"));
  $("detailBody").innerHTML = '<span class="faint">click a friend row ↑</span>';
}

async function loadLeaderboard() {
  try {
    const d = await get("/api/leaderboards");
    const rows = (d.leaderboard_total || []).map((r) =>
      `<tr class="${r.is_self ? "self" : ""}"><td class="rank">#${r.rank}</td><td>${r.is_self ? "<b>ME</b>" : esc(cut(r.name, 16))}</td><td class="num">${r.hours.toLocaleString()}h</td><td class="num dim">${r.two_week_hours}h</td></tr>`).join("");
    $("leaderboard").innerHTML = rows || '<tr><td colspan="4" class="faint">waiting for sweeps</td></tr>';
  } catch (e) { fail($("leaderboard"), e.message); }
}

async function loadShared() {
  try {
    const d = await get("/api/shared?limit=24");
    const max = Math.max(...(d.shared_games || []).map((g) => Math.max(g.my_hours, g.friend_hours_total)), 1);
    $("sharedBars").innerHTML = (d.shared_games || []).map((g) =>
      `<div class="bar-row" title="${esc(g.name)} — me ${g.my_hours}h / friends ${g.friend_hours_total}h (${g.friend_count} ppl)">
         <span class="faint">${esc(cut(g.name, 20))}</span>
         <div class="bar-track"><div class="bar-fill me" style="width:${(g.my_hours / max) * 100}%"></div><div class="bar-fill" style="width:${(g.friend_hours_total / max) * 100}%; top:50%; height:3px"></div></div>
         <span class="dim num">${Math.round(g.friend_hours_total)}h/${g.friend_count}p</span>
       </div>`).join("") || '<span class="faint">no shared games</span>';
  } catch (e) { fail($("sharedBars"), e.message); }
}

async function loadSweeps() {
  try {
    const d = await get("/api/sweeps");
    const rows = (d.sweeps || []).map((s) =>
      `<tr><td>${esc(cut(s.name, 14))}</td><td class="${s.status === "ok" ? "dim" : "amber"}">${s.status}</td><td class="num dim">${s.game_count || 0}</td><td class="num">${s.total_hours || 0}</td></tr>`).join("");
    $("sweeps").innerHTML = rows || '<tr><td colspan="4" class="faint">no sweeps</td></tr>';
  } catch (e) { fail($("sweeps"), e.message); }
}

async function loadMyGames() {
  try {
    const d = await get("/api/games?limit=40");
    $("myGames").innerHTML = (d.games || []).map((g) =>
      `<tr><td>${esc(cut(g.name, 22))}</td><td class="num">${g.hours}</td></tr>`).join("");
  } catch (e) { fail($("myGames"), e.message); }
}

async function loadRecent2w() {
  try {
    const d = await get("/api/recent-2week");
    $("recent2w").innerHTML = (d.recent || []).map((g) =>
      `<tr><td>${esc(cut(g.name, 22))}</td><td class="num">${g.hours_2w}</td><td class="num dim">${g.hours_total}</td></tr>`).join("") || '<tr><td colspan="3" class="faint">no recent sessions</td></tr>';
  } catch (e) { fail($("recent2w"), e.message); }
}

async function loadPollStream() {
  try {
    const d = await get("/api/polls?limit=30");
    $("pollStream").innerHTML = (d.polls || []).map((p) =>
      `<tr><td class="faint">${ts(p.timestamp)}</td><td class="${p.personastate ? "amber" : "dim"}">${p.personastate ? "on" : "off"}</td><td>${esc(cut(p.gameextrainfo || "—", 18))}</td></tr>`).join("");
  } catch (e) { fail($("pollStream"), e.message); }
}

async function loadFriendPollStream() {
  try {
    const d = await get("/api/friend-polls?limit=30");
    $("friendPollStream").innerHTML = (d.friend_polls || []).map((p) =>
      `<tr><td class="faint">${ts(p.timestamp)}</td><td>${esc(cut(p.personaname, 12))}</td><td class="dim">${esc(cut(p.gameextrainfo || "—", 16))}</td></tr>`).join("");
  } catch (e) { fail($("friendPollStream"), e.message); }
}

async function loadStats() {
  try {
    const d = await get("/api/stats");
    $("tableStats").innerHTML = Object.entries(d.tables || {}).sort().map(([t, n]) =>
      `<span>${t}</span><span class="num ${n === null ? "red" : ""}">${n === null ? "missing" : n.toLocaleString()}</span>`).join("");
  } catch (e) { fail($("tableStats"), e.message); }
}

async function loadNews() {
  try {
    const d = await get("/api/news?limit=8");
    $("news").innerHTML = (d.news || []).slice(0, 8).map((n) =>
      `<div class="row"><span>${esc(cut(n.title || "", 46))}</span><span class="faint">${esc(cut(n.game_name || "", 14))}</span></div>`).join("") || '<span class="faint">no news yet</span>';
  } catch (e) { fail($("news"), e.message); }
}

async function loadAchieveLadder() {
  try {
    const d = await get("/api/achieve-compare");
    if (!d.game) { $("achieveLadder").innerHTML = '<span class="faint">no shared games with sweeps yet</span>'; return; }
    const ladder = d.ladder || [];
    const total = ladder[0]?.total || 1;
    const rows = ladder.map((r) =>
      `<div class="bar-row${r.is_self ? " bar-row-me" : ""}" title="${esc(r.name)} — ${r.achieved}/${r.total}">
         <span class="faint">${esc(cut(r.name, 14))}</span>
         <div class="bar-track"><div class="bar-fill${r.is_self ? " me" : ""}" style="width:${(r.achieved / total) * 100}%"></div></div>
         <span class="dim num">${Math.round((r.achieved / total) * 100)}%</span>
       </div>`).join("");
    const head = `<div class="row"><span class="amber">${esc(cut(d.game, 24))}</span><span class="faint">${total} ach</span></div><div style="height:3px"></div>`;
    $("achieveLadder").innerHTML = head + rows;
  } catch (e) { fail($("achieveLadder"), e.message); }
}

async function loadHotWeek() {
  try {
    const d = await get("/api/hot-week?limit=12");
    const max = Math.max(...(d.hot_games || []).map((g) => g.week_hours || 0), 1);
    $("hotWeek").innerHTML = (d.hot_games || []).map((g) =>
      `<div class="bar-row" title="${esc(g.name)} — ${g.week_hours}h this week, ${g.players} players">
         <span class="faint">${esc(cut(g.name, 20))}</span>
         <div class="bar-track"><div class="bar-fill" style="width:${((g.week_hours || 0) / max) * 100}%"></div></div>
         <span class="dim num">${g.week_hours}h</span>
       </div>`).join("") || '<span class="faint">no 2-week play recorded yet</span>';
  } catch (e) { fail($("hotWeek"), e.message); }
}

async function loadPresenceLeaders() {
  try {
    const d = await get("/api/presence-today");
    const rows = (d.today || []).slice(0, 12).map((r, i) =>
      `<tr class="${r.name === "ME" ? "self" : ""}"><td class="rank">${i + 1}</td><td>${esc(cut(r.name, 14))}</td><td class="num">${fmtH(r.hours)}</td><td class="dim">${esc(cut(r.game || "—", 12))}</td></tr>`).join("");
    const meMin = d.me_minutes || 0;
    const meRow = `<tr class="self"><td class="rank">—</td><td><b>ME</b></td><td class="num">${meMin}m</td><td class="dim">today</td></tr>`;
    $("presenceLeaders").innerHTML = meRow + rows;
  } catch (e) { fail($("presenceLeaders"), e.message); }
}

async function loadHourly() {
  try {
    const d = await get("/api/hourly");
    const b = d.hourly_minutes || {};
    const max = Math.max(...Object.values(b), 1);
    $("hourHeat").innerHTML = Object.keys(b).map((h) =>
      `<div class="hcol"><span class="hval">${b[h] >= 3600 ? Math.round(b[h] / 3600) + "k" : Math.round(b[h] / 60) + "m"}</span><div class="hbar" style="height:${Math.max(2, (b[h] / max) * 78)}px"></div><span class="hlab">${h}</span></div>`).join("");
  } catch (e) { fail($("hourHeat"), e.message); }
}

async function loadNightOwls() {
  try {
    const d = await get("/api/night-owls?limit=10");
    const rows = (d.night_owls || []).map((r, i) =>
      `<tr><td class="rank">${i + 1}</td><td>${esc(cut(r.name, 16))}</td><td class="num">${r.night_hours}h</td></tr>`).join("");
    $("nightOwls").innerHTML = rows || '<tr><td colspan="3" class="faint">nobody plays at night (yet)</td></tr>';
  } catch (e) { fail($("nightOwls"), e.message); }
}

async function loadPresenceDaily() {
  try {
    const [d, st] = await Promise.all([get("/api/presence-daily?days=14"), get("/api/presence-today")]);
    const meMap = {};
    (d.me_daily || []).forEach((r) => { meMap[r.d] = r.my_online_hours; });
    meMap[new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" })] = st.me_minutes / 60;
    $("presenceDaily").innerHTML = (d.daily || []).slice(-14).map((r) => {
      const mine = meMap[r.d];
      const mineTxt = mine !== undefined ? ` · me ${mine.toFixed(1)}h` : "";
      return `<div class="day-cell"><div class="d">${esc(cut(r.d || "", 10))}${mineTxt}</div><div class="v">${r.online_hours}h</div><div class="p">${r.friends_active} friends</div></div>`;
    }).join("") || '<span class="faint">no daily data yet</span>';
  } catch (e) { fail($("presenceDaily"), e.message); }
}

async function loadLevels() {
  try {
    const d = await get("/api/levels");
    const rows = (d.levels || []).slice(0, 20).map((r, i) =>
      `<tr class="${r.steamid === ME_ID ? "self" : ""}"><td class="rank">${i + 1}</td><td>${esc(cut(r.name, 16))}</td><td class="num">${r.player_level}</td><td class="num dim">${(r.player_xp || 0).toLocaleString()}</td></tr>`).join("");
    $("levels").innerHTML = (d.my_level !== null && d.my_level !== undefined ? `<tr class="self"><td class="rank">—</td><td><b>ME</b></td><td class="num">${d.my_level}</td><td class="num dim">—</td></tr>` : "") + rows;
  } catch (e) { fail($("levels"), e.message); }
}

async function loadBans() {
  try {
    const d = await get("/api/bans");
    const flagged = d.flagged_friends || [];
    const head = `<div class="row"><span>checked</span><span>${d.checked}</span></div><div class="row"><span class="amber">flagged</span><span class="${flagged.length ? "amber" : "dim"}">${d.flagged}</span></div><div style="height:3px"></div>`;
    const rows = flagged.length
      ? flagged.map((r) => `<div class="row"><span>${esc(cut(r.name, 16))}</span><span class="red">${r.vac_banned ? "VAC×" + r.num_vac_bans : ""}${r.num_game_bans ? " game×" + r.num_game_bans : ""}${r.community_banned ? " community" : ""} · ${r.days_since_last_ban}d</span></div>`).join("")
      : '<div class="row faint">all clean — no bans in friend list</div>';
    $("bans").innerHTML = head + rows;
  } catch (e) { fail($("bans"), e.message); }
}

async function loadConcurrent() {
  try {
    const d = await get("/api/concurrent");
    const rows = d.concurrent || [];
    const max = Math.max(...rows.map((r) => r.player_count || 0), 1);
    $("concurrent").innerHTML = rows.map((r) =>
      `<div class="bar-row" title="${esc(r.name)}">
         <span class="faint">${esc(cut(r.name, 20))}</span>
         <div class="bar-track"><div class="bar-fill" style="width:${((r.player_count || 0) / max) * 100}%"></div></div>
         <span class="dim num">${(r.player_count || 0).toLocaleString()}</span>
       </div>`).join("") || '<span class="faint">no concurrent samples yet</span>';
  } catch (e) { fail($("concurrent"), e.message); }
}

async function loadCountries() {
  try {
    const d = await get("/api/countries");
    const rows = d.countries || [];
    const max = Math.max(...rows.map((r) => r.friends), 1);
    $("countries").innerHTML = rows.slice(0, 12).map((r) =>
      `<div class="bar-row"><span class="faint">${esc(r.cc)}</span>
         <div class="bar-track"><div class="bar-fill" style="width:${(r.friends / max) * 100}%"></div></div>
         <span class="dim num">${r.friends}</span></div>`).join("");
  } catch (e) { fail($("countries"), e.message); }
}

async function loadRecords() {
  try {
    const d = await get("/api/records");
    const kv = [];
    if (d.most_hours) kv.push(["most hours", `${esc(cut(d.most_hours.name, 12))} ${d.most_hours.hours.toFixed(0)}h`]);
    if (d.biggest_library) kv.push(["biggest library", `${esc(cut(d.biggest_library.name, 12))} ${d.biggest_library.game_count} games`]);
    if (d.oldest_friendship) kv.push(["oldest friendship", `${esc(cut(d.oldest_friendship.name, 12))} ${d.oldest_friendship.days}d`]);
    if (d.top_night_owl && d.top_night_owl.name) kv.push(["top night owl", `${esc(cut(d.top_night_owl.name, 12))} ${d.top_night_owl.night_hours}h`]);
    if (d.hot_game_this_week && d.hot_game_this_week.name) kv.push(["hot this week", `${esc(cut(d.hot_game_this_week.name, 16))} ${d.hot_game_this_week.week_hours}h`]);
    if (d.highest_level) kv.push(["highest level", `${esc(cut(d.highest_level.name, 12))} lvl ${d.highest_level.player_level}`]);
    $("records").innerHTML = kv.map(([k, v]) => `<span>${k}</span><span class="dim">${v}</span>`).join("") || '<span class="faint">no records yet</span>';
  } catch (e) { fail($("records"), e.message); }
}

function every(ms, fn) { fn(); setInterval(fn, ms); }
every(15000, loadStatus);
every(15000, loadMe);
every(15000, loadFriends);
every(15000, loadPollStream);
every(15000, loadFriendPollStream);
every(60000, loadLeaderboard);
every(300000, loadAchieveLadder);
every(300000, loadHotWeek);
every(60000, loadPresenceLeaders);
every(600000, loadHourly);
every(600000, loadNightOwls);
every(300000, loadPresenceDaily);
every(600000, loadRecords);
every(60000, loadShared);
every(60000, loadSweeps);
every(60000, loadMyGames);
every(300000, loadRecent2w);
every(300000, loadConcurrent);
every(1800000, loadCountries);
every(300000, loadLevels);
every(1200000, loadBans);
every(60000, loadStats);
every(60000, loadNews);
setInterval(() => { $("clock").textContent = new Date().toLocaleTimeString([], { hour12: false }); }, 1000);
$("clock").textContent = new Date().toLocaleTimeString([], { hour12: false });
