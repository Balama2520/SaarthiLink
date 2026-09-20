"""
Google Sheets Job Seeding Control Center — Integration Service
==============================================================
Provides a controlled, server-side read/write interface to the existing
14-tab Google Sheets architecture.

TAB INDEX (DO NOT RENAME):
  01_SOURCES          — source definitions
  02_COMPANIES        — company registry
  03_ROLE_RULES       — role-based filtering rules
  04_LOCATION_RULES   — location-based rules
  05_SKILLS           — skill definitions
  06_INCLUDE_RULES    — inclusion rules
  07_EXCLUDE_RULES    — exclusion rules
  08_SEED_CONFIG      — seeding configuration
  09_JOBS_STAGING     — staged jobs awaiting sync
  10_SEED_RUNS        — run history
  11_SYNC_LOGS        — sync operation logs
  12_SOURCE_ERRORS    — per-source error log
  13_DASHBOARD        — computed metrics (READ-ONLY — never overwrite formulas)
  14_API_CONFIG       — API keys and configuration (READ via secret injection only)

SECURITY:
  - All credentials are env-var only; never logged or exposed to frontend.
  - 14_API_CONFIG is READ-ONLY and only accessed in controlled admin operations.
  - Spreadsheet ID is not a secret but kept server-side for isolation.
  - Private keys, tokens, and client_email are NEVER logged or returned via API.

JOB PIPELINE (Step 5 compliance):
  SOURCE → FETCH → NORMALIZE → INCLUDE RULES → EXCLUDE RULES →
  VALIDATION → DEDUPLICATION → 09_JOBS_STAGING →
  BATCH → SAARTHI BACKEND → HTTP RESPONSE →
  10_SEED_RUNS / 11_SYNC_LOGS / 12_SOURCE_ERRORS → STATUS UPDATE → 13_DASHBOARD

HTTP STATUS HANDLING (Step 6 compliance):
  200/201 → SYNCED
  400     → FAILED_VALIDATION (no retry)
  401/403 → CRITICAL_AUTH_FAILURE (abort pipeline, no retry)
  409     → DUPLICATE_BACKEND (continue remaining)
  429     → Retry-After parse → exponential backoff, max 3 retries
  5xx     → retry, max 3 retries, graceful fail

DRY RUN (Step 7 compliance):
  - Dry run NEVER sends to production backend
  - Dry run NEVER writes sync logs with SYNCED status
  - Dry run NEVER creates fake success states
  - Hard barrier enforced in SeedingPipeline.sync_jobs_to_backend()

STATUS:
  configured     — credentials present and sheet is reachable
  config_required — GOOGLE_SHEETS_SPREADSHEET_ID or credential missing
  error          — credentials present but connectivity/auth failed
"""

import hashlib
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# ── Tab registry (exact names — never rename these) ───────────────────────────
SHEET_TABS = {
    "sources": "01_SOURCES",
    "companies": "02_COMPANIES",
    "role_rules": "03_ROLE_RULES",
    "location_rules": "04_LOCATION_RULES",
    "skills": "05_SKILLS",
    "include_rules": "06_INCLUDE_RULES",
    "exclude_rules": "07_EXCLUDE_RULES",
    "seed_config": "08_SEED_CONFIG",
    "jobs_staging": "09_JOBS_STAGING",
    "seed_runs": "10_SEED_RUNS",
    "sync_logs": "11_SYNC_LOGS",
    "source_errors": "12_SOURCE_ERRORS",
    "dashboard": "13_DASHBOARD",
    "api_config": "14_API_CONFIG",  # Never write; never expose values
}

# Write-allowed tabs only (13_DASHBOARD and 14_API_CONFIG are protected)
WRITE_ALLOWED_TABS = {"seed_runs", "sync_logs", "source_errors", "jobs_staging"}

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]

