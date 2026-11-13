"""Tests for DEV-005 sync batching (scripts/sync_batch.py + sync_turso.py + sync_enrichment.py).

Run (from anywhere):
    python scripts/test_sync_batch.py
    python -m unittest scripts.test_sync_batch -v

Deterministic: run it 5 consecutive times, all green.
    python scripts/test_sync_batch.py   # x5

Everything external is mocked -- there is NO real network traffic and NO real
Turso connection:
  - HTTP layer: requests.get is replaced by an HttpRouter returning FakeResponse
    objects (200 ok / 200 empty / 429 / 500 / 404 / invalid JSON) or raising
    requests exceptions (timeout, connection error). The scripts use `requests`
    (verified: `import requests` in sync_turso.py / sync_enrichment.py /
    turso_db.py), so the mock targets `requests.get`.
  - DB layer: turso_db.execute / execute_many are patched in each sync script's
    namespace with an in-memory FakeDB (selectable rows, injectable errors).
"""
import contextlib
import io
import json
import os
import re
import shutil
import sys
import tempfile
import unittest
from datetime import datetime, timedelta
from unittest import mock

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import requests  # noqa: E402  (only for exception types; nothing real is sent)

from scripts import sync_enrichment, sync_batch, sync_turso  # noqa: E402
from scripts.sync_batch import (  # noqa: E402
    STATUS_EMPTY,
    STATUS_FAILED,
    STATUS_RETRY,
    STATUS_SUCCESS,
    PermanentFetchError,
    SyncBatch,
    TransientFetchError,
    fetch_json,
    run_item,
    validate_payload,
)

BATCH_ID_RE = re.compile(r"^\d{8}T\d{6}-[0-9a-f]{6}$")


# ---------------------------------------------------------------------------
# fakes
# ---------------------------------------------------------------------------

class FakeResponse:
    """Minimal stand-in for requests.Response."""

    def __init__(self, status_code=200, payload=None, json_error=None):
        self.status_code = status_code
        self._payload = payload
        self._json_error = json_error

    def json(self):
        if self._json_error is not None:
            raise ValueError(f"invalid json: {self._json_error}")
        return self._payload


class HttpRouter:
    """requests.get replacement: routes URL substrings to canned responses.

    Route values: FakeResponse, an Exception (raised), or a list of those
    (consumed in order; the last element repeats). Any unmatched URL raises
    AssertionError, so tests fail loudly if code fetches something unexpected.
    """

    def __init__(self, routes):
        self.routes = routes
        self.calls = []

    def __call__(self, url, params=None, timeout=None):
        self.calls.append(url)
        for key, seq in self.routes.items():
            if key in url:
                if isinstance(seq, list):
                    item = seq.pop(0) if len(seq) > 1 else seq[0]
                else:
                    item = seq
                if isinstance(item, Exception):
                    raise item
                return item
        raise AssertionError(f"unexpected URL fetched: {url}")

    def count(self, key):
        return sum(1 for url in self.calls if key in url)


class FakeDB:
    """turso_db.execute / execute_many replacement with injectable behavior."""

    def __init__(self):
        self.execute_calls = []
        self.many_calls = []
        self.select_results = {}  # sql substring -> rows (first match wins)
        self.error_on = None      # raise when sql contains this substring
        self.error = RuntimeError("Turso pipeline down")

    def execute(self, sql, args=None):
        self.execute_calls.append((sql, args))
        if self.error_on and self.error_on in sql:
            raise self.error
        for key, rows in self.select_results.items():
            if key in sql:
                return rows
        return []

    def execute_many(self, sql, args_list):
        self.many_calls.append((sql, args_list))
        if self.error_on and self.error_on in sql:
            raise self.error


# Steam payloads used across tests
PLAYER_OK = {"response": {"players": [{"personaname": "tester", "personastate": 0}]}}
PLAYER_MISSING = {"response": {}}  # response.players missing -> schema failure
OWNED_OK = {"response": {"games": [{"appid": 570, "name": "Dota 2", "playtime_forever": 100}]}}
RECENT_OK = {"response": {"games": [{"appid": 570, "name": "Dota 2", "playtime_2weeks": 5}]}}
LEVEL_OK = {"response": {"player_level": 42}}
STORE_OK = {"570": {"success": True, "data": {
    "name": "Dota 2", "type": "game", "header_image": "h.png",
    "genres": [{"description": "Action"}], "categories": [],
    "price_overview": {"final": 100},
}}}
PACH_OK = {"playerstats": {"achievements": [{"apiname": "ACH_1", "achieved": 1, "unlocktime": 0}]}}
GACH_OK = {"achievementpercentages": {"achievements": [{"name": "ACH_1", "percent": 55.5}]}}


