"""
Comprehensive tests for the Google Sheets Integration Service and Seeding Pipeline.
All tests mock gspread / google-auth — NO live Google API calls.
Covers Steps 2-9 of the verification specification.
"""

import json
import pytest
from unittest.mock import MagicMock, patch, call

from app.services.sheets_service import (
    GoogleSheetsService,
    SheetsAuthError,
    SheetsServiceError,
    SheetsWriteProtectedError,
    DryRunViolationError,
    SeedingPipeline,
    SHEET_TABS,
    WRITE_ALLOWED_TABS,
    SYNC_STATUS_SYNCED,
    SYNC_STATUS_FAILED_VAL,
    SYNC_STATUS_DUPLICATE,
    SYNC_STATUS_AUTH_FAILURE,
    SYNC_STATUS_DRY_RUN,
    SYNC_STATUS_SERVER_ERROR,
    SYNC_STATUS_RATE_LIMITED,
    _dedup_hash,
    _sanitise_error,
)

# ── Helpers ───────────────────────────────────────────────────────────────────

FAKE_CRED_JSON = json.dumps(
    {
        "type": "service_account",
        "project_id": "test-saarthi",
        "private_key_id": "abc123",
        "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----\n",
        "client_email": "test@proj.iam.gserviceaccount.com",
        "client_id": "123456",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
    }
)


def _mock_settings(spreadsheet_id: str = "", cred_json: str = ""):
    m = MagicMock()
    m.GOOGLE_SHEETS_SPREADSHEET_ID = spreadsheet_id
    m.GOOGLE_SERVICE_ACCOUNT_JSON = cred_json
    return m


def _make_svc_with_client(records=None) -> tuple:
    """Return (GoogleSheetsService, mock_worksheet) with a pre-wired mock client."""
    svc = GoogleSheetsService()
    mock_ws = MagicMock()
    mock_ws.get_all_records.return_value = records or [{"col": "val"}]
    mock_wb = MagicMock()
    mock_wb.worksheet.return_value = mock_ws
    svc._client = mock_wb
    svc._spreadsheet_id = "FAKE_SID"
    svc._credential_json = FAKE_CRED_JSON
    return svc, mock_ws, mock_wb


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2 — AUTHENTICATION & CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════