# Job sync result codes
SYNC_STATUS_SYNCED = "SYNCED"
SYNC_STATUS_FAILED_VAL = "FAILED_VALIDATION"
SYNC_STATUS_DUPLICATE = "DUPLICATE_BACKEND"
SYNC_STATUS_AUTH_FAILURE = "CRITICAL_AUTH_FAILURE"
SYNC_STATUS_RATE_LIMITED = "RATE_LIMITED"
SYNC_STATUS_SERVER_ERROR = "SERVER_ERROR"
SYNC_STATUS_DRY_RUN = "DRY_RUN_SKIPPED"

MAX_RETRIES = 3
BASE_BACKOFF_SECONDS = 2.0


class SheetsServiceError(Exception):
    """Raised for recoverable Sheets integration errors."""


class SheetsAuthError(SheetsServiceError):
    """Raised on authentication/permission failures."""


class SheetsWriteProtectedError(SheetsServiceError):
    """Raised when a write is attempted on a protected tab."""


class DryRunViolationError(Exception):
    """Hard barrier: raised if dry-run code attempts a production write."""


def _sanitise_error(msg: str) -> str:
    """Strip credential fragments from error messages before logging."""
    lower = msg.lower()
    if any(
        term in lower
        for term in ("private_key", "token", "client_email", "secret", "credential")
    ):
        return "Authentication failed (credential error — check GOOGLE_SERVICE_ACCOUNT_JSON)"
    return msg[:200]


def _dedup_hash(company: str, title: str, location: str) -> str:
    """sha256 deduplication hash matching existing Job model logic."""
    raw = (
        f"{(company or '').lower()}:{(title or '').lower()}:{(location or '').lower()}"
    )
    return hashlib.sha256(raw.encode()).hexdigest()


# ── Core Sheets Service ───────────────────────────────────────────────────────


