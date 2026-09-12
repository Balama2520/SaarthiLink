"""
Admin: Google Sheets Job Seeding Control Center API
====================================================
All endpoints are admin-only. Credentials never appear in responses.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Any, Dict, List

from app.core.dependencies.auth import require_admin_user
from app.models.models import User
from app.services.sheets_service import sheets_service, SheetsServiceError, SheetsAuthError

router = APIRouter(prefix="/admin/sheets", tags=["admin-sheets"])


def _sheets_or_error():
    """Dependency: return sheets_service or 503 if not configured."""
    status = sheets_service.status()
    if status["status"] == "config_required":
        raise HTTPException(
            status_code=503,
            detail="Google Sheets integration not configured. Set GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON.",
        )
    return sheets_service


@router.get("/status")
def get_sheets_status(
    current_user: User = Depends(require_admin_user),
) -> Dict[str, Any]:
    """
    Health check for the Google Sheets Job Seeding Control Center.
    Returns configured / config_required / error.
    Credentials are never included in the response.
    """
    return sheets_service.connectivity_check()


@router.get("/sources")
def get_sources(
    current_user: User = Depends(require_admin_user),
) -> List[Dict]:
    """Read 01_SOURCES tab."""
    try:
        return sheets_service.get_sources()
    except (SheetsServiceError, SheetsAuthError) as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/companies")
def get_companies(
    current_user: User = Depends(require_admin_user),
) -> List[Dict]:
    """Read 02_COMPANIES tab."""
    try:
        return sheets_service.get_companies()
    except (SheetsServiceError, SheetsAuthError) as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/include-rules")
def get_include_rules(
    current_user: User = Depends(require_admin_user),
) -> List[Dict]:
    """Read 06_INCLUDE_RULES tab."""
    try:
        return sheets_service.get_include_rules()
    except (SheetsServiceError, SheetsAuthError) as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/exclude-rules")
def get_exclude_rules(
    current_user: User = Depends(require_admin_user),
) -> List[Dict]:
    """Read 07_EXCLUDE_RULES tab."""
    try:
        return sheets_service.get_exclude_rules()
    except (SheetsServiceError, SheetsAuthError) as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/seed-config")
def get_seed_config(
    current_user: User = Depends(require_admin_user),
) -> List[Dict]:
    """Read 08_SEED_CONFIG tab."""
    try:
        return sheets_service.get_seed_config()
    except (SheetsServiceError, SheetsAuthError) as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/jobs-staging")
def get_jobs_staging(
    current_user: User = Depends(require_admin_user),
) -> List[Dict]:
    """Read 09_JOBS_STAGING tab."""
    try:
        return sheets_service.get_jobs_staging()
    except (SheetsServiceError, SheetsAuthError) as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/seed-runs")
def get_seed_runs(
    current_user: User = Depends(require_admin_user),
) -> List[Dict]:
    """Read 10_SEED_RUNS tab."""
    try:
        return sheets_service.get_seed_runs()
    except (SheetsServiceError, SheetsAuthError) as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/sync-logs")
def get_sync_logs(
    limit: int = 100,
    current_user: User = Depends(require_admin_user),
) -> List[Dict]:
    """Read 11_SYNC_LOGS tab (most recent entries)."""
    try:
        return sheets_service.get_sync_logs(limit=limit)
    except (SheetsServiceError, SheetsAuthError) as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/source-errors")
def get_source_errors(
    current_user: User = Depends(require_admin_user),
) -> List[Dict]:
    """Read 12_SOURCE_ERRORS tab."""
    try:
        return sheets_service.get_source_errors()
    except (SheetsServiceError, SheetsAuthError) as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/dashboard")
def get_dashboard_metrics(
    current_user: User = Depends(require_admin_user),
) -> Dict[str, Any]:
    """Read 13_DASHBOARD tab metrics (read-only — never write to this tab)."""
    try:
        return sheets_service.get_dashboard_metrics()
    except (SheetsServiceError, SheetsAuthError) as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/run-pipeline")
def run_seeding_pipeline(
    dry_run: bool = True,
    current_user: User = Depends(require_admin_user),
) -> Dict[str, Any]:
    """
    Trigger job seeding pipeline run.
    dry_run=True by default for safety.
    Admin-only.
    """
    try:
        from app.services.sheets_service import SeedingPipeline
        pipeline = SeedingPipeline(sheets=sheets_service, dry_run=dry_run)
        include_rules = pipeline.load_include_rules()
        exclude_rules = pipeline.load_exclude_rules()
        staging_jobs = sheets_service.get_jobs_staging()

        normalized = [pipeline.normalize_job(j) for j in staging_jobs]
        filtered = pipeline.filter_jobs(normalized, include_rules, exclude_rules)

        return {
            "status": "success",
            "dry_run": dry_run,
            "total_staging_jobs": len(staging_jobs),
            "accepted_jobs": len(filtered),
            "details": f"Processed {len(staging_jobs)} staging jobs under dry_run={dry_run}."
        }
    except (SheetsServiceError, SheetsAuthError) as e:
        raise HTTPException(status_code=503, detail=str(e))

