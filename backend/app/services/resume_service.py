import logging
import io
import re
from typing import Optional

logger = logging.getLogger(__name__)

# --- ATS Keyword Banks ---
TECH_SKILLS = [
    # Programming Languages
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust", "swift", "kotlin",
    "r", "matlab", "scala", "php", "ruby", "dart", "bash", "shell",
    # Web & Frontend
    "react", "angular", "vue", "nextjs", "html", "css", "tailwind", "bootstrap",
    "redux", "graphql", "rest", "api",
    # Backend & Infra
    "fastapi", "django", "flask", "nodejs", "express", "spring", "docker", "kubernetes",
    "aws", "azure", "gcp", "terraform", "ci/cd", "git", "github", "linux",
    # Data & ML
    "machine learning", "deep learning", "nlp", "computer vision", "tensorflow", "pytorch",
    "scikit-learn", "pandas", "numpy", "sql", "postgresql", "mysql", "mongodb", "redis",
    "spark", "hadoop", "kafka", "airflow", "data engineering", "llm", "rag", "langchain",
    "hugging face", "transformers", "bert", "gpt",
    # Tools
    "jira", "agile", "scrum", "figma", "postman", "nginx", "celery",
]

SOFT_SKILLS = [
    "communication", "leadership", "teamwork", "collaboration", "problem solving",
    "critical thinking", "time management", "adaptability", "creativity", "analytical",
    "project management", "mentoring", "presentation",
]

SECTIONS = [
    "education", "experience", "projects", "skills", "certifications",
    "achievements", "summary", "objective", "internship", "publications",
]

DEGREE_KEYWORDS = ["b.tech", "b.e.", "btech", "b.sc", "m.tech", "mtech", "mba", "m.sc", "phd", "bachelor", "master"]
CGPA_PATTERN = re.compile(r"(\d+\.?\d*)\s*/\s*10|cgpa\s*[:\-]?\s*(\d+\.?\d*)", re.IGNORECASE)

# --- Role Skill Maps ---
ROLE_SKILLS = {
    "ml engineer": ["python", "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "sql", "docker", "mlops", "llm"],
    "software engineer": ["python", "javascript", "java", "git", "docker", "api", "sql", "system design", "data structures"],
    "frontend developer": ["react", "javascript", "typescript", "html", "css", "tailwind", "nextjs", "figma"],
    "backend developer": ["python", "fastapi", "django", "nodejs", "sql", "postgresql", "docker", "aws", "api", "redis"],
    "data scientist": ["python", "machine learning", "pandas", "numpy", "sql", "statistics", "visualization", "r", "tensorflow"],
    "devops engineer": ["docker", "kubernetes", "aws", "ci/cd", "terraform", "linux", "git", "bash", "jenkins"],
    "full stack developer": ["react", "nodejs", "javascript", "sql", "docker", "api", "html", "css", "git"],
}


def extract_text_from_pdf(content: bytes) -> str:
    """Extract text from a PDF file using PyPDF2."""
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        logger.error(f"PDF text extraction failed: {e}")
        return ""


def extract_text_from_txt(content: bytes) -> str:
    """Extract text from a plain text file."""
    try:
        return content.decode("utf-8", errors="ignore")
    except Exception:
        return ""


def analyze_resume(content: bytes, filename: str, target_role: Optional[str] = None) -> dict:
    """
    Core Resume Analyzer.
    Returns ATS Score, found skills, missing skills, suggestions, and section analysis.
    """
    # 1. Extract text
    ext = filename.lower().split(".")[-1]
    if ext == "pdf":
        text = extract_text_from_pdf(content)
    else:
        text = extract_text_from_txt(content)

    if not text.strip():
        return {"error": "Could not extract text from resume. Please upload a text-based PDF or .txt file."}

    text_lower = text.lower()

    # 2. Detect present sections
    found_sections = [s for s in SECTIONS if s in text_lower]
    missing_sections = [s for s in ["experience", "projects", "skills", "education"] if s not in found_sections]

    # 3. Detect tech skills
    found_tech = sorted(list(set([s for s in TECH_SKILLS if s in text_lower])))
    found_soft = sorted(list(set([s for s in SOFT_SKILLS if s in text_lower])))

    # 4. Detect degree/education
    has_degree = any(d in text_lower for d in DEGREE_KEYWORDS)
    cgpa_match = CGPA_PATTERN.search(text)
    cgpa = cgpa_match.group(1) or cgpa_match.group(2) if cgpa_match else None

    # 5. Word count & length
    word_count = len(text.split())
    length_score = 10 if 300 <= word_count <= 800 else (7 if word_count < 300 else 6)

    # 6. ATS scoring
    section_score = min(len(found_sections) / len(SECTIONS) * 25, 25)
    tech_skill_score = min(len(found_tech) / 10 * 30, 30)
    soft_skill_score = min(len(found_soft) / 5 * 10, 10)
    education_score = 15 if has_degree else 5
    length_score_out_of_10 = length_score
    ats_score = round(section_score + tech_skill_score + soft_skill_score + education_score + length_score_out_of_10)
    ats_score = min(ats_score, 100)

    # 7. Skill gap analysis for target role
    skill_gaps = []
    matched_role_skills = []
    if target_role:
        role_key = target_role.lower()
        for role, skills in ROLE_SKILLS.items():
            if role in role_key or role_key in role:
                matched_role_skills = skills
                break
        if matched_role_skills:
            skill_gaps = [s for s in matched_role_skills if s not in text_lower]

    # 8. Suggestions
    suggestions = []
    if not found_sections or "summary" not in found_sections:
        suggestions.append("Add a professional summary at the top — it improves ATS parsing and recruiter first impression.")
    if word_count < 300:
        suggestions.append("Resume is too short. Add more detail about your projects, experience, and impact.")
    if word_count > 800:
        suggestions.append("Resume is too long. Try to keep it to 1 page for freshers.")
    if len(found_tech) < 5:
        suggestions.append("Add a dedicated 'Skills' section with specific technologies you know.")
    if not has_degree:
        suggestions.append("Ensure your education section is clearly labeled and includes your degree.")
    if "projects" not in found_sections:
        suggestions.append("Add a 'Projects' section — this is critical for freshers with limited work experience.")
    if skill_gaps:
        suggestions.append(f"To target '{target_role}', you are missing these key skills: {', '.join(skill_gaps[:5])}.")
    if cgpa and float(cgpa) < 7.0:
        suggestions.append("If your CGPA is below 7.0, consider highlighting projects and certifications more prominently.")
    if not found_soft:
        suggestions.append("Include soft skills like 'communication', 'teamwork', or 'leadership' in your summary.")

    return {
        "ats_score": ats_score,
        "word_count": word_count,
        "found_sections": found_sections,
        "missing_sections": missing_sections,
        "tech_skills_found": found_tech,
        "soft_skills_found": found_soft,
        "skill_gaps": skill_gaps,
        "target_role": target_role,
        "education": {"has_degree": has_degree, "cgpa": cgpa},
        "suggestions": suggestions,
        "summary": f"Your resume scored {ats_score}/100 on the ATS scan. {'Strong profile!' if ats_score >= 75 else 'Good start — see suggestions below.' if ats_score >= 50 else 'Needs significant improvement. Follow the suggestions below.'}",
    }