# ---------------------------------------------------------------------------
# shared plumbing
# ---------------------------------------------------------------------------

class BatchTestCase(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.mkdtemp(prefix="syncbatch-test-")
        self.addCleanup(shutil.rmtree, tmp, ignore_errors=True)
        self.state_dir = os.path.join(tmp, "state")

        # No real sleeping anywhere (backoff + Steam rate-limit pauses).
        sleeper = mock.patch("time.sleep", lambda seconds: None)
        sleeper.start()
        self.addCleanup(sleeper.stop)

        # DB layer mocked in each script's namespace.
        self.db = FakeDB()
        for mod in (sync_turso, sync_enrichment):
            p1 = mock.patch.object(mod, "execute", new=self.db.execute)
            p1.start()
            self.addCleanup(p1.stop)
            p2 = mock.patch.object(mod, "execute_many", new=self.db.execute_many)
            p2.start()
            self.addCleanup(p2.stop)

    def checkpoint(self, scope="sync_turso"):
        with open(os.path.join(self.state_dir, f"{scope}.json"), encoding="utf-8") as fh:
            return json.load(fh)

    def save_checkpoint(self, ck, scope="sync_turso"):
        with open(os.path.join(self.state_dir, f"{scope}.json"), "w", encoding="utf-8") as fh:
            json.dump(ck, fh, ensure_ascii=False, indent=2)

    def report_files(self, scope="sync_turso"):
        rdir = os.path.join(self.state_dir, "reports")
        if not os.path.isdir(rdir):
            return []
        return sorted(name for name in os.listdir(rdir) if name.startswith(scope))


# ---------------------------------------------------------------------------
# 1) HTTP response classification (mocked HTTP layer, unit level)
# ---------------------------------------------------------------------------

UNIT_SCHEMA = {"required": ["response"], "list": "response.items", "list_optional": False}


class ResponseClassificationTest(BatchTestCase):
    def _run_unit_item(self, responses, schema=None, max_attempts=3, process_fn=None):
        if not isinstance(responses, list):
            responses = [responses]
        calls = []

        def get(url, params=None, timeout=None):
            calls.append(url)
            item = responses.pop(0) if len(responses) > 1 else responses[0]
            if isinstance(item, Exception):
                raise item
            return item

        batch = SyncBatch.ephemeral("unit")
        sleeps = []

        def process():
            if process_fn is not None:
                return process_fn()
            data, kind = fetch_json(get, "https://example.test/item", schema=schema or UNIT_SCHEMA)
            if kind == STATUS_EMPTY:
                return (STATUS_EMPTY, "empty payload")
            return (STATUS_SUCCESS, "ok note")

        status = run_item(batch, "unit-item", process,
                          max_attempts=max_attempts, sleep_fn=lambda s: sleeps.append(s))
        return status, batch.items["unit-item"], len(calls), sleeps

    def test_200_ok_classified_success(self):
        status, rec, calls, sleeps = self._run_unit_item(FakeResponse(200, {"response": {"items": [1, 2]}}))
        self.assertEqual(status, STATUS_SUCCESS)
        self.assertEqual(rec["status"], STATUS_SUCCESS)
        self.assertEqual(rec["http_status"], 200)
        self.assertEqual(rec["attempts"], 1)
        self.assertIsNone(rec["last_error"])
        self.assertEqual((calls, sleeps), (1, []))

    def test_200_empty_list_classified_empty(self):
        status, rec, calls, _ = self._run_unit_item(FakeResponse(200, {"response": {"items": []}}))
        self.assertEqual(status, STATUS_EMPTY)
        self.assertEqual(rec["http_status"], 200)
        self.assertEqual(calls, 1)

    def test_429_parks_item_as_retry_after_backoff(self):
        status, rec, calls, sleeps = self._run_unit_item(FakeResponse(429, {"response": {}}))
        self.assertEqual(status, STATUS_RETRY)
        self.assertEqual(rec["attempts"], 3)
        self.assertEqual(rec["http_status"], 429)
        self.assertIn("HTTP 429", rec["last_error"])
        self.assertEqual((calls, sleeps), (3, [2, 4]))  # exponential backoff 2s, 4s

    def test_500_is_transient_retry(self):
        status, rec, calls, _ = self._run_unit_item(FakeResponse(500, {"response": {}}))
        self.assertEqual(status, STATUS_RETRY)
        self.assertEqual(rec["http_status"], 500)
        self.assertEqual(calls, 3)

    def test_timeout_is_transient_retry(self):
        err = requests.exceptions.ReadTimeout("read timed out")
        status, rec, calls, _ = self._run_unit_item(err)
        self.assertEqual(status, STATUS_RETRY)
        self.assertIn("timeout", rec["last_error"].lower())
        self.assertIsNone(rec["http_status"])
        self.assertEqual(calls, 3)

    def test_connection_error_is_transient_retry(self):
        status, _rec, _calls, _ = self._run_unit_item(
            requests.exceptions.ConnectionError("connection refused"))
        self.assertEqual(status, STATUS_RETRY)

    def test_bad_json_is_permanent_failure(self):
        status, rec, calls, _ = self._run_unit_item(FakeResponse(200, json_error="<html>"))
        self.assertEqual(status, STATUS_FAILED)
        self.assertIn("invalid JSON", rec["last_error"])
        self.assertEqual(rec["attempts"], 1)  # no retry for permanent errors
        self.assertEqual(calls, 1)

    def test_schema_missing_field_is_permanent_failure(self):
        status, rec, _calls, _ = self._run_unit_item(FakeResponse(200, {"response": {}}))
        self.assertEqual(status, STATUS_FAILED)
        self.assertIn("missing field: response.items", rec["last_error"])

    def test_404_is_permanent_failure(self):
        status, rec, _calls, _ = self._run_unit_item(FakeResponse(404, {"response": {}}))
        self.assertEqual(status, STATUS_FAILED)
        self.assertEqual(rec["http_status"], 404)

    def test_transient_then_success_recovers(self):
        seq = [FakeResponse(429, {"response": {}}), FakeResponse(200, {"response": {"items": [1]}})]
        status, rec, calls, sleeps = self._run_unit_item(seq)
        self.assertEqual(status, STATUS_SUCCESS)
        self.assertEqual(rec["attempts"], 2)
        self.assertEqual((calls, sleeps), (2, [2]))

    def test_db_write_exception_fails_item_and_is_not_swallowed(self):
        def process():
            raise RuntimeError("Turso pipeline down")

        status, rec, _calls, _ = self._run_unit_item(FakeResponse(200, {"response": {"items": [1]}}),
                                                     process_fn=process)
        self.assertEqual(status, STATUS_FAILED)
        self.assertIn("RuntimeError: Turso pipeline down", rec["last_error"])
        self.assertIsNone(rec["http_status"])

    def test_invalid_process_outcome_fails_item(self):
        status, rec, _calls, _ = self._run_unit_item(
            FakeResponse(200, {"response": {"items": [1]}}), process_fn=lambda: "weird")
        self.assertEqual(status, STATUS_FAILED)
        self.assertIn("invalid outcome", rec["last_error"])


class ValidatePayloadTest(unittest.TestCase):
    def test_top_level_not_object(self):
        kind, err = validate_payload([1, 2], {"required": ["response"]})
        self.assertEqual((kind, "invalid" == kind, bool(err)), ("invalid", True, True))

    def test_required_missing_names_the_field(self):
        kind, err = validate_payload({"response": {}}, {"required": ["response.players"]})
        self.assertEqual(kind, "invalid")
        self.assertEqual(err, "missing field: response.players")

    def test_truthy_empty_false_means_empty(self):
        kind, err = validate_payload({"570": {"success": False}}, {"truthy_empty": ["570.success"]})
        self.assertEqual(kind, "empty")
        self.assertIn("570.success", err)

    def test_truthy_empty_missing_means_invalid(self):
        kind, _err = validate_payload({"570": {}}, {"truthy_empty": ["570.success"]})
        self.assertEqual(kind, "invalid")

    def test_store_missing_data_is_invalid(self):
        schema = sync_enrichment.store_schema(570)
        kind, err = validate_payload({"570": {"success": True}}, schema)
        self.assertEqual(kind, "invalid")
        self.assertEqual(err, "missing field: 570.data")

    def test_store_ok(self):
        kind, err = validate_payload(STORE_OK, sync_enrichment.store_schema(570))
        self.assertEqual((kind, err), ("ok", None))

    def test_list_empty_is_empty(self):
        kind, _ = validate_payload({"response": {"games": []}},
                                   {"required": ["response"], "list": "response.games"})
        self.assertEqual(kind, "empty")

    def test_list_wrong_type_is_invalid(self):
        kind, _ = validate_payload({"response": {"games": "nope"}},
                                   {"list": "response.games"})
        self.assertEqual(kind, "invalid")

    def test_list_optional_missing_is_empty(self):
        kind, err = validate_payload({"response": {}},
                                     {"list": "response.games", "list_optional": True})
        self.assertEqual(kind, "empty")
        self.assertIn("response.games", err)

    def test_list_required_missing_is_invalid(self):
        kind, err = validate_payload({"response": {}},
                                     {"list": "response.players", "list_optional": False})
        self.assertEqual(kind, "invalid")
        self.assertEqual(err, "missing field: response.players")


# ---------------------------------------------------------------------------
# 2) Checkpoint resume: only failed items reprocessed
# ---------------------------------------------------------------------------

class ResumeTest(BatchTestCase):
    def test_resume_reprocesses_only_failed_items(self):
        http1 = HttpRouter({
            "GetPlayerSummaries": FakeResponse(200, PLAYER_OK),
            "GetOwnedGames": FakeResponse(429, {"response": {}}),
            "GetRecentlyPlayedGames": FakeResponse(200, RECENT_OK),
        })
        with mock.patch("requests.get", http1):
            rc1 = sync_turso.main(["--state-dir", self.state_dir])
        self.assertEqual(rc1, 1)  # retry remaining -> non-zero
        ck = self.checkpoint()
        self.assertEqual(ck["items"]["owned_games"]["status"], STATUS_RETRY)
        self.assertEqual(ck["items"]["owned_games"]["attempts"], 3)
        self.assertEqual(ck["items"]["owned_games"]["http_status"], 429)
        self.assertIn("HTTP 429", ck["items"]["owned_games"]["last_error"])
        self.assertEqual(ck["items"]["player_status"]["status"], STATUS_SUCCESS)
        self.assertEqual(ck["items"]["recent_sessions"]["status"], STATUS_SUCCESS)
        self.assertEqual(ck["failures"][-1]["item"], "owned_games")
        self.assertEqual(http1.count("GetOwnedGames"), 3)
        self.assertEqual(http1.count("GetPlayerSummaries"), 1)
        self.assertEqual(http1.count("GetRecentlyPlayedGames"), 1)
        batch_id = ck["batch_id"]
        self.assertRegex(batch_id, BATCH_ID_RE)

        # Round 2: the failed endpoint is healthy again.
        http2 = HttpRouter({
            "GetOwnedGames": FakeResponse(200, OWNED_OK),
        })
        with mock.patch("requests.get", http2):
            rc2 = sync_turso.main(["--state-dir", self.state_dir])
        self.assertEqual(rc2, 0)
        ck2 = self.checkpoint()
        self.assertEqual(ck2["batch_id"], batch_id)  # unfinished batch keeps its id
        self.assertEqual(ck2["items"]["owned_games"]["status"], STATUS_SUCCESS)
        self.assertEqual(ck2["items"]["owned_games"]["attempts"], 4)  # 3 + 1
        self.assertEqual(ck2["items"]["player_status"]["status"], STATUS_SUCCESS)
        # Only the failed item was refetched.
        self.assertEqual(http2.count("GetOwnedGames"), 1)
        self.assertEqual(http2.count("GetPlayerSummaries"), 0)
        self.assertEqual(http2.count("GetRecentlyPlayedGames"), 0)


# ---------------------------------------------------------------------------
# 3) Idempotency: rerun with everything successful does nothing
# ---------------------------------------------------------------------------

class IdempotencyTest(BatchTestCase):
    def test_second_run_makes_no_calls_and_no_duplicate_writes(self):
        routes = {
            "GetPlayerSummaries": FakeResponse(200, PLAYER_OK),
            "GetOwnedGames": FakeResponse(200, OWNED_OK),
            "GetRecentlyPlayedGames": FakeResponse(200, RECENT_OK),
        }
        http1 = HttpRouter(dict(routes))
        with mock.patch("requests.get", http1):
            rc1 = sync_turso.main(["--state-dir", self.state_dir])
        self.assertEqual(rc1, 0)
        ck1 = self.checkpoint()
        self.assertEqual({rid: rec["status"] for rid, rec in ck1["items"].items()},
                         {"player_status": STATUS_SUCCESS, "owned_games": STATUS_SUCCESS,
                          "recent_sessions": STATUS_SUCCESS})
        writes1 = len(self.db.many_calls)
        execs1 = len(self.db.execute_calls)
        self.assertGreater(writes1, 0)

        # Same input, second run: zero HTTP calls, zero DB writes, no dup data.
        http2 = HttpRouter(dict(routes))
        with mock.patch("requests.get", http2):
            rc2 = sync_turso.main(["--state-dir", self.state_dir])
        self.assertEqual(rc2, 0)
        self.assertEqual(len(http2.calls), 0)
        self.assertEqual(len(self.db.many_calls), writes1)
        self.assertEqual(len(self.db.execute_calls), execs1)
        ck2 = self.checkpoint()
        self.assertEqual(ck2["items"], ck1["items"])  # results untouched
        # Finished batch rotated; fresh results carried over.
        self.assertNotEqual(ck2["batch_id"], ck1["batch_id"])
        self.assertEqual(ck2["carried_from"], ck1["batch_id"])


# ---------------------------------------------------------------------------
# 4) Partial failure: non-zero exit, failure manifest, report, ::error:: alert
# ---------------------------------------------------------------------------

class PartialFailureTest(BatchTestCase):
    def test_schema_failure_exits_nonzero_and_writes_manifest(self):
        http1 = HttpRouter({
            "GetPlayerSummaries": FakeResponse(200, PLAYER_MISSING),  # schema failure
            "GetOwnedGames": FakeResponse(200, OWNED_OK),
            "GetRecentlyPlayedGames": FakeResponse(200, RECENT_OK),
        })
        buf = io.StringIO()
        with mock.patch("requests.get", http1), contextlib.redirect_stdout(buf):
            rc = sync_turso.main(["--state-dir", self.state_dir])
        out = buf.getvalue()
        self.assertEqual(rc, 1)
        ck = self.checkpoint()
        self.assertEqual(len(ck["failures"]), 1)
        failure = ck["failures"][0]
        self.assertEqual(failure["item"], "player_status")
        self.assertEqual(failure["status"], STATUS_FAILED)
        self.assertIn("missing field: response.players", failure["last_error"])
        self.assertEqual(failure["http_status"], 200)
        summary = ck["summary"]
        self.assertEqual(summary["failed"], 1)
        self.assertEqual(summary["success"], 2)
        self.assertEqual(summary["total"], 3)
        # workflow-facing alert lines are printed
        self.assertIn("::error::", out)
        self.assertIn("player_status", out)

        # per-run report with the failure manifest is on disk
        reports = self.report_files()
        self.assertEqual(len(reports), 1)
        self.assertIn(f"sync_turso.{ck['batch_id']}.run1.json", reports[0])
        with open(os.path.join(self.state_dir, "reports", reports[0]), encoding="utf-8") as fh:
            report = json.load(fh)
        self.assertEqual(report["batch_id"], ck["batch_id"])
        self.assertEqual(len(report["failures"]), 1)
        self.assertIn("items", report)
        self.assertIn("summary", report)

    def test_empty_response_is_success_path_with_empty_status(self):
        http1 = HttpRouter({
            "GetPlayerSummaries": FakeResponse(200, PLAYER_OK),
            "GetOwnedGames": FakeResponse(200, {"response": {}}),  # private profile -> empty
            "GetRecentlyPlayedGames": FakeResponse(200, {"response": {}}),
        })
        with mock.patch("requests.get", http1):
            rc = sync_turso.main(["--state-dir", self.state_dir])
        self.assertEqual(rc, 0)  # empty is legal, not a failure
        ck = self.checkpoint()
        self.assertEqual(ck["summary"]["empty"], 2)
        self.assertEqual(ck["summary"]["success"], 1)
        self.assertEqual(ck["failures"], [])


# ---------------------------------------------------------------------------
# 5) DB write failure -> failed, never swallowed
# ---------------------------------------------------------------------------

class DbFailureTest(BatchTestCase):
    def test_db_write_failure_marks_item_failed_and_exits_nonzero(self):
        self.db.error_on = "steam_level"  # only the steam_level INSERT blows up
        http1 = HttpRouter({
            "GetSteamLevel": FakeResponse(200, LEVEL_OK),
        })
        with mock.patch("requests.get", http1):
            rc = sync_enrichment.main(["--state-dir", self.state_dir])
        self.assertEqual(rc, 1)
        ck = self.checkpoint(scope="sync_enrichment")
        self.assertEqual(ck["summary"]["total"], 1)  # no store/achievement games from fake DB
        rec = ck["items"]["steam_level"]
        self.assertEqual(rec["status"], STATUS_FAILED)
        self.assertIn("RuntimeError: Turso pipeline down", rec["last_error"])
        self.assertIsNone(rec["http_status"])  # failure was the DB write, not HTTP
        self.assertEqual([f["item"] for f in ck["failures"]], ["steam_level"])


# ---------------------------------------------------------------------------
# 6) Enrichment happy path, db-hit idempotency
# ---------------------------------------------------------------------------

ENRICH_SELECTS = {
    "LIMIT 50": [{"appid": 570}],
    "LIMIT 20": [{"appid": 570, "name": "Dota 2"}],
    "FROM game_details": [],
    "FROM game_achievements": [{"cnt": 0}],
}


class EnrichmentTest(BatchTestCase):
    def test_happy_path_all_success_with_correct_global_percent(self):
        self.db.select_results = dict(ENRICH_SELECTS)
        http1 = HttpRouter({
            "GetSteamLevel": FakeResponse(200, LEVEL_OK),
            "appdetails": FakeResponse(200, STORE_OK),
            "GetPlayerAchievements": FakeResponse(200, PACH_OK),
            "GetGlobalAchievementPercentagesForApp": FakeResponse(200, GACH_OK),
        })
        with mock.patch("requests.get", http1):
            rc = sync_enrichment.main(["--state-dir", self.state_dir])
        self.assertEqual(rc, 0)
        ck = self.checkpoint(scope="sync_enrichment")
        self.assertEqual(sorted(ck["items"]),
                         ["achievements:570", "steam_level", "store_details:570"])
        self.assertTrue(all(rec["status"] == STATUS_SUCCESS for rec in ck["items"].values()))
        # achievements written with the fetched global percentage
        ach_writes = [args for sql, args in self.db.many_calls
                      if "game_achievements" in sql for args in args]
        self.assertEqual(ach_writes, [[570, "ACH_1", 1, 0, "55.5"]])
        detail_inserts = [sql for sql, _args in self.db.execute_calls
                          if "INSERT OR IGNORE INTO game_details" in sql]
        self.assertEqual(len(detail_inserts), 1)

    def test_db_hit_skips_http_and_marks_success(self):
        self.db.select_results = {
            "LIMIT 50": [{"appid": 570}],
            "LIMIT 20": [{"appid": 570, "name": "Dota 2"}],
            "FROM game_details": [{"appid": 570}],      # already stored
            "FROM game_achievements": [{"cnt": 7}],     # already stored
        }
        # No appdetails/achievement routes: any fetch would raise AssertionError.
        http1 = HttpRouter({"GetSteamLevel": FakeResponse(200, LEVEL_OK)})
        with mock.patch("requests.get", http1):
            rc = sync_enrichment.main(["--state-dir", self.state_dir])
        self.assertEqual(rc, 0)
        ck = self.checkpoint(scope="sync_enrichment")
        self.assertEqual(http1.count("appdetails"), 0)
        self.assertEqual(http1.count("GetPlayerAchievements"), 0)
        store_rec = ck["items"]["store_details:570"]
        ach_rec = ck["items"]["achievements:570"]
        self.assertEqual((store_rec["status"], ach_rec["status"]),
                         (STATUS_SUCCESS, STATUS_SUCCESS))
        self.assertEqual((store_rec["attempts"], ach_rec["attempts"]), (0, 0))
        self.assertIn("db-hit", store_rec["note"])
        self.assertIn("db-hit", ach_rec["note"])


# ---------------------------------------------------------------------------
# 7) Stale results are refreshed; fresh ones are kept
# ---------------------------------------------------------------------------

class StaleRefreshTest(BatchTestCase):
    def test_stale_success_refreshed_fresh_success_kept(self):
        routes = {
            "GetPlayerSummaries": FakeResponse(200, PLAYER_OK),
            "GetOwnedGames": FakeResponse(200, OWNED_OK),
            "GetRecentlyPlayedGames": FakeResponse(200, RECENT_OK),
        }
        http1 = HttpRouter(dict(routes))
        with mock.patch("requests.get", http1):
            self.assertEqual(sync_turso.main(["--state-dir", self.state_dir]), 0)
        ck = self.checkpoint()
        old = ck["batch_id"]
        now = datetime.now().astimezone()
        ck["items"]["owned_games"]["ts"] = (now - timedelta(hours=30)).isoformat()   # stale (>20h)
        ck["items"]["player_status"]["ts"] = (now - timedelta(hours=2)).isoformat()  # fresh
        self.save_checkpoint(ck)

        http2 = HttpRouter(dict(routes))
        with mock.patch("requests.get", http2):
            rc = sync_turso.main(["--state-dir", self.state_dir])
        self.assertEqual(rc, 0)
        self.assertEqual(http2.count("GetOwnedGames"), 1)      # stale -> refetched
        self.assertEqual(http2.count("GetPlayerSummaries"), 0) # fresh -> skipped
        self.assertEqual(http2.count("GetRecentlyPlayedGames"), 0)
        ck2 = self.checkpoint()
        self.assertEqual(ck2["items"]["owned_games"]["status"], STATUS_SUCCESS)
        self.assertEqual(ck2["items"]["owned_games"]["attempts"], 2)
        self.assertNotEqual(ck2["batch_id"], old)
        self.assertEqual(ck2["carried_from"], old)


# ---------------------------------------------------------------------------
# 8) Batch artifacts: ids, checkpoint, reports
# ---------------------------------------------------------------------------

class BatchArtifactsTest(BatchTestCase):
    def test_batch_id_checkpoint_and_reports(self):
        routes = {
            "GetPlayerSummaries": FakeResponse(200, PLAYER_OK),
            "GetOwnedGames": FakeResponse(200, OWNED_OK),
            "GetRecentlyPlayedGames": FakeResponse(200, RECENT_OK),
        }
        http1 = HttpRouter(dict(routes))
        with mock.patch("requests.get", http1):
            self.assertEqual(sync_turso.main(["--state-dir", self.state_dir]), 0)
        ck = self.checkpoint()
        self.assertRegex(ck["batch_id"], BATCH_ID_RE)
        self.assertEqual(ck["scope"], "sync_turso")
        self.assertEqual(ck["runs"], 1)
        for rec in ck["items"].values():
            for field in ("item", "status", "attempts", "last_error", "http_status", "ts"):
                self.assertIn(field, rec)
            self.assertRegex(rec["ts"], r"^\d{4}-\d{2}-\d{2}T")
        reports = self.report_files()
        self.assertEqual(len(reports), 1)
        self.assertTrue(reports[0].endswith(".run1.json"))

        http2 = HttpRouter(dict(routes))
        with mock.patch("requests.get", http2):
            self.assertEqual(sync_turso.main(["--state-dir", self.state_dir, "--all"]), 0)
        ck2 = self.checkpoint()
        self.assertEqual(ck2["runs"], 2)
        # --all forced a full refresh: every endpoint called exactly once per run
        self.assertEqual(len(http2.calls), 3)
        reports = self.report_files()
        self.assertEqual(len(reports), 2)
        self.assertIn(f"sync_turso.{ck['batch_id']}.run1.json", reports)
        self.assertIn(f"sync_turso.{ck2['batch_id']}.run2.json", reports)


# ---------------------------------------------------------------------------
# 9) Typed errors surface enough detail to locate the failure
# ---------------------------------------------------------------------------

class TypedErrorTest(unittest.TestCase):
    def test_transient_error_carries_http_status(self):
        with self.assertRaises(TransientFetchError) as ctx:
            sync_batch.fetch_http(lambda url, params=None, timeout=None: FakeResponse(429, {}), "https://x")
        self.assertEqual(ctx.exception.http_status, 429)

    def test_permanent_error_names_missing_schema_field(self):
        def get(url, params=None, timeout=None):
            return FakeResponse(200, {"response": {}})
        with self.assertRaises(PermanentFetchError) as ctx:
            fetch_json(get, "https://x", schema={"required": ["response.players"]})
        self.assertIn("missing field: response.players", str(ctx.exception))


if __name__ == "__main__":
    unittest.main(verbosity=2)
