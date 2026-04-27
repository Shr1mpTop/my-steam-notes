"""Turso HTTP API client."""
import os
import requests as http_requests
from dotenv import load_dotenv

load_dotenv()

TURSO_URL = os.getenv("TURSO_URL").replace("libsql://", "https://")
TURSO_TOKEN = os.getenv("TURSO_TOKEN")

HEADERS = {
    "Authorization": f"Bearer {TURSO_TOKEN}",
    "Content-Type": "application/json",
}


def _fmt_arg(val):
    """Format a Python value into a libsql pipeline API arg object."""
    if val is None:
        return {"type": "null"}
    if isinstance(val, int):
        return {"type": "integer", "value": str(val)}
    if isinstance(val, float):
        return {"type": "float", "value": str(val)}
    return {"type": "text", "value": str(val)}


def execute(sql: str, args=None):
    """Execute a single SQL statement. Returns list of rows as dicts."""
    stmt = {"sql": sql}
    if args:
        stmt["args"] = [_fmt_arg(a) for a in args]
    resp = http_requests.post(
        f"{TURSO_URL}/v2/pipeline",
        headers=HEADERS,
        json={"requests": [{"type": "execute", "stmt": stmt}, {"type": "close"}]},
        timeout=30,
    )
    if not resp.ok:
        print(f"Turso error {resp.status_code}: {resp.text[:500]}")
    resp.raise_for_status()
    results = resp.json()["results"]
    for r in results:
        if r["type"] == "ok" and r["response"]["type"] == "execute":
            result = r["response"]["result"]
            cols = [c["name"] for c in result["cols"]]
            rows = []
            for row in result["rows"]:
                values = []
                for cell in row:
                    if cell["type"] == "null":
                        values.append(None)
                    elif cell["type"] == "integer":
                        values.append(int(cell["value"]))
                    else:
                        values.append(cell["value"])
                rows.append(dict(zip(cols, values)))
            return rows
    return []


def execute_many(sql: str, args_list: list):
    """Execute multiple statements with different args in one batch."""
    requests_list = []
    for args in args_list:
        requests_list.append({
            "type": "execute",
            "stmt": {"sql": sql, "args": [_fmt_arg(a) for a in args]},
        })
    requests_list.append({"type": "close"})

    resp = http_requests.post(
        f"{TURSO_URL}/v2/pipeline",
        headers=HEADERS,
        json={"requests": requests_list},
        timeout=60,
    )
    if not resp.ok:
        print(f"Turso error {resp.status_code}: {resp.text[:500]}")
    resp.raise_for_status()
    return resp.json()["results"]
