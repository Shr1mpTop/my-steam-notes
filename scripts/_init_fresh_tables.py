import os, sys
os.environ["STEAM_DB_MODE"] = "local"
os.environ["STEAM_DB_PATH"] = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "fresh.db"))
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "phone", "steam-collector"))
import steam_collector as sc
sc.init_db()
for s in sc.SOCIAL_SCHEMA:
    sc.execute(s)
print("social tables created OK")
