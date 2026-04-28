"""Build data/dashboard.json from the latest Turso data."""
import sys

sys.path.insert(0, ".")
from scripts.poll_status import generate_dashboard, get_player_summary


def main():
    print("=== Build Dashboard ===\n")
    player = get_player_summary()
    db = generate_dashboard(player)
    print(f"  Games: {len(db['game_cloud'])} | Genres: {len(db['genres'])}")
    print(f"  Achievements: {len(db['achievements'])} games")
    print(f"  Weather: {db['game_weather']['forecast']} - {db['game_weather'].get('top_game', '')}")
    print("\n=== Done ===")


if __name__ == "__main__":
    main()
