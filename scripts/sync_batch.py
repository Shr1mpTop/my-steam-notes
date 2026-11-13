"""Batch state machine for the Steam sync scripts (DEV-005).

Every sync run gets a batch id; every work item (a Steam endpoint phase, or a
single appid) is tracked with a pending/success/empty/retry/failed status:
    pending  queued, not attempted yet (or queued for refresh)
    success  fetched, schema valid, DB write done
    empty    valid response but no data (counted separately, not a failure)
    retry    transient error (429/408/5xx, timeout, connection) after the
             per-run attempt budget; picked up again by the next run
    failed   permanent error (other 4xx, invalid JSON, schema violation,
             DB write failure); never swallowed

State is persisted to <state-dir>/<scope>.json (default data/sync_batch/) so a
rerun only reprocesses pending/retry/failed items plus successes/empties older
than --stale-hours; fresh successes are skipped, which keeps reruns idempotent.
A finished batch is rotated: the next run gets a new batch id and carries the
still-fresh results over. Each run also writes an immutable final report (with
the failure manifest) to <state-dir>/reports/<scope>.<batch_id>.run<N>.json.

HTTP responses are validated (status code + minimal dotted-path JSON schema):
    validate_payload(data, schema)  -> ("ok"|"empty"|"invalid", error)
Schema keys: "required" (dotted paths that must exist), "truthy_empty" (path
falsy -> empty; missing -> invalid), "list" (dotted path that must be a list;
empty list -> empty), "list_optional" (missing list -> empty instead of
invalid).

Only stdlib + requests are used, and the module performs no network I/O of its
own beyond the `get` callable handed to fetch_http()/fetch_json().
"""
import argparse
import json
import os
import time
import uuid
from datetime import datetime

import requests

STATUS_PENDING = "pending"
STATUS_SUCCESS = "success"
STATUS_EMPTY = "empty"
STATUS_RETRY = "retry"
STATUS_FAILED = "failed"

#: terminal-good statuses: skipped on rerun while they are fresh
TERMINAL_GOOD = (STATUS_SUCCESS, STATUS_EMPTY)
#: statuses that always get reprocessed on a rerun
ACTIVE_STATUSES = (STATUS_PENDING, STATUS_RETRY, STATUS_FAILED)

DEFAULT_STATE_DIR = os.path.join("data", "sync_batch")
#: 20h sits below the 24h daily cron interval: same-day reruns skip fresh
#: results (idempotent), the next daily run finds them stale and refreshes.
DEFAULT_STALE_HOURS = 20.0
DEFAULT_MAX_ATTEMPTS = 3
BACKOFF_BASE_SECONDS = 2.0
BACKOFF_CAP_SECONDS = 30.0

TRANSIENT_HTTP_STATUSES = (408, 429, 500, 502, 503, 504)


class TransientFetchError(Exception):
    """Retryable fetch problem (429/408/5xx, timeout, connection error)."""

    def __init__(self, message, http_status=None):
        super().__init__(message)
        self.http_status = http_status


class PermanentFetchError(Exception):
    """Non-retryable fetch problem (other 4xx, invalid JSON, bad schema)."""

    def __init__(self, message, http_status=None):
        super().__init__(message)
        self.http_status = http_status


# ---------------------------------------------------------------------------
# time helpers
# ---------------------------------------------------------------------------

def _now_iso():
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _parse_ts(value):
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value))
    except ValueError:
        return None
    if dt.tzinfo is None:  # treat naive timestamps as local time
        dt = dt.astimezone()
    return dt


def _age_hours(value):
    dt = _parse_ts(value)
    if dt is None:
        return None
    return (datetime.now().astimezone() - dt).total_seconds() / 3600.0


def _new_batch_id():
    return datetime.now().astimezone().strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex[:6]


# ---------------------------------------------------------------------------
# response validation
# ---------------------------------------------------------------------------

def _lookup(data, dotted_path):
    """Resolve a dotted path like 'response.players'; returns (value, found)."""
    cur = data
    for part in dotted_path.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None, False
        cur = cur[part]
    return cur, True