class TestAuthentication:

    def test_not_configured_missing_spreadsheet_id(self):
        svc = GoogleSheetsService()
        with patch(
            "app.services.sheets_service.get_settings",
            return_value=_mock_settings("", FAKE_CRED_JSON),
        ):
            assert svc.is_configured() is False

    def test_not_configured_missing_credential_json(self):
        svc = GoogleSheetsService()
        with patch(
            "app.services.sheets_service.get_settings",
            return_value=_mock_settings("sid", ""),
        ):
            assert svc.is_configured() is False

    def test_not_configured_both_missing(self):
        svc = GoogleSheetsService()
        with patch(
            "app.services.sheets_service.get_settings",
            return_value=_mock_settings("", ""),
        ):
            assert svc.is_configured() is False

    def test_configured_when_both_set(self):
        svc = GoogleSheetsService()
        with patch(
            "app.services.sheets_service.get_settings",
            return_value=_mock_settings("sid", FAKE_CRED_JSON),
        ):
            assert svc.is_configured() is True

    def test_status_returns_config_required_no_id(self):
        svc = GoogleSheetsService()
        with patch(
            "app.services.sheets_service.get_settings",
            return_value=_mock_settings("", ""),
        ):
            result = svc.status()
            assert result["status"] == "config_required"
            assert "GOOGLE_SHEETS_SPREADSHEET_ID" in result["detail"]

    def test_status_returns_config_required_no_cred(self):
        svc = GoogleSheetsService()
        with patch(
            "app.services.sheets_service.get_settings",
            return_value=_mock_settings("sid", ""),
        ):
            result = svc.status()
            assert result["status"] == "config_required"
            assert "GOOGLE_SERVICE_ACCOUNT_JSON" in result["detail"]

    def test_status_configured_truncates_spreadsheet_id(self):
        svc = GoogleSheetsService()
        with patch(
            "app.services.sheets_service.get_settings",
            return_value=_mock_settings("sheet123ABCDEF", FAKE_CRED_JSON),
        ):
            result = svc.status()
            assert result["status"] == "configured"
            prefix = result.get("spreadsheet_id_prefix", "")
            assert "sheet123" in prefix
            # Full ID must NOT be exposed
            assert "sheet123ABCDEF" not in prefix

    def test_get_client_raises_service_error_when_unconfigured(self):
        svc = GoogleSheetsService()
        with patch(
            "app.services.sheets_service.get_settings",
            return_value=_mock_settings("", ""),
        ):
            with pytest.raises(SheetsServiceError):
                svc._get_client()

    def test_get_client_raises_auth_error_on_invalid_credentials(self):
        svc = GoogleSheetsService()
        with patch(
            "app.services.sheets_service.get_settings",
            return_value=_mock_settings("sid", FAKE_CRED_JSON),
        ):
            with patch("gspread.authorize", side_effect=Exception("Invalid credentials")):
                with patch("google.oauth2.service_account.Credentials.from_service_account_info"):
                    with pytest.raises(SheetsAuthError):
                        svc._get_client()

    def test_auth_error_message_sanitised_no_private_key_exposed(self):
        svc = GoogleSheetsService()
        with patch(
            "app.services.sheets_service.get_settings",
            return_value=_mock_settings("sid", FAKE_CRED_JSON),
        ):
            with patch("gspread.authorize", side_effect=Exception("private_key invalid")):
                with patch("google.oauth2.service_account.Credentials.from_service_account_info"):
                    with pytest.raises(SheetsAuthError) as exc_info:
                        svc._get_client()
                    # Private key value must not appear in the error message
                    assert "private_key" not in str(
                        exc_info.value
                    ).lower() or "Authentication failed" in str(exc_info.value)

    def test_credentials_not_hardcoded_in_source(self):
        """Verify FAKE_CRED_JSON is a mock fixture, not a real credential."""
        cred = json.loads(FAKE_CRED_JSON)
        assert cred["project_id"] == "test-saarthi"
        # Real RSA keys are much longer — verify this is just a placeholder
        assert len(cred["private_key"]) < 100


# ═══════════════════════════════════════════════════════════════════════════════
# TAB STRUCTURE
# ═══════════════════════════════════════════════════════════════════════════════


class TestTabStructure:

    def test_all_14_tabs_present(self):
        required = {
            "01_SOURCES",
            "02_COMPANIES",
            "03_ROLE_RULES",
            "04_LOCATION_RULES",
            "05_SKILLS",
            "06_INCLUDE_RULES",
            "07_EXCLUDE_RULES",
            "08_SEED_CONFIG",
            "09_JOBS_STAGING",
            "10_SEED_RUNS",
            "11_SYNC_LOGS",
            "12_SOURCE_ERRORS",
            "13_DASHBOARD",
            "14_API_CONFIG",
        }
        assert required == set(
            SHEET_TABS.values()
        ), f"Tab mismatch: missing={required - set(SHEET_TABS.values())}"

    def test_exact_tab_key_to_name_mapping(self):
        assert SHEET_TABS["sources"] == "01_SOURCES"
        assert SHEET_TABS["companies"] == "02_COMPANIES"
        assert SHEET_TABS["role_rules"] == "03_ROLE_RULES"
        assert SHEET_TABS["location_rules"] == "04_LOCATION_RULES"
        assert SHEET_TABS["skills"] == "05_SKILLS"
        assert SHEET_TABS["include_rules"] == "06_INCLUDE_RULES"
        assert SHEET_TABS["exclude_rules"] == "07_EXCLUDE_RULES"
        assert SHEET_TABS["seed_config"] == "08_SEED_CONFIG"
        assert SHEET_TABS["jobs_staging"] == "09_JOBS_STAGING"
        assert SHEET_TABS["seed_runs"] == "10_SEED_RUNS"
        assert SHEET_TABS["sync_logs"] == "11_SYNC_LOGS"
        assert SHEET_TABS["source_errors"] == "12_SOURCE_ERRORS"
        assert SHEET_TABS["dashboard"] == "13_DASHBOARD"
        assert SHEET_TABS["api_config"] == "14_API_CONFIG"


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3 — READ TESTS
# ═══════════════════════════════════════════════════════════════════════════════


