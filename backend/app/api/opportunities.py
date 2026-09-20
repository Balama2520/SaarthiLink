"""
Opportunities API Router — Public Opportunity Signal Ingestion Pipeline
========================================================================
Endpoints allowing users to submit public job links and hiring signals
for verification and inclusion in the Saarthi Job Ecosystem.
"""

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from typing import Any, Optional
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services.discovery_service import DiscoveryService
from app.core.dependencies.auth import get_optional_current_user
from app.models.models import User

router = APIRouter(prefix="/opportunities", tags=["opportunities"])


from pydantic import BaseModel, model_validator


class OpportunitySubmissionRequest(BaseModel):
    public_job_url: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    location: Optional[str] = None
    skills: Optional[str] = None
    additional_context: Optional[str] = None
    submitter_email: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def map_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "company_name" in data and not data.get("company"):
                data["company"] = data.get("company_name")
            if "role_title" in data and not data.get("role"):
                data["role"] = data.get("role_title")
            if "required_skills" in data and not data.get("skills"):
                data["skills"] = data.get("required_skills")
        return data


@router.post("")
def submit_opportunity_signal(
    payload: OpportunitySubmissionRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
):
    """
    Submit a job opportunity signal (public job link or company details).
    Subject to deduplication and verification before staging.
    """
    if not payload.public_job_url and not payload.company:
        raise HTTPException(
            status_code=400,
            detail="Either public_job_url or company must be provided.",
        )

    session_id = x_session_id
    user_id = current_user.id if current_user else None

    svc = DiscoveryService(db)
    res = svc.submit_opportunity(
        data=payload.model_dump(),
        session_id=session_id,
        user_id=user_id,
    )
    return res
