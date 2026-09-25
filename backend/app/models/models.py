import uuid
from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    DateTime,
    Text,
    Index,
    Boolean,
    Float,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship, backref
from datetime import datetime, timezone
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
    job_applications = relationship(
        "JobApplication", back_populates="owner", cascade="all, delete-orphan"
    )
    interview_sessions = relationship(
        "InterviewSession", back_populates="owner", cascade="all, delete-orphan"
    )
    roadmaps = relationship("LearningRoadmap", back_populates="owner", cascade="all, delete-orphan")
    notifications = relationship(
        "Notification", back_populates="owner", cascade="all, delete-orphan"
    )
    workspaces = relationship("AIWorkspace", back_populates="owner", cascade="all, delete-orphan")
    degree_trackers = relationship(
        "DegreeTracker", back_populates="owner", cascade="all, delete-orphan"
    )
    certifications = relationship(
        "CertificationPlanner", back_populates="owner", cascade="all, delete-orphan"
    )
    placements = relationship(
        "PlacementTracker", back_populates="owner", cascade="all, delete-orphan"
    )
    daily_missions = relationship(
        "DailyMission", back_populates="owner", cascade="all, delete-orphan"
    )
    thesis_projects = relationship(
        "ThesisProject", back_populates="owner", cascade="all, delete-orphan"
    )
    literature_papers = relationship(
        "LiteraturePaper", back_populates="owner", cascade="all, delete-orphan"
    )
    experiment_logs = relationship(
        "ExperimentLog", back_populates="owner", cascade="all, delete-orphan"
    )
    publications = relationship(
        "PublicationTracker", back_populates="owner", cascade="all, delete-orphan"
    )
    higher_edu_plans = relationship(
        "HigherEducationPlan", back_populates="owner", cascade="all, delete-orphan"
    )
    goals = relationship("Goal", back_populates="owner", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="owner", cascade="all, delete-orphan")
    refresh_tokens = relationship(
        "RefreshToken", back_populates="owner", cascade="all, delete-orphan"
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="refresh_tokens")


class AIWorkspace(Base):
    __tablename__ = "workspaces"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="workspaces")
    resumes = relationship("Resume", back_populates="workspace", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="workspace", cascade="all, delete-orphan")
    job_applications = relationship(
        "JobApplication", back_populates="workspace", cascade="all, delete-orphan"
    )


class Resume(Base):
    __tablename__ = "resumes"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True)
    filename = Column(String)
    file_path = Column(String)
    file_size = Column(Integer, default=0)
    version = Column(Integer, default=1)
    parsing_status = Column(String, default="pending")  # pending, completed, failed
    ats_score = Column(Integer, default=0)
    raw_text = Column(Text, nullable=True)
    parsed_json = Column(Text, nullable=True)  # Stores section analysis as stringified JSON
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="resumes")
    workspace = relationship("AIWorkspace", back_populates="resumes")


class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
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
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
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
    __table_args__ = (Index("ix_messages_session_timestamp", "session_id", "timestamp"),)


class Document(Base):
    __tablename__ = "documents"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
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
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    job_id = Column(String, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, index=True)
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
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
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
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String)
    target_role = Column(String)
    duration_days = Column(Integer, default=30)
    roadmap_json = Column(Text, nullable=True)  # Week-by-week layout
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="roadmaps")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String)
    content = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="notifications")


class DegreeTracker(Base):
    __tablename__ = "degree_tracker"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
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
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String)
    provider = Column(String)
    target_date = Column(String, nullable=True)
    status = Column(String, default="planned")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="certifications")


class PlacementTracker(Base):
    __tablename__ = "placement_tracker"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
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
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
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
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    topic = Column(String)
    abstract = Column(Text, nullable=True)
    timeline_json = Column(Text, nullable=True)
    status = Column(String, default="draft")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="thesis_projects")


class LiteraturePaper(Base):
    __tablename__ = "literature_papers"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
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
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
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
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String)
    venue = Column(String, nullable=True)
    status = Column(String, default="submitted")  # submitted, accepted, published
    citations = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="publications")