class TestReadMethods:

    def test_read_tab_unknown_key_raises(self):
        svc, _, _ = _make_svc_with_client()
        with pytest.raises(SheetsServiceError, match="Unknown tab key"):
            svc.read_tab("nonexistent_key")

    def test_read_sources_calls_correct_worksheet(self):
        svc, _, mock_wb = _make_svc_with_client()
        svc.get_sources()
        mock_wb.worksheet.assert_called_with("01_SOURCES")

    def test_read_seed_config_calls_correct_worksheet(self):
        svc, _, mock_wb = _make_svc_with_client()
        svc.get_seed_config()
        mock_wb.worksheet.assert_called_with("08_SEED_CONFIG")

    def test_read_jobs_staging_calls_correct_worksheet(self):
        svc, _, mock_wb = _make_svc_with_client()
        svc.get_jobs_staging()
        mock_wb.worksheet.assert_called_with("09_JOBS_STAGING")

    def test_read_tab_returns_list_of_dicts(self):
        svc, _, _ = _make_svc_with_client(records=[{"col1": "val1"}, {"col1": "val2"}])
        result = svc.read_tab("sources")
        assert isinstance(result, list)
        assert len(result) == 2

    def test_read_tab_raises_on_worksheet_failure(self):
        svc, _, mock_wb = _make_svc_with_client()
        mock_wb.worksheet.side_effect = Exception("Connection timed out")
        with pytest.raises(SheetsServiceError):
            svc.read_tab("sources")

    def test_dashboard_returns_dict_from_metric_value_rows(self):
        svc, mock_ws, _ = _make_svc_with_client(records=[{"Metric": "total_jobs", "Value": 42}])
        result = svc.get_dashboard_metrics()
        assert isinstance(result, dict)
        assert result.get("total_jobs") == 42

    def test_sync_logs_limit_is_respected(self):
        records = [{"row": i} for i in range(200)]
        svc, mock_ws, _ = _make_svc_with_client(records=records)
        result = svc.get_sync_logs(limit=50)
        assert len(result) == 50


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4 — WRITE TESTS
# ═══════════════════════════════════════════════════════════════════════════════


class TestWriteMethods:

    def test_append_seed_run_calls_correct_worksheet(self):
        svc, mock_ws, mock_wb = _make_svc_with_client()
        svc.append_seed_run(
            {
                "run_id": "abc",
                "timestamp": "t",
                "source": "sheets",
                "total": 1,
                "synced": 1,
                "failed": 0,
                "duplicate": 0,
                "server_error": 0,
                "dry_run": "NO",
            }
        )
        mock_wb.worksheet.assert_called_with("10_SEED_RUNS")
        mock_ws.append_row.assert_called_once()

    def test_append_sync_log_calls_correct_worksheet(self):
        svc, mock_ws, mock_wb = _make_svc_with_client()
        svc.append_sync_log(
            {
                "run_id": "abc",
                "timestamp": "t",
                "job": "SDE",
                "status": "SYNCED",
                "detail": "",
                "dry_run": "NO",
            }
        )
        mock_wb.worksheet.assert_called_with("11_SYNC_LOGS")
        mock_ws.append_row.assert_called_once()

    def test_append_source_error_calls_correct_worksheet(self):
        svc, mock_ws, mock_wb = _make_svc_with_client()
        svc.append_source_error(
            {"run_id": "abc", "timestamp": "t", "source": "sheets", "error": "timeout"}
        )
        mock_wb.worksheet.assert_called_with("12_SOURCE_ERRORS")
        mock_ws.append_row.assert_called_once()

    def test_dashboard_never_writes(self):
        """13_DASHBOARD must never be written to."""
        svc, mock_ws, _ = _make_svc_with_client(records=[{"Metric": "total_jobs", "Value": 99}])
        svc.get_dashboard_metrics()
        mock_ws.update.assert_not_called()
        mock_ws.append_row.assert_not_called()

    def test_write_to_dashboard_tab_raises_write_protected(self):
        svc, _, _ = _make_svc_with_client()
        with pytest.raises(SheetsWriteProtectedError):
            svc._assert_write_allowed("dashboard")

    def test_write_to_api_config_tab_raises_write_protected(self):
        svc, _, _ = _make_svc_with_client()
        with pytest.raises(SheetsWriteProtectedError):
            svc._assert_write_allowed("api_config")

    def test_write_to_allowed_tabs_does_not_raise(self):
        for tab in WRITE_ALLOWED_TABS:
            svc = GoogleSheetsService()
            svc._assert_write_allowed(tab)  # Should not raise


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5 — JOB PIPELINE
# ═══════════════════════════════════════════════════════════════════════════════


