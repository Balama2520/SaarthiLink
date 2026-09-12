import logging
import json
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.memory.redis_client import redis_memory
from app.models.models import (
    User, UserProfile, Resume, UserSkill, Goal,
    JobApplication, InterviewSession, AIWorkspace, SavedJob, DailyMission
)
from app.ai.gateway import AIGateway

logger = logging.getLogger(__name__)

# Standard skill baselines by target role for deterministic evaluation
ROLE_SKILL_BASELINES = {
    "software": ["Python", "FastAPI", "PostgreSQL", "Data Structures", "Git", "REST APIs", "Docker"],
    "backend": ["Python", "FastAPI", "SQLAlchemy", "PostgreSQL", "Redis", "System Design", "Docker"],
    "frontend": ["React", "TypeScript", "HTML5", "CSS3", "Tailwind CSS", "State Management", "Vite"],
    "full-stack": ["React", "TypeScript", "Python", "FastAPI", "PostgreSQL", "REST APIs", "Git"],
    "data analyst": ["SQL", "Python", "Pandas", "Power BI", "Data Modeling", "Excel", "Statistics"],
    "data science": ["Python", "Machine Learning", "Pandas", "NumPy", "SQL", "Scikit-Learn", "Deep Learning"],
    "product": ["User Research", "Agile", "Roadmapping", "Product Analytics", "Wireframing", "PRD Writing"],
}