class HigherEducationPlan(Base):
    __tablename__ = "higher_education_plans"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    target_degree = Column(String)
    gre_score = Column(String, nullable=True)
    toefl_score = Column(String, nullable=True)
    target_universities_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="higher_edu_plans")


class Goal(Base):
    __tablename__ = "goals"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    parent_id = Column(String, ForeignKey("goals.id"), nullable=True)
    type = Column(String, default="GOAL")  # GOAL, MILESTONE, TASK
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    category = Column(String, default="General")
    status = Column(String, default="pending")
    priority = Column(String, default="medium")
    progress = Column(Integer, default=0)
    health_score = Column(Float, nullable=True)
    is_ai_managed = Column(Boolean, default=False)
    due_date = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="goals")
    children = relationship(
        "Goal",
        backref=backref("parent", remote_side="Goal.id"),
        cascade="all, delete-orphan",
    )


class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    tags = Column(String(500), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="notes")


class UserData(Base):
    __tablename__ = "user_data"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    key = Column(String, nullable=False)
    value = Column(Text, nullable=True)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class EventOutbox(Base):
    __tablename__ = "event_outbox"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    event_type = Column(String, index=True)
    payload_json = Column(Text)
    status = Column(String, default="pending")
    retry_count = Column(Integer, nullable=False, default=0)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class GoalTemplate(Base):
    __tablename__ = "goal_templates"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String)
    description = Column(Text, nullable=True)
    structure_json = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DecisionLog(Base):
    __tablename__ = "decision_logs"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    input_state_hash = Column(String)
    decision_json = Column(Text)
    execution_time_ms = Column(Integer)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Memory(Base):
    __tablename__ = "memories"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    type = Column(String)
    category = Column(String)
    subject = Column(String)
    value = Column(Text)
    confidence = Column(Float, default=1.0)
    importance = Column(Float, default=1.0)
    source = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class UserProfile(Base):
    __tablename__ = "user_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)

    # Existing fields
    headline = Column(String, nullable=True)
    career_stage = Column(String, nullable=True)
    target_role = Column(String, nullable=True)
    background_summary = Column(Text, nullable=True)

    # New Personal Fields
    phone = Column(String, nullable=True)
    profile_photo_url = Column(String(512), nullable=True)

    # New Education Fields
    degree = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    college = Column(String, nullable=True)
    university = Column(String, nullable=True)
    graduation_year = Column(Integer, nullable=True)
    cgpa = Column(Float, nullable=True)

    # New Career & Preferences Fields
    preferred_domains_json = Column(Text, nullable=True, default="[]")
    preferred_industries_json = Column(Text, nullable=True, default="[]")
    preferred_locations_json = Column(Text, nullable=True, default="[]")
    salary_expectations = Column(String, nullable=True)
    work_authorization = Column(String, nullable=True)
    work_preferences_json = Column(
        Text, nullable=True, default="[]"
    )  # e.g., ["Remote", "Full-time"]
    notification_preferences_json = Column(Text, nullable=True, default="{}")
    timezone = Column(String, nullable=True)

    # New Skills (Soft & Language) Fields
    soft_skills_json = Column(Text, nullable=True, default="[]")
    languages_json = Column(Text, nullable=True, default="[]")
    certifications_json = Column(Text, nullable=True, default="[]")

    # New Resume Metadata
    current_resume_id = Column(String, ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    resume_version = Column(Integer, default=1)
    resume_ats_score = Column(Integer, default=0)
    resume_last_parsed = Column(DateTime, nullable=True)

    # New Portfolio Fields
    github_url = Column(String(512), nullable=True)
    linkedin_url = Column(String(512), nullable=True)
    portfolio_url = Column(String(512), nullable=True)
    leetcode_url = Column(String(512), nullable=True)
    hackerrank_url = Column(String(512), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    owner = relationship(
        "User", backref=backref("profile", uselist=False, cascade="all, delete-orphan")
    )
    current_resume = relationship("Resume", foreign_keys=[current_resume_id])


class WorkflowState(Base):
    __tablename__ = "workflow_states"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    workflow_type = Column(String, index=True)
    current_step = Column(String)
    status = Column(String)
    context_payload = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class GoalDependency(Base):
    __tablename__ = "goal_dependencies"
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(String, ForeignKey("goals.id"))
    depends_on_id = Column(String, ForeignKey("goals.id"))


class GoalVersion(Base):
    __tablename__ = "goal_versions"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    goal_id = Column(String, ForeignKey("goals.id"))
    version_number = Column(Integer)
    snapshot_json = Column(Text)
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ── Job Ecosystem ──────────────────────────────────────────────────────────────


class Company(Base):
    """Normalized company entity — shared across all jobs."""

    __tablename__ = "companies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, unique=True, index=True)
    domain = Column(String(255), nullable=True)
    logo_url = Column(String(512), nullable=True)
    industry = Column(String(100), nullable=True)
    company_size = Column(String(50), nullable=True)  # e.g. "1-50", "500-1000", "10000+"
    headquarters = Column(String(255), nullable=True)
    website = Column(String(512), nullable=True)
    careers_url = Column(String(512), nullable=True)
    linkedin_url = Column(String(512), nullable=True)
    is_hiring = Column(Boolean, default=True)
    last_synced = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    jobs = relationship("Job", back_populates="company", cascade="all, delete-orphan")


class Job(Base):
    """A job posting. Status transitions: ACTIVE → EXPIRED."""

    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    job_type = Column(String(50), nullable=True)  # Internship, Full-time, Part-time
    employment_type = Column(String(50), nullable=True)  # On-site, Remote, Hybrid
    remote_type = Column(String(50), nullable=True)  # Fully Remote, Hybrid, On-site
    status = Column(String(20), nullable=False, default="ACTIVE")  # ACTIVE, EXPIRED
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    experience_required = Column(String(50), nullable=True)  # e.g. "0-1 years", "Fresher"
    apply_url = Column(String(512), nullable=True)
    source = Column(String(100), nullable=True)  # "seed", "admin", "api"
    source_job_id = Column(String(255), nullable=True, index=True)
    # Duplicate detection hash: sha256(company_name + title + location)
    dedup_hash = Column(String(64), nullable=True, unique=True)
    posted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    company = relationship("Company", back_populates="jobs")
    skills = relationship("JobSkill", back_populates="job", cascade="all, delete-orphan")
    saved_by = relationship("SavedJob", back_populates="job", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_jobs_status_expires", "status", "expires_at"),
        Index("ix_jobs_company_title", "company_id", "title"),
        Index("ix_jobs_location", "location"),
        Index("ix_jobs_job_type", "job_type"),
    )


class JobSkill(Base):
    """Normalized skill required for a job. Skill names are canonicalized."""

    __tablename__ = "job_skills"

    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True)
    skill_name = Column(String(100), primary_key=True)  # Always stored in canonical form
    is_required = Column(Boolean, default=True)

    job = relationship("Job", back_populates="skills")

    __table_args__ = (Index("ix_job_skills_skill_name", "skill_name"),)


class UserSkill(Base):
    """Skills extracted from a user's resume. Used for job matching."""

    __tablename__ = "user_skills"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    skill_name = Column(String(100), primary_key=True)  # Canonical form
    proficiency = Column(Integer, default=1)  # 1=Beginner … 5=Expert
    source = Column(String(50), nullable=True, default="resume")  # resume, manual, ai_inferred
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    owner = relationship("User", backref=backref("user_skills", cascade="all, delete-orphan"))

    __table_args__ = (
        Index("ix_user_skills_user_id", "user_id"),
        Index("ix_user_skills_skill_name", "skill_name"),
    )


class SavedJob(Base):
    """A job bookmarked by a user. Composite PK ensures uniqueness."""

    __tablename__ = "saved_jobs"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True)
    saved_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", backref=backref("saved_jobs", cascade="all, delete-orphan"))
    job = relationship("Job", back_populates="saved_by")


