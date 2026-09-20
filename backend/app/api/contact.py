"""
Contact API Router — Saarthi AI Official Contact & Inquiry Channel
===================================================================
Endpoints for sending contact messages and connection requests to
the Saarthi AI team (saarthi.ai.team@gmail.com).
"""

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr, Field
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services.discovery_service import DiscoveryService
from app.core.dependencies.auth import get_optional_current_user
from app.models.models import User
from app.core.config import get_settings

router = APIRouter(prefix="/contact", tags=["contact"])


from pydantic import BaseModel, EmailStr, Field, model_validator


class ContactRequestSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    role_type: Optional[str] = Field(
        None, description="student | job_seeker | recruiter | hr | founder | other"
    )
    reason: Optional[str] = Field(
        None, description="general | feedback | partnership | hiring | support"
    )
    message: str = Field(..., min_length=10, max_length=5000)
    consent_given: bool = True
    session_id: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def handle_reply_consent(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "reply_consent" in data and "consent_given" not in data:
                data["consent_given"] = data.pop("reply_consent")
        return data


@router.post("")
def submit_contact(
    payload: ContactRequestSchema,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
):
    """
    Submit a contact or connection request to Saarthi AI.
    Destination address: saarthi.ai.team@gmail.com
    """
    settings = get_settings()
    session_id = payload.session_id or x_session_id or "anonymous_contact"
    user_id = current_user.id if current_user else None

    data = payload.model_dump()
    data["session_id"] = session_id
    data["target_email"] = settings.SAARTHI_CONTACT_EMAIL

    svc = DiscoveryService(db)
    res = svc.submit_contact_request(data, user_id=user_id)
    return res


@router.get("/info")
def get_contact_info():
    """Returns official contact details for Saarthi AI."""
    settings = get_settings()
    return {
        "platform_name": "Saarthi AI",
        "contact_email": settings.SAARTHI_CONTACT_EMAIL,
        "lead_architect": "Bala Maneesh Ayanala",
        "github": "Balamaneesh2520",
        "huggingface_space": "Balamaneesh2520/saarthi-ai-brain",
        "support_status": "active",
    }