class CareerCopilotService:
    """
    V1 Career Copilot & Intelligence Service.
    Orchestrates User Profile, Resume, Skills, Goals, and Workspaces to provide:
    - Deterministic & AI-enriched Next Best Action
    - Multi-dimensional Career Health indicator
    - Role-based Skill Gap analysis
    - Personalized Learning Roadmaps
    """

    def __init__(self, db: Session):
        self.db = db
        self.ai_gateway = AIGateway()

    def invalidate_cache(self, user_id: int) -> None:
        logger.info("Career copilot cache invalidate requested", extra={"user_id": user_id})
        redis_memory.invalidate_cache(f"dashboard_summary:{user_id}")
        redis_memory.invalidate_cache(f"next_action:{user_id}")
        redis_memory.invalidate_cache(f"career_health:{user_id}")
        redis_memory.invalidate_cache(f"skill_gap:{user_id}")
        redis_memory.invalidate_cache(f"learning_plan:{user_id}")
        redis_memory.invalidate_cache(f"mission_status:{user_id}")

    def _gather_user_context(self, user_id: int) -> Dict[str, Any]:
        """Gathers all authorized V1 career data for a user to form the intelligence context."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {}

        profile = self.db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        resume = (
            self.db.query(Resume)
            .filter(Resume.user_id == user_id)
            .order_by(Resume.created_at.desc())
            .first()
        )
        skills = self.db.query(UserSkill).filter(UserSkill.user_id == user_id).all()
        goals = self.db.query(Goal).filter(Goal.user_id == user_id).all()
        workspaces = self.db.query(AIWorkspace).filter(AIWorkspace.user_id == user_id).all()
        interviews = self.db.query(InterviewSession).filter(InterviewSession.user_id == user_id).all()
        saved_jobs = self.db.query(SavedJob).filter(SavedJob.user_id == user_id).all()

        parsed_resume = None
        if resume and resume.parsed_json:
            try:
                parsed_resume = json.loads(resume.parsed_json)
            except Exception:
                parsed_resume = None

        target_role = (
            user.target_role
            or (profile.target_role if profile and profile.target_role else "")
            or "Software Engineer"
        )

        return {
            "user_id": user.id,
            "username": user.username,
            "persona": user.persona or "undergrad",
            "target_role": target_role,
            "profile": profile,
            "resume": resume,
            "parsed_resume": parsed_resume,
            "skills": [s.skill_name for s in skills],
            "goals": goals,
            "workspaces": workspaces,
            "interviews": interviews,
            "saved_jobs": saved_jobs,
        }

    def compute_career_health(self, user_id: int) -> Dict[str, Any]:
        """
        Computes a multi-dimensional Career Health decision-support indicator (0-100).
        Evaluates Profile Completeness, Resume Quality, Skill Match, Goal Execution,
        and Interview Readiness without claiming false scientific certainty.
        """
        ctx = self._gather_user_context(user_id)
        if not ctx:
            return {
                "overall_score": 0,
                "stage": "Unknown",
                "breakdown": {
                    "profile_completeness": 0,
                    "resume_readiness": 0,
                    "skill_match": 0,
                    "goal_execution": 0,
                    "interview_readiness": 0,
                },
                "biggest_gap": "Profile not created",
                "recommendation": "Sign in and complete your career profile.",
            }

        profile = ctx.get("profile")
        resume = ctx.get("resume")
        skills = ctx.get("skills", [])
        goals = ctx.get("goals", [])
        interviews = ctx.get("interviews", [])
        target_role = ctx.get("target_role", "").lower()

        # 1. Profile Completeness (0-100)
        prof_score = 0
        if profile:
            fields = [
                profile.headline, profile.career_stage, profile.target_role,
                profile.degree, profile.university, profile.graduation_year,
                profile.github_url, profile.linkedin_url
            ]
            filled = sum(1 for f in fields if f)
            prof_score = min(100, int((filled / len(fields)) * 100))

        # 2. Resume Readiness (0-100)
        resume_score = 0
        if resume:
            if resume.parsing_status == "completed":
                resume_score = max(40, min(100, resume.ats_score or 50))
            elif resume.parsing_status == "pending":
                resume_score = 30
            else:
                resume_score = 20

        # 3. Skill Match (0-100)
        matched_role_key = next((k for k in ROLE_SKILL_BASELINES if k in target_role), "software")
        expected_skills = ROLE_SKILL_BASELINES[matched_role_key]
        user_skills_lower = {s.lower() for s in skills}
        matches = sum(1 for exp in expected_skills if exp.lower() in user_skills_lower)
        skill_score = min(100, int((matches / max(1, len(expected_skills))) * 100))
        if not skills and not resume:
            skill_score = 15

        # 4. Goal Execution (0-100)
        if goals:
            completed = sum(1 for g in goals if g.status in ("completed", "COMPLETED"))
            avg_progress = sum(g.progress or 0 for g in goals) / len(goals)
            goal_score = int(min(100, (completed / len(goals)) * 40 + avg_progress * 0.6))
        else:
            goal_score = 25

        # 5. Interview Readiness (0-100)
        if interviews:
            recent_scores = [i.score for i in interviews if i.score is not None]
            interview_score = int(sum(recent_scores) / len(recent_scores)) if recent_scores else 60
        else:
            interview_score = 20

        # Weighted Overall Score
        overall = int(
            0.20 * prof_score +
            0.25 * resume_score +
            0.25 * skill_score +
            0.15 * goal_score +
            0.15 * interview_score
        )
        overall = max(10, min(98, overall))

        # Identify Biggest Gap
        scores = {
            "Profile Details": prof_score,
            "Resume & ATS": resume_score,
            "Target Skills": skill_score,
            "Goal Momentum": goal_score,
            "Interview Readiness": interview_score,
        }
        biggest_gap_dim = min(scores, key=scores.get)

        recommendations_map = {
            "Profile Details": "Complete your degree, university, and social links in Profile.",
            "Resume & ATS": "Upload an updated resume to achieve an ATS score above 75 in Resume Studio.",
            "Target Skills": f"Add missing core skills for {ctx.get('target_role')}.",
            "Goal Momentum": "Define a concrete 30-day milestone and complete daily tasks in Goals.",
            "Interview Readiness": f"Practice a Technical mock interview round for {ctx.get('target_role')}.",
        }

        stage = "Early Exploration" if overall < 45 else ("Accelerating" if overall < 75 else "Job-Ready")

        return {
            "overall_score": overall,
            "stage": stage,
            "breakdown": {
                "profile_completeness": prof_score,
                "resume_readiness": resume_score,
                "skill_match": skill_score,
                "goal_execution": goal_score,
                "interview_readiness": interview_score,
            },
            "biggest_gap": biggest_gap_dim,
            "recommendation": recommendations_map.get(biggest_gap_dim, "Continue daily mission progress."),
        }

    def compute_next_best_action(self, user_id: int) -> Dict[str, Any]:
        """
        The Signature Saarthi Next Best Action Engine.
        Deterministically evaluates all authorized user data and produces:
        - WHAT SHOULD I DO NOW?
        - WHY?
        - IMPACT
        - ESTIMATED TIME
        - THIS IMPROVES
        - AFTER THIS
        - TARGET WORKFLOW (target tab)
        """
        ctx = self._gather_user_context(user_id)
        if not ctx:
            return {
                "action": "Sign in to activate your Career Copilot",
                "why": "Saarthi personalizes guidance based on your actual profile, resume, and goals.",
                "impact": "Crucial",
                "estimated_time": "2 minutes",
                "improves": ["Account Setup", "Personalized Insights"],
                "after_this": "Build your career profile.",
                "target_tab": "profile",
                "target_role": "General",
            }

        profile = ctx.get("profile")
        resume = ctx.get("resume")
        goals = ctx.get("goals", [])
        workspaces = ctx.get("workspaces", [])
        interviews = ctx.get("interviews", [])
        saved_jobs = ctx.get("saved_jobs", [])
        target_role = ctx.get("target_role", "Software Engineer")
        skills = ctx.get("skills", [])

        pending_goals = [g for g in goals if g.status in ("pending", "ACTIVE", "in_progress")]

        # ── Priority 1: Target Role / Profile Setup ────────────────────────────
        if not profile or not profile.target_role:
            return {
                "action": f"Set your primary Target Role and Career Stage in Profile",
                "why": "Without a target role, Saarthi cannot tailor ATS keywords, skill gaps, or roadmaps.",
                "impact": "Crucial",
                "estimated_time": "5 minutes",
                "improves": ["Recommendation Precision", "Career Clarity", "Roadmap Targeting"],
                "after_this": "Upload your resume for automated ATS benchmarking.",
                "target_tab": "profile",
                "target_role": target_role,
            }

        # ── Priority 2: Resume Presence & ATS Score ───────────────────────────
        if not resume:
            return {
                "action": f"Upload and analyze your resume in Resume Studio for {target_role}",
                "why": "An analyzed resume provides ATS scoring and detects critical keyword gaps.",
                "impact": "Crucial",
                "estimated_time": "10 minutes",
                "improves": ["ATS Readiness", "Skill Extraction", "Recruiter Keyword Match"],
                "after_this": "Sync extracted skills directly into your profile.",
                "target_tab": "resume",
                "target_role": target_role,
            }

        if resume.parsing_status == "failed":
            return {
                "action": "Retry AI analysis on your uploaded resume in Resume Studio",
                "why": "Your resume was saved, but analysis was interrupted. Re-running it will calculate your ATS score.",
                "impact": "High",
                "estimated_time": "2 minutes",
                "improves": ["ATS Scoring", "Keyword Diagnostics", "Skill Extraction"],
                "after_this": "Review detected strengths and weaknesses.",
                "target_tab": "resume",
                "target_role": target_role,
            }

        if resume.ats_score < 65:
            return {
                "action": f"Incorporate quantified metric bullets into your resume to reach ATS 75+",
                "why": f"Your current resume ATS score is {resume.ats_score}/100. Adding quantifiable achievements significantly improves screening pass rates.",
                "impact": "High",
                "estimated_time": "45 minutes",
                "improves": ["ATS Score", "Screening Pass Rate", "Interview Conversion"],
                "after_this": "Re-upload the revised resume to verify ATS score improvement.",
                "target_tab": "resume",
                "target_role": target_role,
            }

        # ── Priority 3: Active Goal Momentum ──────────────────────────────────
        if not pending_goals:
            return {
                "action": f"Establish a 30-day milestone for {target_role} in Career Goals",
                "why": "Clear milestone structure increases focus and connects daily effort to tangible outcomes.",
                "impact": "High",
                "estimated_time": "15 minutes",
                "improves": ["Goal Execution", "Daily Accountability", "Milestone Tracking"],
                "after_this": "Break your milestone into 3 weekly tasks.",
                "target_tab": "goals",
                "target_role": target_role,
            }

        # Select highest-priority pending goal
        priority_goal = next((g for g in pending_goals if (g.priority or "").lower() in ("high", "urgent")), pending_goals[0])
        if (priority_goal.progress or 0) < 50:
            return {
                "action": f"Execute next step on goal: '{priority_goal.title}' ({priority_goal.progress}% done)",
                "why": f"This is your primary active goal in {priority_goal.category}. Completing it moves you closer to {target_role} readiness.",
                "impact": "High",
                "estimated_time": "60 minutes",
                "improves": ["Execution Velocity", "Milestone Progress", "Portfolio Evidence"],
                "after_this": f"Update progress to {min(100, (priority_goal.progress or 0) + 25)}% in Goals.",
                "target_tab": "goals",
                "target_role": target_role,
            }

        # ── Priority 4: Technical Project in Workspaces ─────────────────────────
        if not workspaces:
            return {
                "action": f"Initialize a project workspace for {target_role} to build portfolio evidence",
                "why": "Hiring managers look for verifiable project evidence beyond theoretical knowledge.",
                "impact": "Crucial",
                "estimated_time": "30 minutes",
                "improves": ["Hands-on Architecture", "GitHub Portfolio", "Technical Credibility"],
                "after_this": "Link your resume and notes to ground your project workspace.",
                "target_tab": "workspaces",
                "target_role": target_role,
            }

        # ── Priority 5: Mock Interview Preparation ────────────────────────────
        if not interviews:
            return {
                "action": f"Complete a Technical mock interview round for {target_role}",
                "why": "Simulating real technical screening questions identifies speech clarity and articulation gaps before real interviews.",
                "impact": "High",
                "estimated_time": "20 minutes",
                "improves": ["Technical Articulation", "Speaking Confidence", "Interview Readiness"],
                "after_this": "Review AI feedback on confidence and filler words.",
                "target_tab": "interview",
                "target_role": target_role,
            }

        # ── Priority 6: Job Radar & Opportunity Execution ─────────────────────
        if saved_jobs:
            return {
                "action": f"Review requirements and submit applications for your {len(saved_jobs)} saved jobs",
                "why": "Consistent application cadence ensures your skill improvements turn into real interview opportunities.",
                "impact": "High",
                "estimated_time": "30 minutes",
                "improves": ["Application Volume", "Market Exposure", "Interview Pipeline"],
                "after_this": "Record your application status in Placements Tracker.",
                "target_tab": "jobs",
                "target_role": target_role,
            }

        # Default continuous progress action
        return {
            "action": f"Generate a customized 30-day learning roadmap for {target_role}",
            "why": "A structured roadmap guides your daily learning sessions with week-by-week milestones.",
            "impact": "Medium",
            "estimated_time": "20 minutes",
            "improves": ["Structured Learning", "Topic Coverage", "Study Cadence"],
            "after_this": "Track roadmap milestones in your Daily Mission.",
            "target_tab": "roadmaps",
            "target_role": target_role,
        }

    async def analyze_skill_gap(self, user_id: int, target_role_override: Optional[str] = None) -> Dict[str, Any]:
        """Compares user's current skills against target role requirements with deterministic fallback."""
        ctx = self._gather_user_context(user_id)
        target_role = target_role_override or ctx.get("target_role", "Software Engineer")

        user_skills = ctx.get("skills", [])
        matched_role_key = next((k for k in ROLE_SKILL_BASELINES if k in target_role.lower()), "software")
        expected_skills = ROLE_SKILL_BASELINES[matched_role_key]

        user_skills_lower = {s.lower() for s in user_skills}
        strengths = [s for s in expected_skills if s.lower() in user_skills_lower]
        if not strengths and user_skills:
            strengths = user_skills[:3]
        elif not strengths:
            strengths = ["Foundational fundamentals"]

        gaps = [s for s in expected_skills if s.lower() not in user_skills_lower]
        if not gaps:
            gaps = ["System Performance", "Cloud Deployment Architecture", "Automated Testing"]

        next_actions = [
            f"Build a practical demo showcasing {gaps[0] if gaps else 'production concepts'}",
            f"Update your resume keywords to highlight {strengths[0] if strengths else 'core competencies'}",
            f"Solve 5 interview problems related to {target_role}"
        ]

        return {
            "target_role": target_role,
            "headline": f"Targeted Skill Analysis for {target_role}",
            "strengths": strengths,
            "gaps": gaps,
            "next_actions": next_actions,
            "resume_ready": bool(ctx.get("resume")),
            "profile_stage": ctx.get("profile").career_stage if ctx.get("profile") else "Active"
        }

    async def generate_career_roadmap(self, user_id: int) -> Dict[str, Any]:
        """Generates a week-by-week learning roadmap based on user context."""
        ctx = self._gather_user_context(user_id)
        target_role = ctx.get("target_role", "Software Engineer")
        gap_data = await self.analyze_skill_gap(user_id, target_role)

        gaps = gap_data.get("gaps", ["Fundamentals", "Architecture", "Testing", "Deployment"])
        weeks = []
        for i, gap in enumerate(gaps[:4], 1):
            weeks.append({
                "week": i,
                "title": f"Mastering {gap}",
                "focus": f"Deep dive into {gap} principles and hands-on application.",
                "milestones": [
                    f"Read core concepts and documentation on {gap}",
                    f"Build one mini-project using {gap}",
                    f"Write a reflection and add code to GitHub"
                ]
            })

        return {
            "target_role": target_role,
            "total_weeks": len(weeks),
            "weeks": weeks,
            "status": "ready"
        }

    async def generate_job_strategy(self, user_id: int, job_id: str) -> Dict[str, Any]:
        """Generates a targeted application strategy for a specific job."""
        ctx = self._gather_user_context(user_id)
        target_role = ctx.get("target_role", "Software Engineer")
        return {
            "status": "ready",
            "job_id": job_id,
            "strategy": {
                "tailored_pitch": f"Highlight your {target_role} competencies and recent project work.",
                "recommended_focus": "Emphasize production quality and database reliability.",
                "checklist": [
                    "Tailor resume summary to job requirements",
                    "Include portfolio link in application",
                    "Prepare 2 relevant STAR stories for interview"
                ]
            }
        }