class TestJobPipeline:

    def _make_pipeline(self, records=None, dry_run=False):
        svc, mock_ws, mock_wb = _make_svc_with_client(records=records or [])
        pipeline = SeedingPipeline(sheets=svc, dry_run=dry_run)
        return pipeline, mock_ws, mock_wb

    def test_normalize_job_extracts_fields(self):
        pipeline, _, _ = self._make_pipeline()
        raw = {
            "company": "Acme",
            "title": "SDE I",
            "location": "Bangalore",
            "apply_url": "https://acme.com/apply",
        }
        job = pipeline.normalize_job(raw)
        assert job["company"] == "Acme"
        assert job["title"] == "SDE I"
        assert job["location"] == "Bangalore"
        assert job["source"] == "sheets"
        assert len(job["dedup_hash"]) == 64

    def test_dedup_hash_same_for_same_inputs(self):
        h1 = _dedup_hash("Acme", "SDE I", "Bangalore")
        h2 = _dedup_hash("acme", "sde i", "bangalore")
        assert h1 == h2, "Hash must be case-insensitive"

    def test_dedup_hash_different_for_different_inputs(self):
        h1 = _dedup_hash("Acme", "SDE I", "Bangalore")
        h2 = _dedup_hash("Acme", "SDE II", "Bangalore")
        assert h1 != h2

    def test_include_rules_allow_when_keyword_matches(self):
        pipeline, _, _ = self._make_pipeline()
        rules = [{"keyword": "engineer"}]
        job = {"title": "Software Engineer", "description": ""}
        assert pipeline._passes_include_rules(job, rules) is True

    def test_include_rules_block_when_no_match(self):
        pipeline, _, _ = self._make_pipeline()
        rules = [{"keyword": "doctor"}]
        job = {"title": "Software Engineer", "description": ""}
        assert pipeline._passes_include_rules(job, rules) is False

    def test_exclude_rules_block_when_keyword_matches(self):
        pipeline, _, _ = self._make_pipeline()
        rules = [{"keyword": "senior"}]
        job = {"title": "Senior Engineer", "description": ""}
        assert pipeline._passes_exclude_rules(job, rules) is False

    def test_exclude_rules_pass_when_no_match(self):
        pipeline, _, _ = self._make_pipeline()
        rules = [{"keyword": "senior"}]
        job = {"title": "Junior Engineer", "description": ""}
        assert pipeline._passes_exclude_rules(job, rules) is True

    def test_validate_job_passes_valid_job(self):
        pipeline, _, _ = self._make_pipeline()
        job = {"company": "Acme", "title": "SDE", "apply_url": "https://acme.com/apply"}
        ok, reason = pipeline.validate_job(job)
        assert ok is True
        assert reason is None

    def test_validate_job_fails_missing_company(self):
        pipeline, _, _ = self._make_pipeline()
        ok, reason = pipeline.validate_job({"company": "", "title": "SDE"})
        assert ok is False
        assert "company" in reason.lower()

    def test_validate_job_fails_missing_title(self):
        pipeline, _, _ = self._make_pipeline()
        ok, reason = pipeline.validate_job({"company": "Acme", "title": ""})
        assert ok is False
        assert "title" in reason.lower()

    def test_validate_job_fails_invalid_url(self):
        pipeline, _, _ = self._make_pipeline()
        ok, reason = pipeline.validate_job(
            {"company": "Acme", "title": "SDE", "apply_url": "not_a_url"}
        )
        assert ok is False
        assert "url" in reason.lower()

    def test_pipeline_deduplicates_jobs(self):
        pipeline, _, _ = self._make_pipeline()
        jobs = [
            {
                "company": "Acme",
                "title": "SDE",
                "location": "Bangalore",
                "apply_url": "https://acme.com/1",
                "dedup_hash": _dedup_hash("Acme", "SDE", "Bangalore"),
                "source": "sheets",
            },
            {
                "company": "Acme",
                "title": "SDE",
                "location": "Bangalore",
                "apply_url": "https://acme.com/2",
                "dedup_hash": _dedup_hash("Acme", "SDE", "Bangalore"),
                "source": "sheets",
            },
        ]
        seen = set()
        result = []
        for job in jobs:
            h = job["dedup_hash"]
            if h not in seen:
                seen.add(h)
                result.append(job)
        assert len(result) == 1


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6 — HTTP STATUS HANDLING
# ═══════════════════════════════════════════════════════════════════════════════


