"""
Discovery Service — Business Logic for Saarthi Discovery & Intelligence System
==============================================================================
Handles user discovery submissions, multi-step feedback ingestion, opportunity signal
validation/deduplication, contact forms, consent logging, and feedback analytics.
"""
import hashlib
import json
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.repositories.discovery_repository import DiscoveryRepository
from app.models.models import (
    ConsentRecord,
    UserDiscoveryProfile,
    CareerChallenge,
    FeatureFeedback,
    ProductFeedback,
    OpportunitySignal,
    CompanyProfile,
    ContactRequest,
)

logger = logging.getLogger(__name__)


def _hash_str(val: str) -> str:
    """Return sha256 hex digest of string for privacy-preserving hashes."""
    if not val:
        return ""
    return hashlib.sha256(val.encode("utf-8")).hexdigest()


class DiscoveryService:

    def __init__(self, db: Session):
        self.db = db
        self.repo = DiscoveryRepository(db)

    # ── Consent ─────────────────────────────────────────────────────────────
    def record_consent(
        self,
        session_id: str,
        user_id: Optional[int] = None,
        consent_given: bool = True,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> ConsentRecord:
        ip_h = _hash_str(ip_address) if ip_address else None
        ua_h = _hash_str(user_agent) if user_agent else None
        return self.repo.create_consent(
            session_id=session_id,
            user_id=user_id,
            consent_given=consent_given,
            ip_hash=ip_h,
            user_agent_hash=ua_h,
        )

    # ── Full Discovery Submission ───────────────────────────────────────────
    def submit_discovery_flow(
        self,
        session_id: str,
        data: Dict[str, Any],
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Process a complete multi-step discovery submission end-to-end.
        """
        # 1. Record consent if provided
        consent_given = data.get("consent_given", True)
        consent = self.record_consent(
            session_id=session_id,
            user_id=user_id,
            consent_given=consent_given,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # 2. Get or create profile
        user_type = data.get("user_type")
        user_type_other = data.get("user_type_other")
        profile = self.repo.get_or_create_profile(
            session_id=session_id,
            user_id=user_id,
            user_type=user_type,
            user_type_other=user_type_other,
            source=data.get("source", "discover_page"),
        )
        profile.consent_id = consent.id

        # 3. User Intents
        intents_data = data.get("intents", [])
        if intents_data:
            self.repo.save_intents(profile.id, intents_data)

        # 4. Career Challenges
        challenges_data = data.get("challenges")
        if challenges_data:
            self.repo.save_career_challenge(profile.id, challenges_data)

        # 5. Feature Feedbacks
        features_data = data.get("feature_feedbacks", [])
        if features_data:
            self.repo.save_feature_feedbacks(profile.id, features_data)

        # 6. Product Feedback
        product_data = data.get("product_feedback")
        if product_data:
            self.repo.save_product_feedback(profile.id, product_data)

        # 7. Opportunity Signal (optional)
        opp_data = data.get("opportunity_signal")
        if opp_data and (opp_data.get("public_job_url") or opp_data.get("company")):
            dedup = _hash_str(
                f"{(opp_data.get('company') or '').lower()}:{(opp_data.get('role') or '').lower()}:{(opp_data.get('public_job_url') or '').lower()}"
            )
            opp_data["dedup_hash"] = dedup
            self.repo.create_opportunity_signal(opp_data, profile_id=profile.id)

        # 8. Company Profile (optional recruiter/employer flow)
        company_data = data.get("company_profile")
        if company_data and company_data.get("company_name"):
            cp = self.repo.create_company_profile(company_data, profile_id=profile.id)
            hiring_data = data.get("hiring_signal")
            if hiring_data:
                self.repo.create_hiring_signal(cp.id, hiring_data)
            job_sub = data.get("job_submission")
            if job_sub and job_sub.get("title"):
                self.repo.create_job_submission(job_sub, company_profile_id=cp.id)

        # 9. Mark status complete
        self.repo.update_profile_status(profile.id, "completed")
        self.repo.log_event(
            event_type="discovery_completed",
            entity_id=profile.id,
            session_id=session_id,
            user_id=user_id,
            payload_json=json.dumps({"user_type": user_type}),
        )

        return {
            "status": "success",
            "profile_id": profile.id,
            "session_id": session_id,
            "message": "Thank you for contributing to Saarthi AI Discovery!",
        }

    # ── Opportunity Ingestion Service ───────────────────────────────────────
    def submit_opportunity(self, data: Dict[str, Any], session_id: Optional[str] = None, user_id: Optional[int] = None) -> Dict[str, Any]:
        dedup = _hash_str(
            f"{(data.get('company') or '').lower()}:{(data.get('role') or '').lower()}:{(data.get('public_job_url') or '').lower()}"
        )
        data["dedup_hash"] = dedup

        profile_id = None
        if session_id:
            profile = self.repo.get_or_create_profile(session_id=session_id, user_id=user_id)
            profile_id = profile.id

        sig = self.repo.create_opportunity_signal(data, profile_id=profile_id)
        self.repo.log_event(
            event_type="opportunity_submitted",
            entity_id=sig.id,
            session_id=session_id,
            user_id=user_id,
        )
        return {
            "status": "success",
            "opportunity_id": sig.id,
            "validation_status": sig.validation_status,
            "message": "Opportunity signal submitted for verification.",
        }

    # ── Contact Request Service ─────────────────────────────────────────────
    def submit_contact_request(self, data: Dict[str, Any], user_id: Optional[int] = None) -> Dict[str, Any]:
        cr = self.repo.create_contact_request(data, user_id=user_id)
        self.repo.log_event(
            event_type="contact_submitted",
            entity_id=cr.id,
            session_id=data.get("session_id"),
            user_id=user_id,
        )

        # Sync to Google Sheets 11_SYNC_LOGS if Google Sheets is configured
        try:
            from app.services.sheets_service import GoogleSheetsService
            sheets = GoogleSheetsService()
            if sheets.is_configured():
                sheets.append_sync_log({
                    "run_id": f"CONTACT_{cr.id[:8]}",
                    "timestamp": cr.created_at.isoformat() if hasattr(cr, 'created_at') and cr.created_at else "",
                    "job": f"Contact: {cr.name} ({cr.email})",
                    "status": f"ROLE: {cr.role_type or 'User'} | REASON: {cr.reason or 'General'}",
                    "detail": (cr.message or "")[:200],
                    "dry_run": "NO",
                })
        except Exception as exc:
            logger.warning("Could not sync contact request to Google Sheets: %s", exc)

        return {
            "status": "success",
            "contact_id": cr.id,
            "target_email": cr.target_email,
            "message": f"Your message has been logged for Saarthi AI team at {cr.target_email}.",
        }

    # ── Admin Intelligence Stats ───────────────────────────────────────────
    def get_intelligence_stats(self) -> Dict[str, Any]:
        return self.repo.get_discovery_stats()
