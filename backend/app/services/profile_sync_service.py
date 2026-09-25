import logging
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.models import UserProfile, UserSkill
from typing import List

logger = logging.getLogger(__name__)


class ProfileSyncService:
    def __init__(self):
        # Expanded synonym dictionary — maps abbreviations/aliases to canonical skill names
        self.skill_synonyms = {
            # JavaScript ecosystem
            "js": "JavaScript",
            "javascript": "JavaScript",
            "node": "Node.js",
            "nodejs": "Node.js",
            "node.js": "Node.js",
            "reactjs": "React",
            "react.js": "React",
            "nextjs": "Next.js",
            "next.js": "Next.js",
            "vuejs": "Vue.js",
            "vue.js": "Vue.js",
            "vue": "Vue.js",
            "angularjs": "Angular",
            "angular.js": "Angular",
            "expressjs": "Express.js",
            "express.js": "Express.js",
            "express": "Express.js",
            # Python ecosystem
            "py": "Python",
            "python3": "Python",
            "fastapi": "FastAPI",
            "flask": "Flask",
            "django": "Django",
            "pandas": "Pandas",
            "numpy": "NumPy",
            "sklearn": "Scikit-learn",
            "scikit": "Scikit-learn",
            "scikit-learn": "Scikit-learn",
            "tensorflow": "TensorFlow",
            "tf": "TensorFlow",
            "pytorch": "PyTorch",
            "torch": "PyTorch",
            "keras": "Keras",
            # TypeScript
            "ts": "TypeScript",
            "typescript": "TypeScript",
            # Markup / Styling
            "html5": "HTML",
            "html": "HTML",
            "css3": "CSS",
            "css": "CSS",
            "tailwind": "TailwindCSS",
            "tailwindcss": "TailwindCSS",
            # Cloud
            "aws": "Amazon Web Services",
            "amazon web services": "Amazon Web Services",
            "gcp": "Google Cloud Platform",
            "google cloud": "Google Cloud Platform",
            "azure": "Microsoft Azure",
            "microsoft azure": "Microsoft Azure",
            # Databases
            "postgres": "PostgreSQL",
            "postgresql": "PostgreSQL",
            "mongo": "MongoDB",
            "mongodb": "MongoDB",
            "mysql": "MySQL",
            "sqlite": "SQLite",
            "redis": "Redis",
            "elastic": "Elasticsearch",
            "elasticsearch": "Elasticsearch",
            "dynamo": "DynamoDB",
            "dynamodb": "DynamoDB",
            # DevOps / Infrastructure
            "k8s": "Kubernetes",
            "kubernetes": "Kubernetes",
            "terraform": "Terraform",
            "ci/cd": "CI/CD",
            "cicd": "CI/CD",
            "github actions": "GitHub Actions",
            "jenkins": "Jenkins",
            "ansible": "Ansible",
            "nginx": "Nginx",
            # APIs / Architecture
            "rest": "REST API",
            "restapi": "REST API",
            "rest api": "REST API",
            "graphql": "GraphQL",
            "grpc": "gRPC",
            "microservices": "Microservices",
            # Data / AI/ML
            "ml": "Machine Learning",
            "machine learning": "Machine Learning",
            "dl": "Deep Learning",
            "deep learning": "Deep Learning",
            "nlp": "Natural Language Processing",
            "llm": "Large Language Models",
            "rag": "Retrieval-Augmented Generation",
            "gen ai": "Generative AI",
            "genai": "Generative AI",
            "data science": "Data Science",
            "data engineering": "Data Engineering",
            # Version control
            "github": "GitHub",
            "gitlab": "GitLab",
            # Languages
            "cpp": "C++",
            "c sharp": "C#",
            "csharp": "C#",
            "golang": "Go",
            "go lang": "Go",
            "kotlin": "Kotlin",
            "swift": "Swift",
            "scala": "Scala",
            # General
            "oop": "Object-Oriented Programming",
            "dsa": "Data Structures & Algorithms",
            "agile": "Agile",
            "scrum": "Scrum",
            "jira": "Jira",
            "bash": "Bash/Shell",
            "shell": "Bash/Shell",
            "linux": "Linux",
        }

    def normalize_skills(self, skills: List[str]) -> List[str]:
        """Normalize a list of skill strings using synonym mapping.

        Handles both flat string lists and lists-of-dicts that some AI
        providers return (e.g. [{"name": "Python"}]).
        """
        normalized = []
        for skill in skills:
            # Safely extract string value from dicts if AI returns structured format
            if isinstance(skill, dict):
                skill = skill.get("name") or skill.get("skill") or skill.get("label") or ""
            if not isinstance(skill, str):
                continue
            clean_skill = skill.strip()
            if not clean_skill:
                continue
            lower_skill = clean_skill.lower()
            canonical = self.skill_synonyms.get(lower_skill, clean_skill)
            if canonical not in normalized:
                normalized.append(canonical)
        return normalized

    def sync_profile(
        self,
        db: Session,
        user_id: int,
        parsed_data: dict,
        resume_id: str | None = None,
        resume_version: int | None = None,
        target_role: str | None = None,
    ) -> None:
        """Merge parsed resume data into UserProfile and UserSkill.

        Only fills blank fields — existing user-entered data is never overwritten.
        """
        # ── 1. Upsert UserProfile ──────────────────────────────────────────────
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        if not profile:
            profile = UserProfile(user_id=user_id)
            db.add(profile)

        personal = parsed_data.get("personal_info") or {}
        if not profile.phone and personal.get("phone"):
            profile.phone = personal["phone"]

        if target_role and not profile.target_role:
            profile.target_role = target_role

        if parsed_data.get("summary") and not profile.background_summary:
            profile.background_summary = parsed_data["summary"]

        links = parsed_data.get("links") or {}
        if not profile.github_url and links.get("github"):
            profile.github_url = links["github"]
        if not profile.linkedin_url and links.get("linkedin"):
            profile.linkedin_url = links["linkedin"]
        if not profile.portfolio_url and links.get("portfolio"):
            profile.portfolio_url = links["portfolio"]

        education_list = parsed_data.get("education") or []
        if education_list:
            edu = education_list[0] if isinstance(education_list[0], dict) else {}
            if not profile.degree and edu.get("degree"):
                profile.degree = edu["degree"]
            if not profile.university and (edu.get("university") or edu.get("institution")):
                profile.university = edu.get("university") or edu.get("institution")
            if not profile.graduation_year and edu.get("graduation_year"):
                # FIX: graduation_year column is Integer — must cast safely
                try:
                    profile.graduation_year = int(edu["graduation_year"])
                except (ValueError, TypeError):
                    logger.warning(
                        "Could not parse graduation_year '%s' as int",
                        edu["graduation_year"],
                    )
            if not profile.cgpa and edu.get("cgpa"):
                try:
                    profile.cgpa = float(str(edu["cgpa"]).replace(",", "."))
                except (ValueError, TypeError):
                    pass

        soft_skills = parsed_data.get("soft_skills") or []
        if soft_skills:
            existing_soft = json.loads(profile.soft_skills_json or "[]")
            profile.soft_skills_json = json.dumps(list(dict.fromkeys(existing_soft + soft_skills)))

        languages = parsed_data.get("languages") or []
        if languages:
            existing_languages = json.loads(profile.languages_json or "[]")
            profile.languages_json = json.dumps(list(dict.fromkeys(existing_languages + languages)))

        certifications = parsed_data.get("certifications") or []
        if certifications:
            existing_certs = json.loads(profile.certifications_json or "[]")
            profile.certifications_json = json.dumps(
                list(dict.fromkeys(existing_certs + certifications))
            )

        if resume_id:
            profile.current_resume_id = resume_id
        if resume_version is not None:
            profile.resume_version = resume_version
        if parsed_data.get("overall_ats_score") is not None:
            profile.resume_ats_score = parsed_data["overall_ats_score"]
        profile.resume_last_parsed = datetime.now(timezone.utc)

        # ── 2. Upsert UserSkill ────────────────────────────────────────────────
        existing_skills = {
            sk.skill_name.lower(): sk
            for sk in db.query(UserSkill).filter(UserSkill.user_id == user_id).all()
        }

        raw_skills = parsed_data.get("tech_skills") or []
        normalized_skills = self.normalize_skills(raw_skills)

        new_skills_added = 0
        for skill_name in normalized_skills:
            if skill_name.lower() not in existing_skills:
                new_skill = UserSkill(
                    user_id=user_id,
                    skill_name=skill_name,
                    proficiency=2,  # 1=Beginner … 5=Expert; resume implies at least basic
                    source="resume",
                )
                db.add(new_skill)
                new_skills_added += 1

        db.commit()
        logger.info(
            "Profile synced: user_id=%s new_skills=%s resume_id=%s",
            user_id,
            new_skills_added,
            resume_id,
        )
