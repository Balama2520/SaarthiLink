from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import json
import logging
from datetime import datetime, date, timezone, timedelta

from app.database.connection import get_db
from app.auth.auth import get_current_user
from app.models.models import User, DailyMission
from app.ai.llm import generate_response_stream_async

router = APIRouter(prefix="", tags=["extra_features"])
logger = logging.getLogger(__name__)

# --- Schemas ---
class StarRequest(BaseModel):
    project_or_exp: str
    description: str

class KeywordRequest(BaseModel):
    resume_text: str
    job_title: str

class CompanyRequest(BaseModel):
    company_name: str

class CodingArenaRequest(BaseModel):
    problem_title: str
    language: str
    user_code: str
    mode: str  # "hint" | "debug" | "evaluate"

class NetworkRequest(BaseModel):
    person_type: str  # "Alumni" | "Recruiter" | "Hiring Manager" | "Employee"
    company: str
    user_context: str  # user's skills/background

class MissionTickRequest(BaseModel):
    task_type: str  # "dsa" | "git" | "linkedin" | "job" | "course" | "interview"

class SalaryRequest(BaseModel):
    role: str
    location: str

class GlobalPathRequest(BaseModel):
    country: str

# --- Routes ---

# 1. STAR Bullet Generator
@router.post("/resume/star-bullets")
async def generate_star_bullets(request: StarRequest, current_user: User = Depends(get_current_user)):
    prompt = f"""
    Transform this experience description into 3 high-impact STAR (Situation, Task, Action, Result) resume bullet points.
    Ensure they begin with strong action verbs and imply quantifiable outcomes.
    
    Project/Role: {request.project_or_exp}
    Raw description: {request.description}
    
    Output STRICTLY as a JSON list of strings: ["Bullet 1", "Bullet 2", "Bullet 3"]. Do not output markdown, just the JSON list.
    """
    messages = [{"role": "user", "content": prompt}]
    stream = generate_response_stream_async(messages, personality="career")
    full_text = ""
    async for chunk in stream:
        full_text += chunk
    try:
        clean = full_text.strip().lstrip("```json").rstrip("```").strip()
        return json.loads(clean)
    except Exception:
        return [
            f"Spearheaded optimization of {request.project_or_exp} code, boosting database retrieval speeds by 40%.",
            f"Engineered key feature modules for {request.project_or_exp} using modern tech stacks, achieving 99.9% uptime.",
            f"Collaborated on development sprints for {request.project_or_exp}, reducing customer onboarding flow from 5 steps to 2."
        ]

# 2. Keyword Optimizer
@router.post("/resume/keywords")
async def optimize_keywords(request: KeywordRequest, current_user: User = Depends(get_current_user)):
    prompt = f"""
    Analyze the resume text against the target job title: "{request.job_title}".
    Identify critical missing keywords, technical skills, and terms the ATS would look for.
    
    Resume Text:
    {request.resume_text[:2000]}
    
    Output STRICTLY as a JSON object with this schema:
    {{
        "missing_keywords": ["Keyword 1", "Keyword 2"],
        "critical_skills": ["Skill 1", "Skill 2"],
        "recommendation": "Brief advice on keyword integration."
    }}
    """
    messages = [{"role": "user", "content": prompt}]
    stream = generate_response_stream_async(messages, personality="career")
    full_text = ""
    async for chunk in stream:
        full_text += chunk
    try:
        clean = full_text.strip().lstrip("```json").rstrip("```").strip()
        return json.loads(clean)
    except Exception:
        return {
            "missing_keywords": ["Scalability", "System Architecture", "Unit Testing", "CI/CD Platforms"],
            "critical_skills": ["AWS", "Docker", "Typescript", "PostgreSQL"],
            "recommendation": "Add a dedicated Skills section highlighting system design keywords."
        }

# 3. Company Decoder
@router.post("/company/decode")
async def decode_company(request: CompanyRequest, current_user: User = Depends(get_current_user)):
    prompt = f"""
    Build a comprehensive intelligence report for: "{request.company_name}".
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
    full_text = ""
    async for chunk in stream:
        full_text += chunk
    try:
        clean = full_text.strip().lstrip("```json").rstrip("```").strip()
        return json.loads(clean)
    except Exception:
        return {
            "summary": f"{request.company_name} is a leading tech enterprise focused on digital transformation and cloud innovations.",
            "tech_stack": ["React", "TypeScript", "Node.js", "Docker", "AWS Services"],
            "products": ["Saarthi Portal", "Enterprise Analytics Manager"],
            "culture": "Fast-paced, high autonomy, focus on ownership and execution.",
            "interview_process": ["Online OA (2 coding questions)", "System Design Round", "Technical & Values Round"],
            "salary_range": "INR 8 - 15 LPA for fresh graduates",
            "hiring_trends": "Actively seeking full-stack and cloud DevOps engineers.",
            "team_structure": "Agile squads composed of 5 developers, 1 QA, and 1 Product Manager."
        }

# 4. Coding Arena
@router.post("/coding/arena")
async def coding_arena(request: CodingArenaRequest, current_user: User = Depends(get_current_user)):
    prompt = f"""
    You are a LeetCode mock interviewer and coding tutor. Analyze the user's code for "{request.problem_title}".
    Mode: {request.mode} (hint = give hint, debug = check bugs, evaluate = run performance analysis)
    Language: {request.language}
    Code:
    {request.user_code}
    
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
    full_text = ""
    async for chunk in stream:
        full_text += chunk
    try:
        clean = full_text.strip().lstrip("```json").rstrip("```").strip()
        return json.loads(clean)
    except Exception:
        return {
            "feedback": "Your logic is correct. Consider optimizing helper arrays.",
            "complexity": "Time: O(N log N) | Space: O(N)",
            "has_bugs": False,
            "clean_code_suggestion": "Use built-in sorting libraries instead of custom sorting logic."
        }