# ── Saarthi Discovery & Intelligence Models ────────────────────────────────────
# All new models are append-only; existing tables above are untouched.


class ConsentRecord(Base):
    """Records explicit user consent for data collection at the time of submission."""

    __tablename__ = "consent_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, nullable=False, index=True)  # anonymous session token
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    consent_given = Column(Boolean, default=True)
    consent_version = Column(String(20), default="1.0")
    ip_hash = Column(String(64), nullable=True)  # sha256(ip) — never raw IP
    user_agent_hash = Column(String(64), nullable=True)
    status = Column(String(20), default="active")  # active, withdrawn
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class UserDiscoveryProfile(Base):
    """
    Top-level discovery profile for a single user/company session.
    Links to all other discovery sub-entities.
    """

    __tablename__ = "user_discovery_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, nullable=False, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    consent_id = Column(String, ForeignKey("consent_records.id"), nullable=True)

    # User type (Student, Job Seeker, Working Professional, etc.)
    user_type = Column(String(80), nullable=True)
    user_type_other = Column(String(255), nullable=True)

    # Source (web, discover_page, api)
    source = Column(String(50), default="discover_page")
    status = Column(String(30), default="in_progress")  # in_progress, completed, partial

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    intents = relationship("UserIntent", back_populates="profile", cascade="all, delete-orphan")
    challenges = relationship(
        "CareerChallenge", back_populates="profile", cascade="all, delete-orphan"
    )
    feature_feedbacks = relationship(
        "FeatureFeedback", back_populates="profile", cascade="all, delete-orphan"
    )
    product_feedbacks = relationship(
        "ProductFeedback", back_populates="profile", cascade="all, delete-orphan"
    )
    opportunity_signals = relationship(
        "OpportunitySignal", back_populates="profile", cascade="all, delete-orphan"
    )


