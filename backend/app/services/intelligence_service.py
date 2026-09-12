"""
Saarthi Intelligence Service — Career & Job Intelligence Engine
==============================================================
Provides relevance scoring, skill gap analysis, and AI guidance for user profiles
and job opportunities.

All output structures strictly demarcate:
  - FACT: Explicit property matches (e.g. required skill present in profile)
  - INFERENCE: Algorithmic calculations (e.g. score % or skill gap count)
  - AI_SUGGESTION: Generative guidance (from AI gateway with graceful fallback)
"""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class IntelligenceService:
    def __init__(self, ai_service: Optional[Any] = None) -> None:
        self.ai_service = ai_service

    def analyze_job_relevance(
        self,
        user_skills: List[str],
        user_yoe: int,
        job_title: str,
        job_required_skills: List[str],
        job_min_yoe: int = 0,
    ) -> Dict[str, Any]:
        """
        Evaluate user profile against a job requirement.
        """
        user_skills_clean = [s.strip().lower() for s in user_skills if s]
        job_skills_clean = [s.strip().lower() for s in job_required_skills if s]

        matched_skills = [s for s in job_skills_clean if s in user_skills_clean]
        missing_skills = [s for s in job_skills_clean if s not in user_skills_clean]

        if job_skills_clean:
            match_pct = round((len(matched_skills) / len(job_skills_clean)) * 100, 1)
        else:
            match_pct = 100.0

        yoe_eligible = user_yoe >= job_min_yoe

        # AI-based recommendation if available, else standard fallback
        ai_suggestion = None
        if self.ai_service and hasattr(self.ai_service, "generate"):
            try:
                prompt = (
                    f"Job: {job_title}\n"
                    f"Matched Skills: {', '.join(matched_skills)}\n"
                    f"Missing Skills: {', '.join(missing_skills)}\n"
                    "Give 2 concise bullet points on how to bridge the skill gap."
                )
                ai_suggestion = self.ai_service.generate(prompt)
            except Exception as err:
                logger.warning("AI generation failed in IntelligenceService: %s", err)
                ai_suggestion = "Focus on acquiring missing skills through hands-on projects."
        else:
            ai_suggestion = "Focus on acquiring missing skills through hands-on projects and online modules."

        return {
            "facts": {
                "user_skills": user_skills,
                "job_required_skills": job_required_skills,
                "user_yoe": user_yoe,
                "job_min_yoe": job_min_yoe,
                "matched_skills": matched_skills,
            },
            "inferences": {
                "match_percentage": match_pct,
                "missing_skills": missing_skills,
                "yoe_eligible": yoe_eligible,
                "fit_level": "High" if match_pct >= 75 else ("Medium" if match_pct >= 40 else "Low"),
            },
            "ai_suggestions": {
                "recommendation": ai_suggestion,
                "provider_used": "ai_gateway" if self.ai_service else "rule_engine_fallback",
            },
        }

    def get_career_guidance(
        self,
        target_role: str,
        current_skills: List[str],
        goals: List[str],
    ) -> Dict[str, Any]:
        """
        Generate career progression guidance for user goals.
        """
        ai_guidance = None
        if self.ai_service and hasattr(self.ai_service, "generate"):
            try:
                prompt = (
                    f"Target Role: {target_role}\n"
                    f"Current Skills: {', '.join(current_skills)}\n"
                    f"Goals: {', '.join(goals)}\n"
                    "Provide a brief 3-step action plan."
                )
                ai_guidance = self.ai_service.generate(prompt)
            except Exception as err:
                logger.warning("AI generation failed in get_career_guidance: %s", err)
                ai_guidance = "Step 1: Build core skills. Step 2: Create showcase projects. Step 3: Apply for entry/mid roles."
        else:
            ai_guidance = "Step 1: Build core skills. Step 2: Create showcase projects. Step 3: Apply for entry/mid roles."

        return {
            "facts": {
                "target_role": target_role,
                "current_skills": current_skills,
                "goals": goals,
            },
            "inferences": {
                "total_goals_set": len(goals),
                "skill_count": len(current_skills),
            },
            "ai_suggestions": {
                "guidance_plan": ai_guidance,
                "provider_used": "ai_gateway" if self.ai_service else "rule_engine_fallback",
            },
        }