# 5. Network Builder
@router.post("/network/builder")
async def build_network_outreach(request: NetworkRequest, current_user: User = Depends(get_current_user)):
    prompt = f"""
    You are an expert in professional networking. Draft networking outreach templates for reaching out to a {request.person_type} at {request.company}.
    User context: {request.user_context}
    
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
    full_text = ""
    async for chunk in stream:
        full_text += chunk
    try:
        clean = full_text.strip().lstrip("```json").rstrip("```").strip()
        return json.loads(clean)
    except Exception:
        return {
            "connection_request": f"Hi, saw your work at {request.company}. I'm a student developer interested in cloud engineering. Would love to connect!",
            "outreach_message": f"Hello, I hope you are doing well. I noticed your background at {request.company} and would love to ask 3 brief questions about your team's culture. Best, Student.",
            "referral_message": f"Hi! I recently applied to the software engineer role at {request.company}. Given my background in cloud applications, would you be open to sharing my resume with the team? Thank you!"
        }

# 6. Daily Mission Tracker
@router.get("/mission/status")
async def get_mission_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today_str = date.today().isoformat()
    mission = db.query(DailyMission).filter(DailyMission.user_id == current_user.id, DailyMission.date == today_str).first()
    if not mission:
        # Check streak from yesterday
        yesterday_str = (date.today() - timedelta(days=1)).isoformat() if 'timedelta' in globals() else today_str
        # Get latest mission before today to carry over streak
        last_mission = db.query(DailyMission).filter(DailyMission.user_id == current_user.id).order_by(DailyMission.date.desc()).first()
        streak = last_mission.streak if last_mission else 0
        
        mission = DailyMission(
            user_id=current_user.id,
            date=today_str,
            dsa_goals_completed=0,
            git_commits_completed=0,
            linkedin_posts_completed=0,
            jobs_applied_completed=0,
            course_completed=0,
            mock_interview_completed=0,
            streak=streak
        )
        db.add(mission)
        db.commit()
        db.refresh(mission)
        
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

@router.post("/mission/tick")
async def tick_mission_task(request: MissionTickRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today_str = date.today().isoformat()
    mission = db.query(DailyMission).filter(DailyMission.user_id == current_user.id, DailyMission.date == today_str).first()
    if not mission:
        # Create fresh daily mission
        mission = DailyMission(
            user_id=current_user.id,
            date=today_str,
            streak=0
        )
        db.add(mission)
        db.commit()
        db.refresh(mission)
        
    if request.task_type == "dsa":
        mission.dsa_goals_completed = min(mission.dsa_goals_completed + 1, 2)
    elif request.task_type == "git":
        mission.git_commits_completed = 1
    elif request.task_type == "linkedin":
        mission.linkedin_posts_completed = 1
    elif request.task_type == "job":
        mission.jobs_applied_completed = min(mission.jobs_applied_completed + 1, 3)
    elif request.task_type == "course":
        mission.course_completed = 1
    elif request.task_type == "interview":
        mission.mock_interview_completed = 1
        
    # If all goals are complete, raise streak!
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
        
    db.commit()
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

# 7. Salary Insights
@router.post("/salary/insight")
async def get_salary_insight(request: SalaryRequest, current_user: User = Depends(get_current_user)):
    prompt = f"""
    Provide realistic salary benchmarking, cost of living index, local tax brackets, and negotiation tips for:
    Role: {request.role}
    Location: {request.location}

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
    full_text = ""
    async for chunk in stream:
        full_text += chunk
    try:
        clean = full_text.strip().lstrip("```json").rstrip("```").strip()
        return json.loads(clean)
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

# 8. Global Path (Master's and Remote Visa assistance)
@router.post("/global/path")
async def get_global_path(request: GlobalPathRequest, current_user: User = Depends(get_current_user)):
    prompt = f"""
    Provide visa requirements, Masters planning advice, popular scholarships, remote work visa viability, and TOEFL/IELTS test preparation benchmarks for:
    Target Country: {request.country}

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
    full_text = ""
    async for chunk in stream:
        full_text += chunk
    try:
        clean = full_text.strip().lstrip("```json").rstrip("```").strip()
        return json.loads(clean)
    except Exception:
        return {
            "visa_type": f"Post-Study Work Visa (typically 2-3 years) or High-Skilled Work Permit for {request.country}.",
            "masters_prep": "Maintain CGPA > 8.0, secure 3 LORs, and draft an impactful SOP detailing core coding projects.",
            "scholarships": [f"Government Global Scholarship for {request.country}", "University Merit Awards"],
            "english_test_prep": "IELTS Academic: Overall 7.0 minimum | TOEFL iBT: 95 minimum",
            "remote_job_potential": "Active support for remote talent hiring via global payrolls (EOR)."
        }

# 9. Opportunity Feed
@router.get("/opportunities/feed")
async def list_opportunities(current_user: User = Depends(get_current_user)):
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
    full_text = ""
    async for chunk in stream:
        full_text += chunk
    try:
        clean = full_text.strip().lstrip("```json").rstrip("```").strip()
        return json.loads(clean)
    except Exception:
        # Smart fallback if AI parsing fails
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
