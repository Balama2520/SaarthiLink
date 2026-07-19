import uuid
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Index, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from typing import Optional, List
from app.database import Base

# --- SQLAlchemy Database Models ---

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    target_role = Column(String, nullable=True)
    persona = Column(String, default="undergrad")  # undergrad, mtech, phd, ms_abroad, professional
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    sessions = relationship("ChatSession", back_populates="owner", cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="owner", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    job_applications = relationship("JobApplication", back_populates="owner", cascade="all, delete-orphan")
    interview_sessions = relationship("InterviewSession", back_populates="owner", cascade="all, delete-orphan")
    roadmaps = relationship("LearningRoadmap", back_populates="owner", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="owner", cascade="all, delete-orphan")
    workspaces = relationship("AIWorkspace", back_populates="owner", cascade="all, delete-orphan")
    degree_trackers = relationship("DegreeTracker", back_populates="owner", cascade="all, delete-orphan")
    certifications = relationship("CertificationPlanner", back_populates="owner", cascade="all, delete-orphan")
    placements = relationship("PlacementTracker", back_populates="owner", cascade="all, delete-orphan")
    daily_missions = relationship("DailyMission", back_populates="owner", cascade="all, delete-orphan")
    thesis_projects = relationship("ThesisProject", back_populates="owner", cascade="all, delete-orphan")
    literature_papers = relationship("LiteraturePaper", back_populates="owner", cascade="all, delete-orphan")
    experiment_logs = relationship("ExperimentLog", back_populates="owner", cascade="all, delete-orphan")
    publications = relationship("PublicationTracker", back_populates="owner", cascade="all, delete-orphan")
    higher_edu_plans = relationship("HigherEducationPlan", back_populates="owner", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="owner", cascade="all, delete-orphan")


class AIWorkspace(Base):
    __tablename__ = "workspaces"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="workspaces")
    resumes = relationship("Resume", back_populates="workspace", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="workspace", cascade="all, delete-orphan")
    job_applications = relationship("JobApplication", back_populates="workspace", cascade="all, delete-orphan")


class Resume(Base):
    __tablename__ = "resumes"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True)
    filename = Column(String)
    file_path = Column(String)
    ats_score = Column(Integer, default=0)
    raw_text = Column(Text, nullable=True)
    parsed_json = Column(Text, nullable=True)  # Stores section analysis as stringified JSON
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="resumes")
    workspace = relationship("AIWorkspace", back_populates="resumes")


class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    description = Column(Text)
    tech_stack = Column(String)  # Comma-separated tech
    github_url = Column(String, nullable=True)
    roadmap_json = Column(Text, nullable=True)  # Detailed project steps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="projects")


class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, default="New Conversation")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    owner = relationship("User", back_populates="sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"))
    role = Column(String)
    content = Column(Text)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    session = relationship("ChatSession", back_populates="messages")
    __table_args__ = (Index('ix_messages_session_timestamp', 'session_id', 'timestamp'),)


class Document(Base):
    __tablename__ = "documents"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True)
    filename = Column(String)
    file_path = Column(String)
    processed_status = Column(String, default="pending")  # pending, embedded, failed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="documents")
    workspace = relationship("AIWorkspace", back_populates="documents")


class JobApplication(Base):
    __tablename__ = "job_applications"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True)
    job_title = Column(String)
    company = Column(String)
    description = Column(Text, nullable=True)
    match_percentage = Column(Integer, default=0)
    missing_skills = Column(String, nullable=True)
    status = Column(String, default="matched")  # matched, applied, interviewing, offered, rejected
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="job_applications")
    workspace = relationship("AIWorkspace", back_populates="job_applications")


class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String)
    company = Column(String, nullable=True)
    feedback = Column(Text, nullable=True)
    score = Column(Integer, default=0)
    transcript_json = Column(Text, nullable=True)  # Stores questions & answers JSON
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="interview_sessions")


class LearningRoadmap(Base):
    __tablename__ = "learning_roadmaps"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    target_role = Column(String)
    duration_days = Column(Integer, default=30)
    roadmap_json = Column(Text, nullable=True)  # Week-by-week layout
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="roadmaps")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    content = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="notifications")


class DegreeTracker(Base):
    __tablename__ = "degree_tracker"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    semester = Column(Integer)
    course_name = Column(String)
    credits = Column(Integer)
    gpa = Column(String, nullable=True)
    status = Column(String, default="planned")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="degree_trackers")


class CertificationPlanner(Base):
    __tablename__ = "certification_planner"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    provider = Column(String)
    target_date = Column(String, nullable=True)
    status = Column(String, default="planned")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="certifications")


class PlacementTracker(Base):
    __tablename__ = "placement_tracker"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    company = Column(String)
    role = Column(String)
    rounds_json = Column(Text, default="[]")
    package = Column(String, nullable=True)
    status = Column(String, default="eligible")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="placements")


class DailyMission(Base):
    __tablename__ = "daily_missions"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(String)
    dsa_goals_completed = Column(Integer, default=0)
    git_commits_completed = Column(Integer, default=0)
    linkedin_posts_completed = Column(Integer, default=0)
    jobs_applied_completed = Column(Integer, default=0)
    course_completed = Column(Integer, default=0)
    mock_interview_completed = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="daily_missions")


class ThesisProject(Base):
    __tablename__ = "thesis_projects"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    topic = Column(String)
    abstract = Column(Text, nullable=True)
    timeline_json = Column(Text, nullable=True)
    status = Column(String, default="draft")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="thesis_projects")


class LiteraturePaper(Base):
    __tablename__ = "literature_papers"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    thesis_id = Column(String, ForeignKey("thesis_projects.id"), nullable=True)
    title = Column(String)
    authors = Column(String, nullable=True)
    abstract = Column(Text, nullable=True)
    pdf_url = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    matrix_data_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="literature_papers")


class ExperimentLog(Base):
    __tablename__ = "experiment_logs"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    project_id = Column(String, nullable=True)
    model_name = Column(String)
    dataset = Column(String, nullable=True)
    hyperparameters_json = Column(Text, nullable=True)
    metrics_json = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="experiment_logs")


class PublicationTracker(Base):
    __tablename__ = "publication_tracker"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    venue = Column(String, nullable=True)
    status = Column(String, default="submitted") # submitted, accepted, published
    citations = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="publications")


class HigherEducationPlan(Base):
    __tablename__ = "higher_education_plans"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    target_degree = Column(String)
    gre_score = Column(String, nullable=True)
    toefl_score = Column(String, nullable=True)
    target_universities_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="higher_edu_plans")


class Goal(Base):
    __tablename__ = "goals"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    category = Column(String, default="General")
    status = Column(String, default="pending")
    priority = Column(String, default="medium")
    progress = Column(Integer, default=0)
    due_date = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="goals")