def validate_payload(data, schema):
    """Validate a decoded JSON body against a minimal schema.

    Returns (kind, error) with kind in {"ok", "empty", "invalid"}; error is a
    human-readable reason (naming the missing field) or None.
    """
    schema = schema or {}
    if not isinstance(data, dict):
        return "invalid", "top-level JSON is not an object"
    for path in schema.get("truthy_empty", []):
        value, found = _lookup(data, path)
        if not found:
            return "invalid", f"missing field: {path}"
        if not value:
            return "empty", f"{path} is false (no data available)"
    for path in schema.get("required", []):
        value, found = _lookup(data, path)
        if not found or value is None:
            return "invalid", f"missing field: {path}"
    list_path = schema.get("list")
    if list_path:
        value, found = _lookup(data, list_path)
        if not found:
            if schema.get("list_optional"):
                return "empty", f"{list_path} missing (nothing to sync)"
            return "invalid", f"missing field: {list_path}"
        if not isinstance(value, list):
            return "invalid", f"field {list_path} is not a list"
        if not value:
            return "empty", f"{list_path} is empty"
    return "ok", None


def fetch_http(get, url, params=None, timeout=30):
    """GET via the injected callable, gate on HTTP status, decode JSON.

    Returns (data, http_status). Raises TransientFetchError for 429/408/5xx,
    timeouts and connection errors; PermanentFetchError for other non-200
    responses and for 200 bodies that are not valid JSON.
    """
    try:
        resp = get(url, params=params or {}, timeout=timeout)
    except requests.exceptions.Timeout as exc:
        raise TransientFetchError(f"timeout after {timeout}s: {exc}") from exc
    except requests.exceptions.ConnectionError as exc:
        raise TransientFetchError(f"connection error: {exc}") from exc
    status = getattr(resp, "status_code", None)
    if status != 200:
        transient = status in TRANSIENT_HTTP_STATUSES or (
            isinstance(status, int) and 500 <= status < 600
        )
        if transient:
            raise TransientFetchError(f"HTTP {status}", http_status=status)
        raise PermanentFetchError(f"HTTP {status}", http_status=status)
    try:
        data = resp.json()
    except ValueError as exc:  # json.JSONDecodeError subclasses ValueError
        raise PermanentFetchError(f"invalid JSON in 200 response: {exc}", http_status=200) from exc
    return data, status


def fetch_json(get, url, params=None, timeout=30, schema=None):
    """fetch_http + schema validation. Returns (data, kind), kind "ok"/"empty".

    Raises TransientFetchError / PermanentFetchError on any invalid response.
    """
    data, status = fetch_http(get, url, params=params, timeout=timeout)
    kind, error = validate_payload(data, schema)
    if kind == "invalid":
        raise PermanentFetchError(
            f"schema validation failed: {error}", http_status=status
        ) from None
    return data, kind


# ---------------------------------------------------------------------------
# batch state
# ---------------------------------------------------------------------------