class GoogleSheetsService:
    """
    Server-side integration with the Saarthi Job Seeding Control Center.
    Lazy-initialises the Google API client only when a method is first called.

    SECURITY CONTRACT:
      - Never logs credential values.
      - Never returns credentials via API.
      - Never writes to 13_DASHBOARD or 14_API_CONFIG.
      - Returns CONFIG_REQUIRED when env vars are absent.
    """

    def __init__(self) -> None:
        self._client = None  # gspread Spreadsheet, lazily created
        self._spreadsheet_id: str = ""
        self._credential_json: str = ""
        self._status: str = "config_required"

    # ------------------------------------------------------------------
    # Configuration helpers
    # ------------------------------------------------------------------

    def _load_config(self) -> None:
        """Load config from environment. Never log credential values."""
        settings = get_settings()
        self._spreadsheet_id = settings.GOOGLE_SHEETS_SPREADSHEET_ID or ""
        self._credential_json = settings.GOOGLE_SERVICE_ACCOUNT_JSON or ""

    def is_configured(self) -> bool:
        """Return True only when all required env vars are present."""
        self._load_config()
        return bool(self._spreadsheet_id and self._credential_json)

    def status(self) -> Dict[str, str]:
        """
        Return a safe status dict for health checks.
        NEVER includes credential values.
        """
        self._load_config()
        if not self._spreadsheet_id:
            return {
                "status": "config_required",
                "detail": "GOOGLE_SHEETS_SPREADSHEET_ID not configured",
            }
        if not self._credential_json:
            return {
                "status": "config_required",
                "detail": "GOOGLE_SERVICE_ACCOUNT_JSON not configured",
            }
        return {
            "status": "configured",
            "spreadsheet_id_prefix": self._spreadsheet_id[:8] + "…",
        }

    # ------------------------------------------------------------------
    # Internal: build client (lazy)
    # ------------------------------------------------------------------

    def _get_client(self):
        """
        Build and cache the gspread Spreadsheet client.
        Raises SheetsAuthError if credentials are invalid.
        Raises ImportError if gspread / google-auth are not installed.
        """
        if self._client is not None:
            return self._client

        self._load_config()
        if not self.is_configured():
            raise SheetsServiceError(
                "Google Sheets integration not configured. "
                "Set GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON."
            )

        try:
            import gspread
            from google.oauth2.service_account import Credentials
        except ImportError as exc:
            raise ImportError(
                "Google Sheets dependencies not installed. "
                "Run: pip install gspread google-auth"
            ) from exc

        try:
            cred_source = self._credential_json.strip()
            if cred_source.startswith("{"):
                cred_info = json.loads(cred_source)
                creds = Credentials.from_service_account_info(cred_info, scopes=SCOPES)
            else:
                # It's a file path
                creds = Credentials.from_service_account_file(
                    cred_source, scopes=SCOPES
                )

            gc = gspread.authorize(creds)
            self._client = gc.open_by_key(self._spreadsheet_id)
            self._status = "configured"
            logger.info("Google Sheets client initialised successfully.")
            return self._client

        except Exception as exc:
            self._status = "error"
            sanitised = _sanitise_error(str(exc))
            logger.error("Google Sheets client init failed: %s", sanitised)
            raise SheetsAuthError(sanitised) from exc

    # ------------------------------------------------------------------
    # Low-level worksheet access
    # ------------------------------------------------------------------

    def _get_worksheet(self, tab_name: str):
        """Return the gspread Worksheet object for a named tab."""
        client = self._get_client()
        try:
            return client.worksheet(tab_name)
        except Exception as exc:
            raise SheetsServiceError(
                f"Worksheet '{tab_name}' not found: {exc}"
            ) from exc

    def _assert_write_allowed(self, tab_key: str) -> None:
        """Raise SheetsWriteProtectedError if tab is not write-allowed."""
        if tab_key not in WRITE_ALLOWED_TABS:
            raise SheetsWriteProtectedError(
                f"Tab '{tab_key}' ({SHEET_TABS.get(tab_key, '?')}) is read-only. "
                f"Write-allowed tabs: {sorted(WRITE_ALLOWED_TABS)}"
            )

    # ------------------------------------------------------------------
    # Public read methods
    # ------------------------------------------------------------------

    def read_tab(self, tab_key: str) -> List[Dict[str, Any]]:
        """
        Read all rows from a named tab as a list of dicts (header = keys).
        tab_key must be one of the SHEET_TABS keys.
        """
        if tab_key not in SHEET_TABS:
            raise SheetsServiceError(
                f"Unknown tab key '{tab_key}'. Valid keys: {list(SHEET_TABS.keys())}"
            )
        tab_name = SHEET_TABS[tab_key]
        ws = self._get_worksheet(tab_name)
        try:
            return ws.get_all_records()
        except Exception as exc:
            raise SheetsServiceError(
                f"Failed to read '{tab_name}': {_sanitise_error(str(exc))}"
            ) from exc

    def verify_all_tabs(self) -> Dict[str, str]:
        """
        Attempt to open all 14 worksheets and report status per tab.
        Returns: {tab_name: "FOUND" | "NOT_FOUND" | "ACCESS_ERROR"}
        """
        results: Dict[str, str] = {}
        client = self._get_client()
        for key, name in SHEET_TABS.items():
            try:
                client.worksheet(name)
                results[name] = "FOUND"
            except Exception as exc:
                err_str = str(exc).lower()
                if (
                    "not found" in err_str
                    or "no sheet" in err_str
                    or "worksheet" in err_str
                ):
                    results[name] = "NOT_FOUND"
                else:
                    results[name] = "ACCESS_ERROR"
        return results

    def get_sources(self) -> List[Dict]:
        """Read 01_SOURCES tab."""
        return self.read_tab("sources")

    def get_companies(self) -> List[Dict]:
        """Read 02_COMPANIES tab."""
        return self.read_tab("companies")

    def get_role_rules(self) -> List[Dict]:
        """Read 03_ROLE_RULES tab."""
        return self.read_tab("role_rules")

    def get_location_rules(self) -> List[Dict]:
        """Read 04_LOCATION_RULES tab."""
        return self.read_tab("location_rules")

    def get_include_rules(self) -> List[Dict]:
        """Read 06_INCLUDE_RULES tab."""
        return self.read_tab("include_rules")

    def get_exclude_rules(self) -> List[Dict]:
        """Read 07_EXCLUDE_RULES tab."""
        return self.read_tab("exclude_rules")

    def get_seed_config(self) -> List[Dict]:
        """Read 08_SEED_CONFIG tab."""
        return self.read_tab("seed_config")

    def get_jobs_staging(self) -> List[Dict]:
        """Read 09_JOBS_STAGING tab."""
        return self.read_tab("jobs_staging")

    def get_seed_runs(self) -> List[Dict]:
        """Read 10_SEED_RUNS tab (run history)."""
        return self.read_tab("seed_runs")

    def get_sync_logs(self, limit: int = 100) -> List[Dict]:
        """Read 11_SYNC_LOGS tab (most recent `limit` rows)."""
        rows = self.read_tab("sync_logs")
        return rows[-limit:] if len(rows) > limit else rows

    def get_source_errors(self) -> List[Dict]:
        """Read 12_SOURCE_ERRORS tab."""
        return self.read_tab("source_errors")

    def get_dashboard_metrics(self) -> Dict[str, Any]:
        """
        Read 13_DASHBOARD tab.
        IMPORTANT: Returns raw cell values only. NEVER writes to this tab
        to avoid overwriting sheet formulas.
        """
        rows = self.read_tab("dashboard")
        metrics: Dict[str, Any] = {}
        for row in rows:
            key = (
                row.get("Metric")
                or row.get("metric")
                or row.get("Key")
                or row.get("key")
            )
            val = row.get("Value") or row.get("value")
            if key:
                metrics[str(key)] = val
        return metrics

    # ------------------------------------------------------------------
    # Public write methods (staging only — 13_DASHBOARD and 14_API_CONFIG never written)
    # ------------------------------------------------------------------

    def append_sync_log(self, row: Dict[str, Any]) -> None:
        """Append a row to 11_SYNC_LOGS. Protected tab check enforced."""
        self._assert_write_allowed("sync_logs")
        ws = self._get_worksheet(SHEET_TABS["sync_logs"])
        ws.append_row(list(row.values()), value_input_option="RAW")
        logger.debug("Sync log entry appended.")

    def append_source_error(self, row: Dict[str, Any]) -> None:
        """Append a row to 12_SOURCE_ERRORS. Protected tab check enforced."""
        self._assert_write_allowed("source_errors")
        ws = self._get_worksheet(SHEET_TABS["source_errors"])
        ws.append_row(list(row.values()), value_input_option="RAW")
        logger.debug("Source error entry appended.")

    def append_seed_run(self, row: Dict[str, Any]) -> None:
        """Append a row to 10_SEED_RUNS. Protected tab check enforced."""
        self._assert_write_allowed("seed_runs")
        ws = self._get_worksheet(SHEET_TABS["seed_runs"])
        ws.append_row(list(row.values()), value_input_option="RAW")
        logger.debug("Seed run entry appended.")

    # ------------------------------------------------------------------
    # Connectivity check for admin health view
    # ------------------------------------------------------------------

    def connectivity_check(self) -> Dict[str, Any]:
        """
        Attempt to open the spreadsheet and return a safe status dict.
        NEVER includes credential values in the return value.
        """
        if not self.is_configured():
            return self.status()

        try:
            self._get_client()
            return {
                "status": "configured",
                "tabs_expected": len(SHEET_TABS),
            }
        except SheetsAuthError:
            return {
                "status": "error",
                "detail": "Authentication failed — check service account permissions",
            }
        except SheetsServiceError as exc:
            return {"status": "error", "detail": str(exc)[:120]}
        except Exception:
            return {"status": "error", "detail": "Unexpected error — see server logs"}