class UserIntent(Base):
    """What the user is trying to achieve (from the multi-select options)."""

    __tablename__ = "user_intents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id = Column(
        String,
        ForeignKey("user_discovery_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    intent_key = Column(String(100), nullable=False)  # e.g. "find_first_job", "improve_resume"
    intent_label = Column(String(255), nullable=True)  # Human-readable label
    is_primary = Column(Boolean, default=False)  # "Most important" flag
    free_text = Column(Text, nullable=True)  # "Other" description

    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    profile = relationship("UserDiscoveryProfile", back_populates="intents")


class CareerChallenge(Base):
    """Difficulty ratings across 10 career challenge areas (1-5 scale)."""

    __tablename__ = "career_challenges"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id = Column(
        String,
        ForeignKey("user_discovery_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 10 challenge areas
    finding_relevant_jobs = Column(Integer, nullable=True)  # 1=Easy, 5=Very Hard
    finding_genuine_opportunities = Column(Integer, nullable=True)
    understanding_jds = Column(Integer, nullable=True)
    knowing_qualification = Column(Integer, nullable=True)
    resume_improvement = Column(Integer, nullable=True)
    skill_gap_identification = Column(Integer, nullable=True)
    interview_preparation = Column(Integer, nullable=True)
    finding_companies = Column(Integer, nullable=True)
    tracking_applications = Column(Integer, nullable=True)
    knowing_what_to_learn = Column(Integer, nullable=True)

    biggest_difficulty = Column(Text, nullable=True)  # Free-text biggest challenge
    one_problem_to_solve = Column(Text, nullable=True)  # "If Saarthi could solve ONE problem..."

    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    profile = relationship("UserDiscoveryProfile", back_populates="challenges")


class FeatureFeedback(Base):
    """
    Rating for one of the 34 Saarthi feature areas.
    Each feature gets its own row.
    Values: not_useful | somewhat_useful | useful | very_useful | extremely_valuable | not_sure
    """

    __tablename__ = "feature_feedbacks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id = Column(
        String,
        ForeignKey("user_discovery_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    feature_id = Column(Integer, nullable=False)  # 1–34
    feature_key = Column(String(100), nullable=False)  # e.g. "job_discovery"
    feature_label = Column(String(255), nullable=True)
    rating = Column(String(30), nullable=False)  # not_useful | somewhat_useful | etc.
    is_most_valuable = Column(Boolean, default=False)
    is_least_valuable = Column(Boolean, default=False)
    is_missing = Column(Boolean, default=False)  # "I wish this existed"
    is_want_next = Column(Boolean, default=False)  # "Feature I want next"
    comment = Column(Text, nullable=True)

    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    profile = relationship("UserDiscoveryProfile", back_populates="feature_feedbacks")

    __table_args__ = (
        UniqueConstraint("profile_id", "feature_id", name="uq_profile_feature"),
        Index("ix_feature_feedbacks_feature_key", "feature_key"),
    )


class ProductFeedback(Base):
    """Open-ended product feedback from discovery questions."""

    __tablename__ = "product_feedbacks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id = Column(
        String,
        ForeignKey("user_discovery_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    what_you_like = Column(Text, nullable=True)
    what_you_dislike = Column(Text, nullable=True)
    what_feels_confusing = Column(Text, nullable=True)
    what_feels_unnecessary = Column(Text, nullable=True)
    what_feels_missing = Column(Text, nullable=True)
    would_use_regularly_if = Column(Text, nullable=True)
    wish_saarthi_could = Column(Text, nullable=True)
    should_never_do = Column(Text, nullable=True)
    improve_immediately = Column(Text, nullable=True)
    solve_next = Column(Text, nullable=True)
    would_recommend_if = Column(Text, nullable=True)

    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    profile = relationship("UserDiscoveryProfile", back_populates="product_feedbacks")


class OpportunitySignal(Base):
    """
    User-submitted opportunity signal (public job URL, company, role, skills).
    Goes through validation + deduplication before being considered for ingestion.
    """

    __tablename__ = "opportunity_signals"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id = Column(
        String,
        ForeignKey("user_discovery_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    public_job_url = Column(String(2048), nullable=True)
    company = Column(String(255), nullable=True)
    role = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    skills = Column(Text, nullable=True)  # Comma-separated or JSON
    additional_context = Column(Text, nullable=True)
    submitter_email = Column(String(255), nullable=True)  # Optional, only if user consented

    # Validation / ingestion lifecycle
    validation_status = Column(
        String(30), default="pending"
    )  # pending | valid | invalid | duplicate
    ingestion_status = Column(String(30), default="pending")  # pending | staged | rejected
    dedup_hash = Column(String(64), nullable=True, index=True)

    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    profile = relationship("UserDiscoveryProfile", back_populates="opportunity_signals")


class CompanyProfile(Base):
    """
    Company/recruiter/HR discovery profile.
    Separate from the main Company job table — this is intelligence data, not a job record.
    """

    __tablename__ = "company_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, nullable=False, unique=True, index=True)
    consent_id = Column(String, ForeignKey("consent_records.id"), nullable=True)

    company_name = Column(String(255), nullable=True)
    company_type = Column(String(100), nullable=True)  # startup, enterprise, agency, etc.
    industry = Column(String(100), nullable=True)
    company_size = Column(String(50), nullable=True)
    hiring_locations = Column(Text, nullable=True)  # JSON array
    roles_hired = Column(Text, nullable=True)  # JSON array
    experience_levels = Column(Text, nullable=True)  # JSON array
    skills_commonly_required = Column(Text, nullable=True)  # JSON array

    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_linkedin = Column(String(512), nullable=True)

    status = Column(String(20), default="active")
    source = Column(String(50), default="discover_page")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    hiring_signals = relationship(
        "HiringSignal", back_populates="company_profile", cascade="all, delete-orphan"
    )
    job_submissions = relationship(
        "JobSubmission", back_populates="company_profile", cascade="all, delete-orphan"
    )


class HiringSignal(Base):
    """Hiring challenge signals and needs from company/recruiter profiles."""

    __tablename__ = "hiring_signals"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_profile_id = Column(
        String,
        ForeignKey("company_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Hiring challenges (multi-select)
    finding_qualified_candidates = Column(Boolean, default=False)
    too_many_irrelevant_applications = Column(Boolean, default=False)
    skill_mismatch = Column(Boolean, default=False)
    resume_quality = Column(Boolean, default=False)
    candidate_screening = Column(Boolean, default=False)
    interview_readiness = Column(Boolean, default=False)
    candidate_availability = Column(Boolean, default=False)
    discovering_talent = Column(Boolean, default=False)
    hiring_speed = Column(Boolean, default=False)
    hiring_challenge_other = Column(Text, nullable=True)

    # How Saarthi could help (multi-select)
    wants_candidate_discovery = Column(Boolean, default=False)
    wants_skill_matching = Column(Boolean, default=False)
    wants_resume_intelligence = Column(Boolean, default=False)
    wants_skill_gap_insights = Column(Boolean, default=False)
    wants_opportunity_distribution = Column(Boolean, default=False)
    wants_hiring_analytics = Column(Boolean, default=False)
    wants_candidate_recommendations = Column(Boolean, default=False)
    wants_hiring_intelligence = Column(Boolean, default=False)

    what_platforms_miss = Column(Text, nullable=True)  # "What Saarthi should understand..."

    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    company_profile = relationship("CompanyProfile", back_populates="hiring_signals")


class JobSubmission(Base):
    """
    Public job opportunity submitted by a company/recruiter.
    Enters a controlled validation + deduplication pipeline before staging.
    """

    __tablename__ = "job_submissions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_profile_id = Column(
        String,
        ForeignKey("company_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    company = Column(String(255), nullable=True)
    role = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    experience_min = Column(Integer, nullable=True)
    experience_max = Column(Integer, nullable=True)
    skills = Column(Text, nullable=True)  # Comma-separated or JSON
    public_job_url = Column(String(2048), nullable=False)
    source_url = Column(String(2048), nullable=True)
    optional_hiring_contact = Column(String(255), nullable=True)
    additional_information = Column(Text, nullable=True)

    # Pipeline lifecycle
    validation_status = Column(String(30), default="pending")  # pending | valid | invalid
    dedup_status = Column(String(30), default="pending")  # pending | unique | duplicate
    sync_status = Column(String(30), default="pending")  # pending | staged | synced | rejected
    validation_errors = Column(Text, nullable=True)  # JSON list

    dedup_hash = Column(String(64), nullable=True, index=True)

    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    synced_at = Column(DateTime, nullable=True)

    company_profile = relationship("CompanyProfile", back_populates="job_submissions")


class ContactRequest(Base):
    """Contact form submission via 'Contact Saarthi'."""

    __tablename__ = "contact_requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    consent_id = Column(String, ForeignKey("consent_records.id"), nullable=True)

    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    linkedin_url = Column(String(512), nullable=True)
    role_type = Column(String(100), nullable=True)
    reason = Column(String(100), nullable=True)
    category = Column(
        String(100), nullable=True, default="general"
    )  # product_feedback | job_opportunity | hiring | collaboration | partnership | early_user | other
    message = Column(Text, nullable=False)
    consent_given = Column(Boolean, default=True)
    target_email = Column(String(255), default="saarthi.ai.team@gmail.com")
    contact_permission = Column(Boolean, default=True)

    # Processing lifecycle
    status = Column(String(30), default="new")  # new | reviewed | responded | archived
    admin_notes = Column(Text, nullable=True)  # Internal only

    source = Column(String(50), default="contact_page")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("ix_contact_requests_category", "category"),
        Index("ix_contact_requests_status", "status"),
    )


class FeedbackEvent(Base):
    """
    Aggregate feedback event for product intelligence.
    Populated asynchronously by the intelligence pipeline from
    UserDiscoveryProfile, FeatureFeedback, ProductFeedback data.
    Never exposes one user's data to another.
    """

    __tablename__ = "feedback_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    event_type = Column(
        String(100), nullable=False, index=True
    )  # e.g. "feature_rating", "pain_point_identified"
    entity_type = Column(String(80), nullable=True)  # which entity type this aggregates
    entity_id = Column(String(100), nullable=True)  # feature_key, challenge_key, etc.

    session_id = Column(String, nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    payload_json = Column(Text, nullable=True)

    # Aggregated metrics
    count = Column(Integer, default=1)
    score_sum = Column(Float, nullable=True)  # Sum of ratings for averaging
    score_avg = Column(Float, nullable=True)
    score_count = Column(Integer, default=0)

    # AI-generated insight (from aggregated, anonymised data only)
    ai_insight = Column(Text, nullable=True)
    ai_insight_generated_at = Column(DateTime, nullable=True)

    period = Column(String(20), default="all_time")  # all_time | weekly | monthly
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)

    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (Index("ix_feedback_events_type_entity", "event_type", "entity_id"),)