class SyncBatch:
    """Per-scope batch state: batch id, per-item records, checkpoint/report IO."""

    def __init__(self, scope, state_dir=DEFAULT_STATE_DIR,
                 stale_hours=DEFAULT_STALE_HOURS, max_attempts=DEFAULT_MAX_ATTEMPTS,
                 force_all=False, persist=True, sleep_fn=None):
        self.scope = scope
        self.state_dir = state_dir
        self.stale_hours = max(0.0, float(stale_hours))
        self.max_attempts = max(1, int(max_attempts))
        self.force_all = bool(force_all)
        self.persist = bool(persist)
        self.sleep_fn = sleep_fn or time.sleep
        self.path = os.path.join(state_dir, f"{scope}.json") if persist else None
        self.reports_dir = os.path.join(state_dir, "reports") if persist else None
        self.batch_id = _new_batch_id()
        self.created_at = _now_iso()
        self.started_at = None
        self.finished_at = None
        self.runs = 0
        self.carried_from = None
        self.resume_stats = None
        self.items = {}  # item_id -> record, insertion ordered
        self._skipped = []

    # -- construction -------------------------------------------------------

    @classmethod
    def ephemeral(cls, scope, **kwargs):
        """In-memory batch without persistence (legacy direct-call path)."""
        return cls(scope, persist=False, **kwargs)

    @classmethod
    def load_or_create(cls, scope, item_ids, state_dir=DEFAULT_STATE_DIR,
                       stale_hours=DEFAULT_STALE_HOURS,
                       max_attempts=DEFAULT_MAX_ATTEMPTS, force_all=False):
        """Load the scope's checkpoint (resume) or start a new batch.

        Resume rules: an unfinished batch keeps its batch_id; a finished batch
        is rotated to a new id with fresh success/empty results carried over.
        stale success/empty results are reset to pending so they refresh.
        Checkpoint items that are no longer part of the current plan are pruned
        (they would otherwise stay failed forever and wedge the exit code).
        """
        batch = cls(scope, state_dir=state_dir, stale_hours=stale_hours,
                    max_attempts=max_attempts, force_all=force_all)
        raw = batch._read_state()
        if raw:
            batch._adopt(raw, list(item_ids))
        else:
            batch._init_items(list(item_ids))
        return batch

    def _read_state(self):
        if not self.persist or not self.path or not os.path.exists(self.path):
            return None
        try:
            with open(self.path, "r", encoding="utf-8") as fh:
                raw = json.load(fh)
        except (OSError, ValueError) as exc:
            print(f"[batch] warning: unreadable checkpoint {self.path} ({exc}); starting a fresh batch")
            return None
        return raw if isinstance(raw, dict) else None

    def _init_items(self, item_ids):
        self.items = {item_id: self._new_record(item_id) for item_id in item_ids}

    def _adopt(self, raw, item_ids):
        prev_items = raw.get("items") if isinstance(raw.get("items"), dict) else {}
        prev_finished = bool(raw.get("finished_at"))
        resume_same_batch = not prev_finished
        if resume_same_batch:
            self.batch_id = raw.get("batch_id") or self.batch_id
            self.created_at = raw.get("created_at") or self.created_at
        else:
            self.carried_from = raw.get("batch_id")
        try:
            self.runs = int(raw.get("runs") or 0)
        except (TypeError, ValueError):
            self.runs = 0

        carried = reset_stale = 0
        items = {}
        for item_id in item_ids:
            rec = prev_items.get(item_id)
            if rec is None:
                items[item_id] = self._new_record(item_id)
                continue
            rec = self._normalize_record(rec)
            if rec["status"] in TERMINAL_GOOD:
                age = _age_hours(rec.get("ts"))
                if age is None or age >= self.stale_hours:
                    old_status = rec["status"]
                    rec["status"] = STATUS_PENDING
                    rec["note"] = (
                        f"stale: previous {old_status} at {rec.get('ts')} is older "
                        f"than {self.stale_hours:g}h; queued for refresh"
                    )
                    reset_stale += 1
                else:
                    carried += 1
            items[item_id] = rec
        pruned = sum(1 for key in prev_items if key not in items)
        self.items = items
        self.resume_stats = {
            "resumed_same_batch": resume_same_batch,
            "carried_fresh": carried,
            "reset_stale": reset_stale,
            "pruned_not_in_plan": pruned,
        }
        print(
            f"[batch {self.batch_id}] resumed checkpoint: carried_fresh={carried} "
            f"reset_stale={reset_stale} pruned={pruned} same_batch={resume_same_batch}"
        )

    @staticmethod
    def _new_record(item_id):
        return {
            "item": item_id,
            "status": STATUS_PENDING,
            "attempts": 0,
            "last_error": None,
            "http_status": None,
            "ts": _now_iso(),
            "note": None,
        }

    @staticmethod
    def _normalize_record(rec):
        base = SyncBatch._new_record(str(rec.get("item") or "unknown"))
        for key in base:
            if key in rec and rec[key] is not None:
                base[key] = rec[key]
        base["attempts"] = int(base.get("attempts") or 0)
        if base["status"] not in (STATUS_PENDING, STATUS_SUCCESS, STATUS_EMPTY,
                                  STATUS_RETRY, STATUS_FAILED):
            base["status"] = STATUS_PENDING
        return base

    # -- per-run operations --------------------------------------------------

    def _record(self, item_id):
        if item_id not in self.items:
            self.items[item_id] = self._new_record(item_id)
        return self.items[item_id]

    def begin_run(self):
        self.started_at = _now_iso()
        self.finished_at = None
        self.runs += 1
        self._skipped = []
        self.save()

    def should_run(self, item_id):
        """True when the item must be processed this run (force_all overrides)."""
        rec = self._record(item_id)
        if self.force_all:
            return True
        return rec["status"] in ACTIVE_STATUSES

    def skip(self, item_id):
        """Record (and log) an item skipped because its result is still fresh."""
        rec = self._record(item_id)
        self._skipped.append(item_id)
        print(
            f"[batch {self.batch_id}] {item_id}: skipped "
            f"(fresh {rec['status']} at {rec.get('ts')})"
        )

    def mark_success(self, item_id, note=None, http_status=200):
        """Mark an item succeeded without a fetch (e.g. result already in DB)."""
        rec = self._record(item_id)
        rec["status"] = STATUS_SUCCESS
        rec["last_error"] = None
        rec["http_status"] = http_status
        rec["note"] = note
        rec["ts"] = _now_iso()
        self.save()

    # -- persistence ---------------------------------------------------------

    def summary(self):
        counts = {"total": len(self.items), "success": 0, "empty": 0,
                  "retry": 0, "failed": 0, "pending": 0}
        for rec in self.items.values():
            counts[rec["status"]] = counts.get(rec["status"], 0) + 1
        counts["skipped_fresh"] = len(self._skipped)
        return counts

    def failures(self):
        """The failure manifest: every item currently retry/failed."""
        return [dict(rec) for rec in self.items.values()
                if rec["status"] in (STATUS_RETRY, STATUS_FAILED)]

    def attention_items(self):
        """Items that keep the exit code non-zero: retry/failed/pending."""
        return [dict(rec) for rec in self.items.values()
                if rec["status"] in ACTIVE_STATUSES]

    def exit_code(self):
        return 1 if self.attention_items() else 0

    def to_dict(self):
        return {
            "batch_id": self.batch_id,
            "scope": self.scope,
            "created_at": self.created_at,
            "updated_at": _now_iso(),
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "batch_complete": self.finished_at is not None,
            "runs": self.runs,
            "carried_from": self.carried_from,
            "resume": self.resume_stats,
            "options": {
                "stale_hours": self.stale_hours,
                "max_attempts": self.max_attempts,
                "force_all": self.force_all,
            },
            "summary": self.summary(),
            "failures": self.failures(),
            "items": self.items,
        }

    def save(self):
        """Atomically write the checkpoint (crash leaves the last good state)."""
        if not self.persist or not self.path:
            return
        os.makedirs(self.state_dir, exist_ok=True)
        tmp = self.path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(self.to_dict(), fh, ensure_ascii=False, indent=2)
        os.replace(tmp, self.path)

    def finish(self):
        """Close the run: final checkpoint + immutable report file.

        finished_at is stamped only when the batch is complete (no pending/
        retry/failed items left); an unfinished batch stays open so the next
        run resumes it under the same batch id.
        """
        self.finished_at = _now_iso() if not self.attention_items() else None
        self.save()
        if self.persist and self.reports_dir:
            os.makedirs(self.reports_dir, exist_ok=True)
            report_path = os.path.join(
                self.reports_dir, f"{self.scope}.{self.batch_id}.run{self.runs}.json"
            )
            tmp = report_path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(self.to_dict(), fh, ensure_ascii=False, indent=2)
            os.replace(tmp, report_path)
            print(f"[batch {self.batch_id}] report written: {report_path}")
        return self.summary()


