"""
Discovery Repository — Data Access Layer for Saarthi Discovery & Intelligence
=============================================================================
Provides CRUD and query methods for discovery profiles, feedback, opportunities,
contact requests, and consent records.
"""

from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.models import (
    ConsentRecord,
    UserDiscoveryProfile,
    UserIntent,
    CareerChallenge,
    FeatureFeedback,
    ProductFeedback,
    OpportunitySignal,
)


class DiscoveryRepository:

    def __init__(self, db: Session):
        self.db = db

    # ── Consent ─────────────────────────────────────────────────────────────
    def create_consent(
        self,
        session_id: str,
        user_id: Optional[int] = None,
        consent_given: bool = True,
        ip_hash: Optional[str] = None,
        user_agent_hash: Optional[str] = None,
    ) -> ConsentRecord:
        record = ConsentRecord(
            session_id=session_id,
            user_id=user_id,
            consent_given=consent_given,
            ip_hash=ip_hash,
            user_agent_hash=user_agent_hash,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get_consent_by_session(self, session_id: str) -> Optional[ConsentRecord]:
        return (
            self.db.query(ConsentRecord)
            .filter(
                ConsentRecord.session_id == session_id, ConsentRecord.status == "active"
            )
            .first()
        )

    # ── Discovery Profile ───────────────────────────────────────────────────
    def get_or_create_profile(
        self,
        session_id: str,
        user_id: Optional[int] = None,
        user_type: Optional[str] = None,
        user_type_other: Optional[str] = None,
        source: str = "discover_page",
    ) -> UserDiscoveryProfile:
        profile = (
            self.db.query(UserDiscoveryProfile)
            .filter(UserDiscoveryProfile.session_id == session_id)
            .first()
        )
        if not profile:
            profile = UserDiscoveryProfile(
                session_id=session_id,
                user_id=user_id,
                user_type=user_type,
                user_type_other=user_type_other,
                source=source,
            )
            self.db.add(profile)
            self.db.commit()
            self.db.refresh(profile)
        else:
            if user_type:
                profile.user_type = user_type
            if user_type_other:
                profile.user_type_other = user_type_other
            if user_id and not profile.user_id:
                profile.user_id = user_id
            self.db.commit()
            self.db.refresh(profile)
        return profile

    def update_profile_status(
        self, profile_id: str, status: str
    ) -> Optional[UserDiscoveryProfile]:
        profile = (
            self.db.query(UserDiscoveryProfile)
            .filter(UserDiscoveryProfile.id == profile_id)
            .first()
        )
        if profile:
            profile.status = status
            self.db.commit()
            self.db.refresh(profile)
        return profile

    # ── Intents ─────────────────────────────────────────────────────────────
    def save_intents(
        self, profile_id: str, intents_data: List[Dict[str, Any]]
    ) -> List[UserIntent]:
        # Delete existing intents for profile
        self.db.query(UserIntent).filter(UserIntent.profile_id == profile_id).delete()
        created = []
        for item in intents_data:
            intent = UserIntent(
                profile_id=profile_id,
                intent_key=item.get("intent_key"),
                intent_label=item.get("intent_label"),
                is_primary=item.get("is_primary", False),
                free_text=item.get("free_text"),
            )
            self.db.add(intent)
            created.append(intent)
        self.db.commit()
        return created

    # ── Career Challenges ───────────────────────────────────────────────────
    def save_career_challenge(
        self, profile_id: str, data: Dict[str, Any]
    ) -> CareerChallenge:
        challenge = (
            self.db.query(CareerChallenge)
            .filter(CareerChallenge.profile_id == profile_id)
            .first()
        )
        if not challenge:
            challenge = CareerChallenge(profile_id=profile_id)
            self.db.add(challenge)

        for key, val in data.items():
            if hasattr(challenge, key) and key not in (
                "id",
                "profile_id",
                "created_at",
                "updated_at",
            ):
                setattr(challenge, key, val)

        self.db.commit()
        self.db.refresh(challenge)
        return challenge

    # ── Feature Feedback ────────────────────────────────────────────────────
    def save_feature_feedbacks(
        self, profile_id: str, items: List[Dict[str, Any]]
    ) -> List[FeatureFeedback]:
        res = []
        for item in items:
            fid = item.get("feature_id")
            existing = (
                self.db.query(FeatureFeedback)
                .filter(
                    FeatureFeedback.profile_id == profile_id,
                    FeatureFeedback.feature_id == fid,
                )
                .first()
            )
            if existing:
                existing.rating = item.get("rating", existing.rating)
                existing.is_most_valuable = item.get(
                    "is_most_valuable", existing.is_most_valuable
                )
                existing.is_least_valuable = item.get(
                    "is_least_valuable", existing.is_least_valuable
                )
                existing.is_missing = item.get("is_missing", existing.is_missing)
                existing.is_want_next = item.get("is_want_next", existing.is_want_next)
                existing.comment = item.get("comment", existing.comment)
                res.append(existing)
            else:
                ff = FeatureFeedback(
                    profile_id=profile_id,
                    feature_id=fid,
                    feature_key=item.get("feature_key", f"feature_{fid}"),
                    feature_label=item.get("feature_label"),
                    rating=item.get("rating", "useful"),
                    is_most_valuable=item.get("is_most_valuable", False),
                    is_least_valuable=item.get("is_least_valuable", False),
                    is_missing=item.get("is_missing", False),
                    is_want_next=item.get("is_want_next", False),
                    comment=item.get("comment"),
                )
                self.db.add(ff)
                res.append(ff)
        self.db.commit()
        return res

    # ── Product Feedback ────────────────────────────────────────────────────
    def save_product_feedback(
        self, profile_id: str, data: Dict[str, Any]
    ) -> ProductFeedback:
        pf = (
            self.db.query(ProductFeedback)
            .filter(ProductFeedback.profile_id == profile_id)
            .first()
        )
        if not pf:
            pf = ProductFeedback(profile_id=profile_id)
            self.db.add(pf)

        for key, val in data.items():
            if hasattr(pf, key) and key not in (
                "id",
                "profile_id",
                "created_at",
                "updated_at",
            ):
                setattr(pf, key, val)

        self.db.commit()
        self.db.refresh(pf)
        return pf

    # ── Opportunity Signal ──────────────────────────────────────────────────
    def create_opportunity_signal(
        self, data: Dict[str, Any], profile_id: Optional[str] = None
    ) -> OpportunitySignal:
        sig = OpportunitySignal(
            profile_id=profile_id,
            public_job_url=data.get("public_job_url"),
            company=data.get("company"),
            role=data.get("role"),
            location=data.get("location"),
        )
        self.db.add(sig)
        self.db.commit()
        self.db.refresh(sig)
        return sig
