#!/usr/bin/env python3
"""Nightly snapshot of the live steam.db into /sdcard (backup-guardian pulls it).

Uses sqlite3's online backup API (safe against a live WAL writer).
Keeps the last KEEP dated snapshots and one rolling steam-backup.db.
"""
import datetime
import glob
import os
import sqlite3

SRC = os.getenv("STEAM_DB_PATH", "/root/steam-notes/data/steam.db")
BACKUP_DIR = os.getenv("BACKUP_DIR", "/sdcard/steam-notes")
KEEP = 7

os.makedirs(BACKUP_DIR, exist_ok=True)
today = datetime.datetime.now().strftime("%Y%m%d")
rolling = os.path.join(BACKUP_DIR, "steam-backup.db")
dated = os.path.join(BACKUP_DIR, f"steam-backup-{today}.db")

src = sqlite3.connect(SRC)
dst = sqlite3.connect(rolling)
src.backup(dst)
dst.close()
src.close()
print(f"snapshot -> {rolling} ({os.path.getsize(rolling)} bytes)")

# dated copy (hardlink-adjacent: just copy the fresh rolling file)
if os.path.exists(dated):
    os.remove(dated)
os.replace(rolling, rolling)  # no-op sanity
import shutil
shutil.copyfile(rolling, os.path.join(BACKUP_DIR, f".tmp-{today}.db"))
os.rename(os.path.join(BACKUP_DIR, f".tmp-{today}.db"), dated)

# prune old dated snapshots
old = sorted(glob.glob(os.path.join(BACKUP_DIR, "steam-backup-*.db")))
for path in old[:-KEEP]:
    os.remove(path)
    print("pruned", path)
print("kept:", len(old[-KEEP:]), "dated snapshots")