# ---------------------------------------------------------------------------
# item runner
# ---------------------------------------------------------------------------

def run_item(batch, item_id, process, max_attempts=None, sleep_fn=None):
    """Run one batch item with transient-error retry/backoff.

    `process()` performs fetch + DB write and returns ("success"|"empty", note).
    TransientFetchError -> retried up to max_attempts with exponential backoff,
    then parked as `retry`; PermanentFetchError and any other exception (DB
    write failures included) -> `failed`, never swallowed. The checkpoint is
    saved before and after, so a crash leaves the item pending for the next run.
    """
    max_attempts = max_attempts or batch.max_attempts
    sleep_fn = sleep_fn or batch.sleep_fn
    rec = batch._record(item_id)
    rec["status"] = STATUS_PENDING
    rec["note"] = None
    rec["ts"] = _now_iso()
    batch.save()

    attempt = 0
    while attempt < max_attempts:
        attempt += 1
        rec["attempts"] = int(rec.get("attempts") or 0) + 1
        rec["ts"] = _now_iso()
        try:
            result = process()
        except TransientFetchError as exc:
            rec["status"] = STATUS_RETRY
            rec["last_error"] = f"transient: {exc}"
            rec["http_status"] = exc.http_status
            if attempt < max_attempts:
                delay = min(BACKOFF_BASE_SECONDS * (2 ** (attempt - 1)),
                            BACKOFF_CAP_SECONDS)
                print(f"[batch {batch.batch_id}] {item_id}: attempt {attempt} "
                      f"failed ({exc}); backing off {delay:g}s")
                sleep_fn(delay)
                continue
            break
        except PermanentFetchError as exc:
            rec["status"] = STATUS_FAILED
            rec["last_error"] = f"permanent: {exc}"
            rec["http_status"] = exc.http_status
            break
        except Exception as exc:  # DB write failures and anything else: recorded, never swallowed
            rec["status"] = STATUS_FAILED
            rec["last_error"] = f"{type(exc).__name__}: {exc}"
            rec["http_status"] = None
            break
        if not (isinstance(result, tuple) and len(result) == 2
                and result[0] in (STATUS_SUCCESS, STATUS_EMPTY)):
            rec["status"] = STATUS_FAILED
            rec["last_error"] = f"process returned invalid outcome: {result!r}"
            rec["http_status"] = None
            break
        outcome, note = result
        rec["status"] = outcome
        rec["last_error"] = None
        rec["http_status"] = 200
        rec["note"] = note
        break

    batch.save()
    line = (f"[batch {batch.batch_id}] {item_id}: {rec['status']} "
            f"(attempts={rec['attempts']}, http={rec['http_status']})")
    if rec["last_error"]:
        line += f" error={rec['last_error']}"
    print(line)
    return rec["status"]