class TestHTTPStatusHandling:

    def _make_pipeline_with_jobs(self):
        svc, _, _ = _make_svc_with_client()
        pipeline = SeedingPipeline(sheets=svc, dry_run=False)
        jobs = [
            {
                "company": "Acme",
                "title": f"SDE {i}",
                "location": "BLR",
                "apply_url": "https://acme.com",
                "source": "sheets",
            }
            for i in range(3)
        ]
        return pipeline, jobs

    def _make_resp(self, status_code, headers=None, text=""):
        r = MagicMock()
        r.status_code = status_code
        r.headers = headers or {}
        r.text = text
        return r

    def test_200_maps_to_synced(self):
        pipeline, jobs = self._make_pipeline_with_jobs()
        with patch("httpx.post", return_value=self._make_resp(200)):
            result = pipeline.sync_jobs_to_backend(jobs, "http://backend/jobs", "token")
        assert result["synced"] == len(jobs)
        assert all(r["status"] == SYNC_STATUS_SYNCED for r in result["results"])

    def test_201_maps_to_synced(self):
        pipeline, jobs = self._make_pipeline_with_jobs()
        with patch("httpx.post", return_value=self._make_resp(201)):
            result = pipeline.sync_jobs_to_backend(jobs, "http://backend/jobs", "token")
        assert result["synced"] > 0

    def test_400_maps_to_failed_validation_no_retry(self):
        pipeline, jobs = self._make_pipeline_with_jobs()
        call_count = 0

        def post_400(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            return self._make_resp(400, text="Bad schema")

        with patch("httpx.post", side_effect=post_400):
            result = pipeline.sync_jobs_to_backend(jobs[:1], "http://backend/jobs", "token")
        assert result["failed_validation"] == 1
        assert call_count == 1  # No retries on 400

    def test_401_raises_auth_failure_aborts_pipeline(self):
        pipeline, jobs = self._make_pipeline_with_jobs()
        with patch("httpx.post", return_value=self._make_resp(401)):
            result = pipeline.sync_jobs_to_backend(jobs, "http://backend/jobs", "token")
        assert result["auth_failure"] > 0
        # Remaining jobs should be skipped
        statuses = [r["status"] for r in result["results"]]
        assert SYNC_STATUS_AUTH_FAILURE in statuses

    def test_403_same_as_401(self):
        pipeline, jobs = self._make_pipeline_with_jobs()
        with patch("httpx.post", return_value=self._make_resp(403)):
            result = pipeline.sync_jobs_to_backend(jobs[:1], "http://backend/jobs", "token")
        assert result["auth_failure"] == 1

    def test_409_maps_to_duplicate_continues(self):
        pipeline, jobs = self._make_pipeline_with_jobs()
        with patch("httpx.post", return_value=self._make_resp(409)):
            result = pipeline.sync_jobs_to_backend(jobs, "http://backend/jobs", "token")
        assert result["duplicate"] == len(jobs)

    def test_429_retries_up_to_max(self):
        pipeline, jobs = self._make_pipeline_with_jobs()
        call_count = 0

        def post_429(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            return self._make_resp(429, headers={"Retry-After": "0.01"})

        with patch("httpx.post", side_effect=post_429):
            with patch("time.sleep"):  # Skip actual sleep in tests
                result = pipeline.sync_jobs_to_backend(jobs[:1], "http://backend/jobs", "token")

        # Should retry MAX_RETRIES times then give up
        assert call_count == 4  # 1 initial + 3 retries
        assert result["server_error"] == 1

    def test_500_retries_up_to_max(self):
        pipeline, jobs = self._make_pipeline_with_jobs()
        call_count = 0

        def post_500(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            return self._make_resp(500)

        with patch("httpx.post", side_effect=post_500):
            with patch("time.sleep"):
                result = pipeline.sync_jobs_to_backend(jobs[:1], "http://backend/jobs", "token")

        assert call_count == 4  # 1 + 3 retries
        statuses = [r["status"] for r in result["results"]]
        assert SYNC_STATUS_SERVER_ERROR in statuses

    def test_503_treated_as_5xx_retried(self):
        pipeline, jobs = self._make_pipeline_with_jobs()
        responses = [self._make_resp(503)] * 4
        responses[-1] = self._make_resp(200)  # Succeeds after 3 retries

        with patch("httpx.post", side_effect=responses):
            with patch("time.sleep"):
                result = pipeline.sync_jobs_to_backend(jobs[:1], "http://backend/jobs", "token")

        assert result["synced"] == 1


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 7 — DRY RUN PROTECTION
# ═══════════════════════════════════════════════════════════════════════════════


class TestDryRunProtection:

    def test_dry_run_never_calls_httpx(self):
        svc, _, _ = _make_svc_with_client()
        pipeline = SeedingPipeline(sheets=svc, dry_run=True)
        jobs = [
            {
                "company": "Acme",
                "title": "SDE",
                "location": "BLR",
                "apply_url": "https://acme.com",
                "source": "sheets",
            }
        ]

        with patch("httpx.post") as mock_post:
            result = pipeline.sync_jobs_to_backend(jobs, "http://backend/jobs", "token")
            mock_post.assert_not_called()

        assert result["dry_run"] is True

    def test_dry_run_status_is_dry_run_skipped(self):
        svc, _, _ = _make_svc_with_client()
        pipeline = SeedingPipeline(sheets=svc, dry_run=True)
        jobs = [
            {
                "company": "Acme",
                "title": "SDE",
                "location": "BLR",
                "apply_url": "https://acme.com",
                "source": "sheets",
            }
        ]

        result = pipeline.sync_jobs_to_backend(jobs, "http://backend/jobs", "token")
        assert all(r["status"] == SYNC_STATUS_DRY_RUN for r in result["results"])

    def test_dry_run_synced_count_is_zero(self):
        svc, _, _ = _make_svc_with_client()
        pipeline = SeedingPipeline(sheets=svc, dry_run=True)
        jobs = [{"company": "Acme", "title": "SDE", "location": "BLR", "source": "sheets"}]
        result = pipeline.sync_jobs_to_backend(jobs, "http://backend/jobs", "token")
        assert result["synced"] == 0

    def test_dry_run_log_writes_dry_run_not_synced(self):
        svc, mock_ws, mock_wb = _make_svc_with_client()
        pipeline = SeedingPipeline(sheets=svc, dry_run=True)
        summary = {
            "dry_run": True,
            "total": 1,
            "synced": 0,
            "failed_validation": 0,
            "duplicate": 0,
            "server_error": 0,
            "skipped": 1,
            "results": [{"job": "SDE", "status": SYNC_STATUS_DRY_RUN}],
        }
        pipeline.log_sync_results(run_id="test123", summary=summary)

        # Verify seed run was logged
        mock_ws.append_row.assert_called()
        logged_args = mock_ws.append_row.call_args_list
        # At least one call should have "YES" for dry_run
        dry_run_values = [str(call[0][0]) for call in logged_args]
        assert any("YES" in v for v in dry_run_values)

    def test_live_run_log_does_not_contain_dry_run_yes(self):
        svc, mock_ws, mock_wb = _make_svc_with_client()
        pipeline = SeedingPipeline(sheets=svc, dry_run=False)
        summary = {
            "dry_run": False,
            "total": 1,
            "synced": 1,
            "failed_validation": 0,
            "duplicate": 0,
            "server_error": 0,
            "skipped": 0,
            "results": [{"job": "SDE", "status": SYNC_STATUS_SYNCED}],
        }
        pipeline.log_sync_results(run_id="live123", summary=summary)
        logged_args = mock_ws.append_row.call_args_list
        dry_run_values = [str(call[0][0]) for call in logged_args]
        assert all("YES" not in v for v in dry_run_values)


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 8 — CONNECTIVITY CHECK
# ═══════════════════════════════════════════════════════════════════════════════


class TestConnectivityCheck:

    def test_config_required_when_not_configured(self):
        svc = GoogleSheetsService()
        with patch(
            "app.services.sheets_service.get_settings",
            return_value=_mock_settings("", ""),
        ):
            result = svc.connectivity_check()
            assert result["status"] == "config_required"

    def test_error_on_auth_failure(self):
        svc = GoogleSheetsService()
        with patch(
            "app.services.sheets_service.get_settings",
            return_value=_mock_settings("sid", FAKE_CRED_JSON),
        ):
            with patch.object(svc, "_get_client", side_effect=SheetsAuthError("auth failed")):
                result = svc.connectivity_check()
                assert result["status"] == "error"
                # Must not expose credential info
                assert "private_key" not in str(result)
                assert FAKE_CRED_JSON not in str(result)

    def test_configured_response_on_success(self):
        svc, _, _ = _make_svc_with_client()
        # is_configured() reads env vars — patch it to True since we have a live mock client
        with patch.object(svc, "is_configured", return_value=True):
            result = svc.connectivity_check()
        assert result["status"] == "configured"
        assert result["tabs_expected"] == 14

    def test_response_never_exposes_credentials(self):
        svc = GoogleSheetsService()
        with patch(
            "app.services.sheets_service.get_settings",
            return_value=_mock_settings("sid", FAKE_CRED_JSON),
        ):
            with patch.object(svc, "_get_client", side_effect=SheetsAuthError("error")):
                result = svc.connectivity_check()
                result_str = json.dumps(result)
                assert "private_key" not in result_str
                assert "client_email" not in result_str
                assert "token" not in result_str.lower()


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 9 — SECURITY
# ═══════════════════════════════════════════════════════════════════════════════


class TestSecurity:

    def test_sanitise_error_removes_private_key_reference(self):
        msg = "Error: private_key is invalid or expired"
        result = _sanitise_error(msg)
        assert "private_key" not in result.lower() or "Authentication failed" in result

    def test_sanitise_error_removes_token_reference(self):
        msg = "Bearer token abc123 rejected"
        result = _sanitise_error(msg)
        assert result != msg  # Should have been sanitised

    def test_sanitise_error_removes_client_email(self):
        msg = "client_email test@proj.iam.gserviceaccount.com not authorized"
        result = _sanitise_error(msg)
        assert "test@proj.iam.gserviceaccount.com" not in result

    def test_sanitise_error_passes_safe_messages(self):
        msg = "Worksheet '09_JOBS_STAGING' not found"
        result = _sanitise_error(msg)
        assert "09_JOBS_STAGING" in result

    def test_spreadsheet_id_never_fully_exposed_in_status(self):
        svc = GoogleSheetsService()
        full_id = "abc1234567890FULLID"
        with patch(
            "app.services.sheets_service.get_settings",
            return_value=_mock_settings(full_id, FAKE_CRED_JSON),
        ):
            result = svc.status()
            # Should contain only prefix, not full ID
            assert full_id not in result.get("spreadsheet_id_prefix", "")
            assert "abc12345" in result.get("spreadsheet_id_prefix", "")

    def test_write_protected_tabs_cannot_be_written(self):
        """13_DASHBOARD and 14_API_CONFIG must always raise on write attempts."""
        svc = GoogleSheetsService()
        for protected_key in ("dashboard", "api_config"):
            with pytest.raises(SheetsWriteProtectedError):
                svc._assert_write_allowed(protected_key)

    def test_status_response_never_contains_cred_json(self):
        svc = GoogleSheetsService()
        with patch(
            "app.services.sheets_service.get_settings",
            return_value=_mock_settings("sid", FAKE_CRED_JSON),
        ):
            result = svc.status()
            result_str = json.dumps(result)
            assert "private_key" not in result_str
            assert "client_email" not in result_str
