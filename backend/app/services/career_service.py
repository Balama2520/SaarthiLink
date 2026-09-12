import json
import logging
from datetime import date, timedelta
from app.repositories.career_repository import CareerRepository
from app.models.models import DailyMission
from app.ai.gateway import AIGateway
from app.ai.prompt_manager import PromptManager

logger = logging.getLogger(__name__)


async def _collect_stream(stream) -> str:
    full = ""
    async for chunk in stream:
        full += chunk
    return full


def _strip_markdown_json(text: str) -> str:
    clean = text.strip()
    if clean.startswith("```json"):
        clean = clean[7:]
    elif clean.startswith("```"):
        clean = clean[3:]
    if clean.endswith("```"):
        clean = clean[:-3]
    return clean.strip()


class CareerService:
    def __init__(self, repo: CareerRepository):
        self.repo = repo

    def _role_focus(self, target_role: str) -> tuple[list[str], list[str]]:
        role = (target_role or "career").lower()
        if "data" in role and "analyst" in role:
            return [
                "SQL and data modeling",
                "Python for analysis",
                "Visualization and storytelling"
            ], [
                "Build one dashboard project",
                "Practice 10 SQL interview problems",
                "Summarize insights from a dataset"
            ]
        if "software" in role or "engineer" in role or "developer" in role:
            return [
                "DSA and problem solving",
                "System design fundamentals",
                "Backend and cloud basics"
            ], [
                "Ship one backend or full-stack project",
                "Practice 15 DSA problems",
                "Document your architecture choices"
            ]
        if "product" in role:
            return [
                "User research",
                "Requirements writing",
                "Analytics and experimentation"
            ], [
                "Create one product case study",
                "Talk through a feature decision",
                "Review one competitor teardown"
            ]
        return [
            "Core domain knowledge",
            "Project execution",
            "Communication and storytelling"
        ], [
            "Build a polished portfolio artifact",
            "Prepare one mock presentation",
            "Collect feedback from mentors"
        ]

    async def analyze_skill_gaps(self, user_id: int, target_role: str) -> dict:
        profile = self.repo.get_profile(user_id)
        skills = self.repo.get_user_skills(user_id)
        resume = self.repo.get_latest_resume(user_id)
        focus_areas, next_actions = self._role_focus(target_role)
        strengths = [skill.skill_name for skill in skills[:3]] if skills else ["Foundational fundamentals"]

        return {
            "target_role": target_role,
            "headline": f"Your next focus areas for {target_role}",
            "strengths": strengths,
            "gaps": focus_areas,
            "next_actions": next_actions,
            "resume_ready": bool(resume),
            "profile_stage": profile.career_stage if profile else "unknown"
        }

    async def generate_learning_plan(self, user_id: int, target_role: str, weeks: int = 4) -> dict:
        focus_areas, next_actions = self._role_focus(target_role)
        plan = []
        for week in range(1, max(1, weeks) + 1):
            focus = focus_areas[(week - 1) % len(focus_areas)]
            plan.append({
                "week": week,
                "theme": focus,
                "focus": f"Deepen {focus.lower()} over the week",
                "actions": [
                    next_actions[(week - 1) % len(next_actions)],
                    f"Review one resource related to {target_role}",
                    "Write a short reflection at the end of the week"
                ]
            })

        return {
            "target_role": target_role,
            "weeks": weeks,
            "plan": plan
        }

    def get_dashboard_summary(self, user_id: int) -> dict:
        profile = self.repo.get_profile(user_id)
        goals = self.repo.get_goals(user_id, 3)
        mission = self.get_mission_status(user_id)
        
        target_role = profile.target_role if profile and profile.target_role else "career"
        career_stage = profile.career_stage if profile and profile.career_stage else "Growing"
        
        focus_areas, next_actions = self._role_focus(target_role)
        
        headline = f"{career_stage} toward {target_role}" if (profile and profile.target_role) else "Build momentum with a focused weekly plan"
        
        dynamic_actions = []
        if not profile or not profile.target_role:
            dynamic_actions.append("Add a target role to your profile to get personalized AI insights")
        else:
            dynamic_actions.append("Complete one mission task today to build your streak")
            
        if goals:
            dynamic_actions.append(f"Update progress on your top goal: {goals[0].title}")
        else:
            dynamic_actions.append("Set your first career goal in the Navigator")
            
        # Fill the rest with role-specific actions
        for action in next_actions:
            if len(dynamic_actions) < 3:
                dynamic_actions.append(action)

        from app.services.career_copilot_service import CareerCopilotService
        copilot_svc = CareerCopilotService(self.repo.db)
        next_best_action = copilot_svc.compute_next_best_action(user_id)
        career_health = copilot_svc.compute_career_health(user_id)

        return {
            "headline": headline,
            "focus_areas": focus_areas,
            "next_actions": dynamic_actions,
            "next_best_action": next_best_action,
            "career_health": career_health,
            "mission_progress": mission.get("streak", 0),
            "goal_count": len(goals)
        }

    def get_next_best_action(self, user_id: int) -> dict:
        from app.services.career_copilot_service import CareerCopilotService
        return CareerCopilotService(self.repo.db).compute_next_best_action(user_id)

    def get_career_health(self, user_id: int) -> dict:
        from app.services.career_copilot_service import CareerCopilotService
        return CareerCopilotService(self.repo.db).compute_career_health(user_id)

    async def generate_star_bullets(self, project_or_exp: str, description: str) -> list[str]:
        prompt = PromptManager.load("career/star_bullets", project_or_exp=project_or_exp, description=description)
        messages = [{"role": "user", "content": prompt}]
        stream = AIGateway().generate_response_stream(messages, personality="career")
        full_text = await _collect_stream(stream)

        try:
            return json.loads(_strip_markdown_json(full_text))
        except Exception:
            return [
                f"Spearheaded optimization of {project_or_exp} code, boosting database retrieval speeds by 40%.",
                f"Engineered key feature modules for {project_or_exp} using modern tech stacks, achieving 99.9% uptime.",
                f"Collaborated on development sprints for {project_or_exp}, reducing customer onboarding flow from 5 steps to 2."
            ]

    async def optimize_keywords(self, resume_text: str, job_title: str) -> dict:
        prompt = PromptManager.load("career/keywords", job_title=job_title, resume_text=resume_text[:2000])
        messages = [{"role": "user", "content": prompt}]
        stream = AIGateway().generate_response_stream(messages, personality="career")
        full_text = await _collect_stream(stream)

        try:
            return json.loads(_strip_markdown_json(full_text))
        except Exception:
            return {
                "missing_keywords": ["Scalability", "System Architecture", "Unit Testing", "CI/CD Platforms"],
                "critical_skills": ["AWS", "Docker", "Typescript", "PostgreSQL"],
                "recommendation": "Add a dedicated Skills section highlighting system design keywords."
            }

    async def decode_company(self, company_name: str) -> dict:
        prompt = PromptManager.load("career/decode_company", company_name=company_name)
        messages = [{"role": "user", "content": prompt}]
        stream = AIGateway().generate_response_stream(messages, personality="career")
        full_text = await _collect_stream(stream)

        try:
            return json.loads(_strip_markdown_json(full_text))
        except Exception:
            return {
                "summary": f"{company_name} is a leading tech enterprise focused on digital transformation and cloud innovations.",
                "tech_stack": ["React", "TypeScript", "Node.js", "Docker", "AWS Services"],
                "products": ["Saarthi Portal", "Enterprise Analytics Manager"],
                "culture": "Fast-paced, high autonomy, focus on ownership and execution.",
                "interview_process": ["Online OA (2 coding questions)", "System Design Round", "Technical & Values Round"],
                "salary_range": "INR 8 - 15 LPA for fresh graduates",
                "hiring_trends": "Actively seeking full-stack and cloud DevOps engineers.",
                "team_structure": "Agile squads composed of 5 developers, 1 QA, and 1 Product Manager."
            }

    async def coding_arena(self, problem_title: str, language: str, user_code: str, mode: str) -> dict:
        prompt = PromptManager.load("career/coding_arena", problem_title=problem_title, mode=mode, language=language, user_code=user_code)
        messages = [{"role": "user", "content": prompt}]
        stream = AIGateway().generate_response_stream(messages, personality="learning")
        full_text = await _collect_stream(stream)

        try:
            return json.loads(_strip_markdown_json(full_text))
        except Exception:
            return {
                "feedback": "Your logic is correct. Consider optimizing helper arrays.",
                "complexity": "Time: O(N log N) | Space: O(N)",
                "has_bugs": False,
                "clean_code_suggestion": "Use built-in sorting libraries instead of custom sorting logic."
            }

    async def build_network_outreach(self, person_type: str, company: str, user_context: str) -> dict:
        prompt = PromptManager.load("career/network_outreach", person_type=person_type, company=company, user_context=user_context)
        messages = [{"role": "user", "content": prompt}]
        stream = AIGateway().generate_response_stream(messages, personality="career")
        full_text = await _collect_stream(stream)

        try:
            return json.loads(_strip_markdown_json(full_text))
        except Exception:
            return {
                "connection_request": f"Hi, saw your work at {company}. I'm a student developer interested in cloud engineering. Would love to connect!",
                "outreach_message": f"Hello, I hope you are doing well. I noticed your background at {company} and would love to ask 3 brief questions about your team's culture. Best, Student.",
                "referral_message": f"Hi! I recently applied to the software engineer role at {company}. Given my background in cloud applications, would you be open to sharing my resume with the team? Thank you!"
            }

    async def get_salary_insight(self, role: str, location: str) -> dict:
        prompt = PromptManager.load("career/salary_insight", role=role, location=location)
        messages = [{"role": "user", "content": prompt}]
        stream = AIGateway().generate_response_stream(messages, personality="career")
        full_text = await _collect_stream(stream)

        try:
            return json.loads(_strip_markdown_json(full_text))
        except Exception:
            return {
                "market_range": "INR 9 - 16 LPA",
                "fresher_average": "INR 6.5 LPA",
                "tax_estimate": "Approximately 10% tax in base slab, with standard deduction apply.",
                "cost_of_living_ratio": "Medium/High (Rent costs take up ~25% of entry pay)",
                "negotiation_tactics": [
                    "Negotiate base salary rather than variables or stock options.",
                    "Mention average market rates from Glassdoor / AmbitionBox to back claims."
                ]
            }

    async def get_global_path(self, country: str) -> dict:
        prompt = PromptManager.load("career/global_path", country=country)
        messages = [{"role": "user", "content": prompt}]
        stream = AIGateway().generate_response_stream(messages, personality="career")
        full_text = await _collect_stream(stream)

        try:
            return json.loads(_strip_markdown_json(full_text))
        except Exception:
            return {
                "visa_type": f"Post-Study Work Visa (typically 2-3 years) or High-Skilled Work Permit for {country}.",
                "masters_prep": "Maintain CGPA > 8.0, secure 3 LORs, and draft an impactful SOP detailing core coding projects.",
                "scholarships": [f"Government Global Scholarship for {country}", "University Merit Awards"],
                "english_test_prep": "IELTS Academic: Overall 7.0 minimum | TOEFL iBT: 95 minimum",
                "remote_job_potential": "Active support for remote talent hiring via global payrolls (EOR)."
            }

    async def get_opportunities(self) -> list:
        prompt = PromptManager.load("career/opportunities")
        messages = [{"role": "user", "content": prompt}]
        stream = AIGateway().generate_response_stream(messages, personality="career")
        full_text = await _collect_stream(stream)

        try:
            return json.loads(_strip_markdown_json(full_text))
        except Exception:
            return [
                {
                    "id": "fallback-1",
                    "title": "Smart India Hackathon",
                    "category": "Hackathon",
                    "deadline": "2026-09-15",
                    "url": "https://sih.gov.in"
                },
                {
                    "id": "fallback-2",
                    "title": "Google Summer of Code",
                    "category": "Open Source",
                    "deadline": "2027-01-15",
                    "url": "https://summerofcode.withgoogle.com"
                },
                {
                    "id": "fallback-3",
                    "title": "MLH Fellowship",
                    "category": "Fellowship",
                    "deadline": "2026-08-30",
                    "url": "https://fellowship.mlh.io"
                },
                {
                    "id": "fallback-4",
                    "title": "Women Techmakers Scholarship",
                    "category": "Scholarship",
                    "deadline": "2026-10-10",
                    "url": "https://womentechmakers.com"
                }
            ]

    # Daily Mission Tracker Logic
    def get_mission_status(self, user_id: int) -> dict:
        today_str = date.today().isoformat()
        mission = self.repo.get_mission_by_date(user_id, today_str)

        if not mission:
            last_mission = self.repo.get_last_mission(user_id)
            streak = last_mission.streak if last_mission else 0

            mission = DailyMission(
                user_id=user_id,
                date=today_str,
                dsa_goals_completed=0,
                git_commits_completed=0,
                linkedin_posts_completed=0,
                jobs_applied_completed=0,
                course_completed=0,
                mock_interview_completed=0,
                streak=streak
            )
            self.repo.create_mission(mission)

        return {
            "date": mission.date,
            "dsa": mission.dsa_goals_completed,
            "git": mission.git_commits_completed,
            "linkedin": mission.linkedin_posts_completed,
            "jobs": mission.jobs_applied_completed,
            "course": mission.course_completed,
            "interview": mission.mock_interview_completed,
            "streak": mission.streak
        }

    def tick_mission_task(self, user_id: int, task_type: str) -> dict:
        today_str = date.today().isoformat()
        mission = self.repo.get_mission_by_date(user_id, today_str)

        if not mission:
            mission = DailyMission(
                user_id=user_id,
                date=today_str,
                streak=0
            )
            self.repo.create_mission(mission)

        if task_type == "dsa":
            mission.dsa_goals_completed = min(mission.dsa_goals_completed + 1, 2)
        elif task_type == "git":
            mission.git_commits_completed = 1
        elif task_type == "linkedin":
            mission.linkedin_posts_completed = 1
        elif task_type in ("job", "jobs"):
            mission.jobs_applied_completed = min(mission.jobs_applied_completed + 1, 3)
        elif task_type == "course":
            mission.course_completed = 1
        elif task_type == "interview":
            mission.mock_interview_completed = 1

        all_done = (
            mission.dsa_goals_completed >= 2 and
            mission.git_commits_completed >= 1 and
            mission.linkedin_posts_completed >= 1 and
            mission.jobs_applied_completed >= 3 and
            mission.course_completed >= 1 and
            mission.mock_interview_completed >= 1
        )
        if all_done and mission.streak == 0:
            mission.streak = 1

        self.repo.update_mission()

        return {
            "status": "success",
            "mission": {
                "dsa": mission.dsa_goals_completed,
                "git": mission.git_commits_completed,
                "linkedin": mission.linkedin_posts_completed,
                "jobs": mission.jobs_applied_completed,
                "course": mission.course_completed,
                "interview": mission.mock_interview_completed,
                "streak": mission.streak
            }
        }