def dispatch(batch, item_id, process):
    """Batch-aware item runner; without a batch, keep legacy direct-call
    behavior: run once, let exceptions propagate (no persistence)."""
    if batch is None:
        process()
        return None
    return run_item(batch, item_id, process)


# ---------------------------------------------------------------------------
# CLI + reporting helpers shared by the sync scripts
# ---------------------------------------------------------------------------

def add_cli_args(parser):
    """Add the common batch flags to an argparse parser."""
    parser.add_argument("--all", dest="force_all", action="store_true",
                        help="reprocess every item even if the last run "
                             "succeeded (default: only pending/retry/failed "
                             "and stale items)")
    parser.add_argument("--state-dir", default=DEFAULT_STATE_DIR,
                        help="directory for batch checkpoints and reports "
                             "(default: %(default)s)")
    parser.add_argument("--stale-hours", type=float, default=DEFAULT_STALE_HOURS,
                        help="success/empty results older than this are "
                             "refreshed on rerun (default: %(default)s; below "
                             "the 24h daily cron so daily runs refresh while "
                             "same-day reruns stay idempotent)")
    parser.add_argument("--max-attempts", type=int, default=DEFAULT_MAX_ATTEMPTS,
                        help="per-run fetch attempts for transient errors "
                             "before an item parks as retry (default: %(default)s)")
    return parser


def print_failures(batch):
    """Human summary + GitHub Actions ::error:: annotations for unfinished items."""
    print(f"[batch {batch.batch_id}] summary: {json.dumps(batch.summary(), ensure_ascii=False)}")
    unfinished = batch.attention_items()
    for rec in unfinished:
        print(f"::error::[batch {batch.batch_id}] item {rec['item']}: "
              f"status={rec['status']} attempts={rec['attempts']} "
              f"http_status={rec['http_status']} last_error={rec['last_error']}")
    if unfinished:
        where = batch.path or "(in-memory)"
        print(f"::error::[batch {batch.batch_id}] {len(unfinished)} item(s) "
              f"unfinished; failure manifest: {where}")
    else:
        print(f"[batch {batch.batch_id}] all items finished cleanly")