# ── Job Pipeline / Seeding Pipeline ──────────────────────────────────────────


class SeedingPipeline:
    """
    Implements the complete Job Seeding pipeline:
      SOURCES → FETCH → NORMALIZE → INCLUDE RULES → EXCLUDE RULES →
      VALIDATION → DEDUPLICATION → 09_JOBS_STAGING →
      BATCH → SAARTHI BACKEND → HTTP RESPONSE →
      10_SEED_RUNS / 11_SYNC_LOGS / 12_SOURCE_ERRORS → STATUS UPDATE

    DRY RUN CONTRACT:
      When dry_run=True, jobs are NEVER sent to the Saarthi backend.
      Sync logs record DRY_RUN_SKIPPED, not SYNCED.
      All hard barriers enforced in sync_jobs_to_backend().
    """

    def __init__(self, sheets: GoogleSheetsService, dry_run: bool = False) -> None:
        self.sheets = sheets
        self.dry_run = dry_run

    # ── Step 1: Load rules ──────────────────────────────────────────────────

    def load_include_rules(self) -> List[Dict]:
        """Read 06_INCLUDE_RULES for keyword/domain allow-list."""
        try:
            return self.sheets.get_include_rules()
        except SheetsServiceError:
            logger.warning("Could not load include rules; defaulting to allow-all.")
            return []

    def load_exclude_rules(self) -> List[Dict]:
        """Read 07_EXCLUDE_RULES for keyword block-list."""
        try:
            return self.sheets.get_exclude_rules()
        except SheetsServiceError:
            logger.warning("Could not load exclude rules; defaulting to block-none.")
            return []

    # ── Step 2: Normalize a raw job row ────────────────────────────────────

    def normalize_job(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize a raw row from 09_JOBS_STAGING into the Saarthi job schema.
        """
        company = str(raw.get("company") or raw.get("Company") or "").strip()
        title = str(raw.get("title") or raw.get("Title") or "").strip()
        location = str(raw.get("location") or raw.get("Location") or "").strip()
        return {
            "company": company,
            "title": title,
            "location": location,
            "description": str(raw.get("description") or raw.get("Description") or ""),
            "job_type": str(raw.get("job_type") or raw.get("JobType") or "Full-time"),
            "employment_type": str(
                raw.get("employment_type") or raw.get("EmploymentType") or "On-site"
            ),
            "apply_url": str(raw.get("apply_url") or raw.get("ApplyURL") or ""),
            "experience_required": str(
                raw.get("experience_required") or raw.get("Experience") or ""
            ),
            "source": "sheets",
            "dedup_hash": _dedup_hash(company, title, location),
        }

    # ── Step 3: Apply include/exclude rules ─────────────────────────────────

    @staticmethod
    def _passes_include_rules(job: Dict, rules: List[Dict]) -> bool:
        """Return True if job passes all include rules (or no rules exist)."""
        if not rules:
            return True
        text = f"{job.get('title', '')} {job.get('description', '')}".lower()
        for rule in rules:
            keyword = str(rule.get("keyword") or rule.get("Keyword") or "").lower()
            if keyword and keyword in text:
                return True
        return len(rules) == 0

    @staticmethod
    def _passes_exclude_rules(job: Dict, rules: List[Dict]) -> bool:
        """Return True if job is NOT blocked by any exclude rule."""
        text = f"{job.get('title', '')} {job.get('description', '')}".lower()
        for rule in rules:
            keyword = str(rule.get("keyword") or rule.get("Keyword") or "").lower()
            if keyword and keyword in text:
                return False
        return True

    def filter_jobs(
        self,
        jobs: List[Dict],
        include_rules: List[Dict],
        exclude_rules: List[Dict],
    ) -> List[Dict]:
        """Apply include and exclude rules to a job list."""
        accepted = []
        for job in jobs:
            if not self._passes_include_rules(job, include_rules):
                continue
            if not self._passes_exclude_rules(job, exclude_rules):
                continue
            accepted.append(job)
        return accepted

    # ── Step 4: Validate a normalised job ───────────────────────────────────

    @staticmethod
    def validate_job(job: Dict) -> Tuple[bool, Optional[str]]:
        """
        Return (True, None) if valid, else (False, reason).
        Checks: company, title non-empty; apply_url looks like a URL.
        """
        if not job.get("company"):
            return False, "Missing company"
        if not job.get("title"):
            return False, "Missing title"
        url = job.get("apply_url", "")
        if url and not url.startswith(("http://", "https://")):
            return False, f"Invalid apply_url: {url[:80]}"
        return True, None

    # ── Step 5: Sync to Saarthi backend (HTTP) ─────────────────────────────

    def sync_jobs_to_backend(
        self,
        jobs: List[Dict],
        backend_url: str,
        auth_token: str,
        batch_size: int = 10,
    ) -> Dict[str, Any]:
        """
        Send batches of validated jobs to the Saarthi backend.

        DRY RUN HARD BARRIER:
          If self.dry_run is True, no HTTP request is ever made.
          Returns a result dict with all statuses as DRY_RUN_SKIPPED.

        HTTP STATUS HANDLING:
          200/201 → SYNCED
          400     → FAILED_VALIDATION (no retry)
          401/403 → CRITICAL_AUTH_FAILURE (abort pipeline, no retry)
          409     → DUPLICATE_BACKEND (continue remaining)
          429     → Retry-After parse → exponential backoff, max 3 retries
          5xx     → retry, max 3 retries, graceful fail after exhaustion
        """
        if self.dry_run:
            # HARD BARRIER — no production writes under any circumstance
            logger.info("DRY RUN: Skipping backend sync for %d jobs.", len(jobs))
            return {
                "dry_run": True,
                "total": len(jobs),
                "synced": 0,
                "failed_validation": 0,
                "duplicate": 0,
                "auth_failure": 0,
                "server_error": 0,
                "skipped": len(jobs),
                "results": [
                    {"job": j.get("title", "?"), "status": SYNC_STATUS_DRY_RUN}
                    for j in jobs
                ],
            }

        try:
            import httpx
        except ImportError as exc:
            raise ImportError(
                "httpx is required for backend sync. Run: pip install httpx"
            ) from exc

        summary = {
            "dry_run": False,
            "total": len(jobs),
            "synced": 0,
            "failed_validation": 0,
            "duplicate": 0,
            "auth_failure": 0,
            "server_error": 0,
            "skipped": 0,
            "results": [],
        }

        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json",
        }

        def _send_batch(batch: List[Dict]) -> None:
            retries = 0
            while retries <= MAX_RETRIES:
                try:
                    resp = httpx.post(
                        backend_url,
                        json=batch,
                        headers=headers,
                        timeout=30,
                    )
                except Exception as exc:
                    logger.error("Backend HTTP error: %s", str(exc)[:120])
                    for job in batch:
                        summary["server_error"] += 1
                        summary["results"].append(
                            {
                                "job": job.get("title", "?"),
                                "status": SYNC_STATUS_SERVER_ERROR,
                                "detail": "Network error",
                            }
                        )
                    return

                code = resp.status_code

                if code in (200, 201):
                    for job in batch:
                        summary["synced"] += 1
                        summary["results"].append(
                            {
                                "job": job.get("title", "?"),
                                "status": SYNC_STATUS_SYNCED,
                            }
                        )
                    return

                elif code == 400:
                    for job in batch:
                        summary["failed_validation"] += 1
                        summary["results"].append(
                            {
                                "job": job.get("title", "?"),
                                "status": SYNC_STATUS_FAILED_VAL,
                                "detail": resp.text[:200],
                            }
                        )
                    return  # No retry

                elif code in (401, 403):
                    logger.critical(
                        "CRITICAL_AUTH_FAILURE from backend (HTTP %d). Aborting pipeline.",
                        code,
                    )
                    for job in batch:
                        summary["auth_failure"] += 1
                        summary["results"].append(
                            {
                                "job": job.get("title", "?"),
                                "status": SYNC_STATUS_AUTH_FAILURE,
                            }
                        )
                    raise SheetsAuthError(
                        f"Backend returned {code} — pipeline aborted. Check auth token."
                    )

                elif code == 409:
                    for job in batch:
                        summary["duplicate"] += 1
                        summary["results"].append(
                            {
                                "job": job.get("title", "?"),
                                "status": SYNC_STATUS_DUPLICATE,
                            }
                        )
                    return  # Continue remaining jobs

                elif code == 429:
                    retry_after = float(
                        resp.headers.get("Retry-After", BASE_BACKOFF_SECONDS)
                    )
                    wait = retry_after if retries == 0 else retry_after * (2**retries)
                    logger.warning(
                        "Rate limited (429). Waiting %.1fs before retry %d.",
                        wait,
                        retries + 1,
                    )
                    if retries >= MAX_RETRIES:
                        for job in batch:
                            summary["server_error"] += 1
                            summary["results"].append(
                                {
                                    "job": job.get("title", "?"),
                                    "status": SYNC_STATUS_RATE_LIMITED,
                                    "detail": f"Max retries ({MAX_RETRIES}) exhausted",
                                }
                            )
                        return
                    time.sleep(wait)
                    retries += 1

                elif code >= 500:
                    wait = BASE_BACKOFF_SECONDS * (2**retries)
                    logger.warning(
                        "Server error %d. Retrying in %.1fs (attempt %d/%d).",
                        code,
                        wait,
                        retries + 1,
                        MAX_RETRIES,
                    )
                    if retries >= MAX_RETRIES:
                        for job in batch:
                            summary["server_error"] += 1
                            summary["results"].append(
                                {
                                    "job": job.get("title", "?"),
                                    "status": SYNC_STATUS_SERVER_ERROR,
                                    "detail": f"HTTP {code} after {MAX_RETRIES} retries",
                                }
                            )
                        return
                    time.sleep(wait)
                    retries += 1

                else:
                    logger.error("Unexpected HTTP %d from backend.", code)
                    for job in batch:
                        summary["server_error"] += 1
                        summary["results"].append(
                            {
                                "job": job.get("title", "?"),
                                "status": SYNC_STATUS_SERVER_ERROR,
                                "detail": f"Unexpected HTTP {code}",
                            }
                        )
                    return

        # Batch the jobs and send
        for i in range(0, len(jobs), batch_size):
            batch = jobs[i : i + batch_size]
            try:
                _send_batch(batch)
            except SheetsAuthError:
                # Pipeline aborted on auth failure — mark remaining as skipped
                remaining = jobs[i + batch_size :]
                for job in remaining:
                    summary["skipped"] += 1
                    summary["results"].append(
                        {
                            "job": job.get("title", "?"),
                            "status": "SKIPPED_AFTER_AUTH_FAILURE",
                        }
                    )
                break

        return summary

    # ── Step 6: Log results back to Sheets ─────────────────────────────────

    def log_sync_results(
        self,
        run_id: str,
        summary: Dict[str, Any],
        source_name: str = "sheets",
    ) -> None:
        """
        Write result rows to 10_SEED_RUNS and 11_SYNC_LOGS.
        DRY RUN: Logs DRY_RUN_SKIPPED status, not SYNCED.
        """
        timestamp = datetime.now(timezone.utc).isoformat()

        # 10_SEED_RUNS summary row
        seed_run_row = {
            "run_id": run_id,
            "timestamp": timestamp,
            "source": source_name,
            "total": summary.get("total", 0),
            "synced": summary.get("synced", 0),
            "failed": summary.get("failed_validation", 0),
            "duplicate": summary.get("duplicate", 0),
            "server_error": summary.get("server_error", 0),
            "dry_run": "YES" if self.dry_run else "NO",
        }
        try:
            self.sheets.append_seed_run(seed_run_row)
        except Exception as exc:
            logger.warning(
                "Could not write seed run log: %s", _sanitise_error(str(exc))
            )

        # 11_SYNC_LOGS individual job rows
        for result in summary.get("results", []):
            log_row = {
                "run_id": run_id,
                "timestamp": timestamp,
                "job": result.get("job", ""),
                "status": result.get("status", ""),
                "detail": result.get("detail", ""),
                "dry_run": "YES" if self.dry_run else "NO",
            }
            try:
                self.sheets.append_sync_log(log_row)
            except Exception as exc:
                logger.warning(
                    "Could not write sync log: %s", _sanitise_error(str(exc))
                )

    def log_source_error(self, source: str, error: str, run_id: str = "") -> None:
        """Write an error entry to 12_SOURCE_ERRORS."""
        row = {
            "run_id": run_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": source,
            "error": _sanitise_error(error)[:500],
        }
        try:
            self.sheets.append_source_error(row)
        except Exception as exc:
            logger.warning(
                "Could not write source error: %s", _sanitise_error(str(exc))
            )

    # ── Full pipeline run ───────────────────────────────────────────────────

    def run(
        self,
        backend_url: str,
        auth_token: str,
        batch_size: int = 10,
        run_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Execute the full job seeding pipeline end-to-end:
          1. Load include/exclude rules
          2. Read staged jobs from 09_JOBS_STAGING
          3. Normalize
          4. Filter by rules
          5. Validate
          6. Deduplicate (via hash)
          7. Sync to backend (or DRY_RUN skip)
          8. Log results to 10/11/12 tabs
        """
        import uuid

        run_id = run_id or str(uuid.uuid4())[:8]
        logger.info("SeedingPipeline run=%s dry_run=%s started.", run_id, self.dry_run)

        include_rules = self.load_include_rules()
        exclude_rules = self.load_exclude_rules()

        # Read staging tab
        try:
            raw_jobs = self.sheets.get_jobs_staging()
        except SheetsServiceError as exc:
            self.log_source_error("09_JOBS_STAGING", str(exc), run_id)
            return {"error": "Could not read staging tab", "detail": str(exc)[:200]}

        # Normalize
        normalized = [self.normalize_job(r) for r in raw_jobs if r]

        # Filter
        filtered = self.filter_jobs(normalized, include_rules, exclude_rules)

        # Validate + deduplicate
        valid_jobs: List[Dict] = []
        seen_hashes: set = set()
        for job in filtered:
            ok, reason = self.validate_job(job)
            if not ok:
                logger.debug("Validation failed for '%s': %s", job.get("title"), reason)
                continue
            h = job.get("dedup_hash", "")
            if h in seen_hashes:
                logger.debug("Duplicate skipped: '%s'", job.get("title"))
                continue
            seen_hashes.add(h)
            valid_jobs.append(job)

        logger.info(
            "Pipeline run=%s: raw=%d normalized=%d filtered=%d valid=%d",
            run_id,
            len(raw_jobs),
            len(normalized),
            len(filtered),
            len(valid_jobs),
        )

        # Sync
        summary = self.sync_jobs_to_backend(
            valid_jobs, backend_url, auth_token, batch_size=batch_size
        )

        # Log
        self.log_sync_results(run_id=run_id, summary=summary)

        return {
            "run_id": run_id,
            "dry_run": self.dry_run,
            "raw_jobs": len(raw_jobs),
            "normalized": len(normalized),
            "filtered": len(filtered),
            "valid": len(valid_jobs),
            **summary,
        }


# Module-level singleton
sheets_service = GoogleSheetsService()
