from pydantic import BaseModel
from typing import List, Dict, Optional

class RoadmapResponse(BaseModel):
    current_stage: Optional[str] = None
    career_summary: Optional[str] = None
    strengths: List[str] = []
    weaknesses: List[str] = []
    recommended_skills: List[str] = []
    recommended_projects: List[str] = []
    recommended_certifications: List[str] = []
    learning_order: List[str] = []
    milestones: List[str] = []
    estimated_timeline: Optional[str] = None
    recommended_next_action: Optional[str] = None

class SkillGapResponse(BaseModel):
    skills_mastered: List[str] = []
    missing_skills: List[str] = []
    priority: Optional[str] = None
    difficulty: Optional[str] = None
    estimated_learning_time: Optional[str] = None
    learning_resources: List[str] = []
    recommended_projects: List[str] = []
    recommended_certifications: List[str] = []

class JobStrategyInsights(BaseModel):
    why_this_job_matches: Optional[str] = None
    why_it_doesnt: Optional[str] = None
    missing_skills: List[str] = []
    resume_improvements: List[str] = []
    estimated_interview_readiness: Optional[str] = None
    recommended_next_action: Optional[str] = None

from pydantic import RootModel

class JobStrategyResponse(RootModel):
    root: Dict[str, JobStrategyInsights]

class AIPlanTask(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None

class AIPlanMilestone(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    tasks: List[AIPlanTask]

class AIPlanResponse(BaseModel):
    strategy: Optional[str] = None
    estimated_weeks: Optional[int] = None
    milestones: List[AIPlanMilestone]
