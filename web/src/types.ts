export interface DashboardData {
  updated_at: string;
  player: PlayerInfo;
  milestone: MilestoneData;
  game_cloud: GameCloudItem[];
  recent_activity: RecentActivityItem[];
  heatmap: Record<string, HeatmapDay>;
  time_heatmap: TimeHeatmapItem[];
  platform: Record<string, number>;
  pareto: ParetoItem[];
  weekday: WeekdayItem[];
  stats: StatsData;
  achievements: AchievementGame[];
  game_network: GameNetworkData;
  genres: GenreItem[];
  game_weather: GameWeatherData;
  weekly_digest: WeeklyDigestItem[];
  game_updates: GameUpdateItem[];
  social_presence?: SocialPresenceData;
  friends_hub?: FriendsHubData;
}

export interface PlayerInfo {
  personaname: string;
  online: boolean;
  currently_playing: string;
  level: number;
  avatarfull: string;
}

export interface MilestoneData {
  total_hours: number;
  movies: number;
  books: number;
  walking_km: number;
}

export interface GameCloudItem {
  appid: number;
  name: string;
  playtime_hours: number;
  img_icon_url: string;
  rtime_last_played: number;
  genres: string[];
}

export interface RecentActivityItem {
  appid: number;
  name: string;
  playtime_2weeks_hours: number;
  playtime_forever_hours: number;
}

export interface HeatmapDay {
  playtime_minutes?: number;
  online_minutes: number;
  games: Record<string, number>;
}

export interface TimeHeatmapItem {
  dow: number;
  hour: number;
  count: number;
  recent_count?: number;
  all_time_count?: number;
  game_minutes?: number;
  online_minutes?: number;
  games?: Record<string, number>;
}

export interface ParetoItem {
  name: string;
  hours: number;
  cumulative_pct: number;
  rank: number;
}

export interface WeekdayItem {
  day: string;
  minutes: number;
}

export interface StatsData {
  total_games: number;
  played_games: number;
  dust_rate: number;
  never_played: number;
  loyalty_score: number;
  loyalty_label: string;
  peak_day: { date: string; minutes: number } | null;
  longest_streak: { days: number; start: string | null; end: string | null };
}

export interface AchievementGame {
  appid: number;
  name: string;
  playtime_hours: number;
  total: number;
  unlocked: number;
  pct: number;
  rare: { name: string; global_pct: number }[];
}

export interface GameNetworkData {
  nodes: { appid: number; name: string; genres: string[] }[];
  links: { source: number; target: number; strength: number }[];
}

export interface GenreItem {
  genre: string;
  games: number;
  hours: number;
}

export interface GameWeatherData {
  forecast: string;
  top_game: string;
  games: { name: string; hours: number }[];
}

export interface WeeklyDigestItem {
  dates: string[];
  total_hours: number;
  games_count: number;
  top_games: string[];
}

export interface GameUpdateItem {
  appid: number;
  game_name: string;
  title: string;
  url: string;
  date: number;
  feedname: string;
  feedlabel: string;
  update_type: string;
  contents: string;
}

export interface SocialPresenceData {
  window_start: string;
  window_end: string;
  members: SocialPresenceMember[];
}

export interface SocialPresenceMember {
  id: string;
  steamid: string;
  name: string;
  avatarfull: string;
  profileurl: string;
  is_self: boolean;
  last_seen_at: string;
  current: PresenceState;
  segments: PresenceSegment[];
}

export interface PresenceState {
  timestamp: string;
  online: boolean;
  game: string;
  gameid: string;
  playing: boolean;
}

export interface PresenceSegment {
  start: string;
  end: string;
  status: "playing";
  game: string;
  gameid: string;
}

/* ---------- Friends hub — friend social analytics ---------- */

export interface FriendTopGame {
  appid: number;
  name: string;
  hours: number;
}

export interface FriendsHubFriend {
  steamid: string;
  name: string;
  avatarfull: string;
  online: boolean;
  playing: string;
  friendship_days: number | null;
  total_hours: number;
  two_week_hours: number;
  top_games: FriendTopGame[];
  library_size: number;
  visibility: "ok" | "private" | "unknown";
  last_online: number;
  level?: number | null;
  badges_count?: number | null;
  country?: string | null;
  vac_banned?: boolean;
  game_banned?: boolean;
}

export interface SharedGameFriendStat {
  name: string;
  hours: number;
  two_week_hours: number;
}

export interface SharedGameEntry {
  appid: number;
  name: string;
  my_hours: number;
  my_two_week_hours: number;
  friend_count: number;
  friend_hours_total: number;
  top_friend: SharedGameFriendStat | null;
  friends: SharedGameFriendStat[];
}

export interface LeaderboardRow {
  name: string;
  avatarfull: string;
  hours: number;
  is_self: boolean;
}

export interface MeVsThemData {
  my_total_hours: number;
  my_total_rank: number | null;
  my_two_week_hours: number;
  my_two_week_rank: number | null;
  public_friends: number;
  private_friends: number;
  avg_friend_total_hours: number;
  ranked_total: number;
}

export interface FriendPlayingNowEntry {
  name: string;
  game: string;
  avatarfull: string;
}

export interface FriendsHubData {
  updated_at: string;
  friends: FriendsHubFriend[];
  shared_games: SharedGameEntry[];
  leaderboard_total: LeaderboardRow[];
  leaderboard_2weeks: LeaderboardRow[];
  me_vs_them: MeVsThemData;
  friends_playing_now: FriendPlayingNowEntry[];
}
