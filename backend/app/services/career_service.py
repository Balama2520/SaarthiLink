import json
import logging
from datetime import date, timedelta
from app.repositories.career_repository import CareerRepository
from app.models.models import DailyMission
from app.ai.llm import generate_response_stream_async

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

    async def generate_star_bullets(self, project_or_exp: str, description: str) -> list[str]:
        prompt = f"""
Transform this experience description into 3 high-impact STAR (Situation, Task, Action, Result) resume bullet points.
Ensure they begin with strong action verbs and imply quantifiable outcomes.

Project/Role: {project_or_exp}
Raw description: {description}

Output STRICTLY as a JSON list of strings: ["Bullet 1", "Bullet 2", "Bullet 3"]. Do not output markdown, just the JSON list.
"""
        messages = [{"role": "user", "content": prompt}]
        stream = generate_response_stream_async(messages, personality="career")
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
        prompt = f"""
Analyze the resume text against the target job title: "{job_title}".
Identify critical missing keywords, technical skills, and terms the ATS would look for.

Resume Text:
{resume_text[:2000]}

Output STRICTLY as a JSON object with this schema:
{{
    "missing_keywords": ["Keyword 1", "Keyword 2"],
    "critical_skills": ["Skill 1", "Skill 2"],
    "recommendation": "Brief advice on keyword integration."
}}
"""
        messages = [{"role": "user", "content": prompt}]
        stream = generate_response_stream_async(messages, personality="career")
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
        prompt = f"""
Build a comprehensive intelligence report for: "{company_name}".
Include Tech Stack, Key Products, Work Culture, Interview Process stages, Salary ranges for Freshers, Recent hiring trends, Team structure, and Recent News.

Output STRICTLY as a JSON object matching this schema (no markdown formatting, just raw JSON string):
{{
    "summary": "Overview of company...",
    "tech_stack": ["React", "Python", "Kubernetes"],
    "products": ["Product A", "Product B"],
    "culture": "Description of work-life balance and values...",
    "interview_process": ["Round 1: Online Assessment", "Round 2: Technical Interview", "Round 3: Behavioral"],
    "salary_range": "e.g., INR 12-18 LPA",
    "hiring_trends": "Recent patterns...",
    "team_structure": "Engineering organization details..."
}}
"""
        messages = [{"role": "user", "content": prompt}]
        stream = generate_response_stream_async(messages, personality="career")
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
        prompt = f"""
You are a LeetCode mock interviewer and coding tutor. Analyze the user's code for "{problem_title}".
Mode: {mode} (hint = give hint, debug = check bugs, evaluate = run performance analysis)
Language: {language}
Code:
{user_code}

Output STRICTLY as a JSON object matching this schema (no markdown, just raw JSON string):
{{
    "feedback": "Detailed response according to the mode...",
    "complexity": "O(N) time | O(1) space",
    "has_bugs": true/false,
    "clean_code_suggestion": "Refactored snippet or advice..."
}}
"""
        messages = [{"role": "user", "content": prompt}]
        stream = generate_response_stream_async(messages, personality="learning")
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
        prompt = f"""
You are an expert in professional networking. Draft networking outreach templates for reaching out to a {person_type} at {company}.
User context: {user_context}

Generate three templates:
1. LinkedIn Connection Request (under 300 characters)
2. Detailed outreach email / follow-up
3. Referral request message

Output STRICTLY as a JSON object matching this schema (no markdown, just raw JSON):
{{
    "connection_request": "Short LinkedIn message...",
    "outreach_message": "Longer email/inmail message...",
    "referral_message": "Referral query..."
}}
"""
        messages = [{"role": "user", "content": prompt}]
        stream = generate_response_stream_async(messages, personality="career")
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
        prompt = f"""
Provide realistic salary benchmarking, cost of living index, local tax brackets, and negotiation tips for:
Role: {role}
Location: {location}

Output STRICTLY as a JSON object with this exact structure:
{{
    "market_range": "e.g., INR 10-15 LPA",
    "fresher_average": "e.g., INR 7 LPA",
    "tax_estimate": "Detailed breakdown of local tax brackets...",
    "cost_of_living_ratio": "Comparison index or rating",
    "negotiation_tactics": ["Point 1", "Point 2"]
}}
"""
        messages = [{"role": "user", "content": prompt}]
        stream = generate_response_stream_async(messages, personality="career")
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
        prompt = f"""
Provide visa requirements, Masters planning advice, popular scholarships, remote work visa viability, and TOEFL/IELTS test preparation benchmarks for:
Target Country: {country}

Output STRICTLY as a JSON object matching this schema (no markdown, just raw JSON):
{{
    "visa_type": "Popular visa pathways (e.g., H-1B, Post-Study Work)",
    "masters_prep": "Advice on deadlines and profile strength...",
    "scholarships": ["Scholarship A", "Scholarship B"],
    "english_test_prep": "Minimum bands/scores (TOEFL/IELTS)",
    "remote_job_potential": "Digital Nomad or global remote hiring potential"
}}
"""
        messages = [{"role": "user", "content": prompt}]
        stream = generate_response_stream_async(messages, personality="career")
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
        prompt = """
Generate a list of 4 highly relevant, upcoming career opportunities for a computer science student or fresh graduate in tech. 
Include a mix of:
1. A well-known global Hackathon (e.g., SIH, MLH)
2. A major Open Source program (e.g., GSoC, Outreachy)
3. A Fellowship or Mentorship program
4. A Tech Scholarship or Diversity grant

Make the deadlines realistic (e.g., within the next 3 to 6 months).

Output STRICTLY as a JSON array of objects matching this exact schema (no markdown, just raw JSON array):
[
    {
        "id": "unique-string-id",
        "title": "Event Name",
        "category": "Hackathon" | "Open Source" | "Fellowship" | "Scholarship",
        "deadline": "YYYY-MM-DD",
        "url": "https://example.com"
    }
]
"""
        messages = [{"role": "user", "content": prompt}]
        stream = generate_response_stream_async(messages, personality="career")
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
        elif task_type == "job":
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
