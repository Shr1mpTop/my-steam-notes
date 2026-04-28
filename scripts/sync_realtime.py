"""Refresh lightweight Steam data for near-realtime dashboard builds."""
import sys

sys.path.insert(0, ".")
from scripts.sync_turso import TODAY, sync_owned_games, sync_recent_sessions


def main():
    print(f"=== Realtime Steam Sync {TODAY} ===\n")
    sync_owned_games()
    sync_recent_sessions()
    print("\n=== Realtime sync complete ===")


if __name__ == "__main__":
    main()
