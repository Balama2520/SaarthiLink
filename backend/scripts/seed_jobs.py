"""
seed_jobs.py — Idempotent Job Ecosystem Seeder for Saarthi Beta
===============================================================
Run from the backend/ directory with the venv activated:

    python -m scripts.seed_jobs

This script is IDEMPOTENT: running it multiple times will never create
duplicate Companies, Jobs, or JobSkills. It relies on the `dedup_hash`
column on Job (sha256 of company_name + title + location) and the
unique constraint on Company.name.

Dataset: 120 curated real-world undergraduate-friendly roles (internships +
new-grad full-time) across SWE, Data, AI/ML, DevOps, and Product tracks.
"""

import hashlib
import logging
import os
import sys
import time
from datetime import datetime, timedelta, timezone

# Ensure backend root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session

from app.database.connection import SessionLocal, engine
from app.models.models import Base, Company, Job, JobSkill
from app.core.skill_normalizer import normalize_skill

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger("seed_jobs")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_hash(company_name: str, title: str, location: str) -> str:
    """SHA-256 duplicate detection hash."""
    raw = f"{company_name.lower().strip()}|{title.lower().strip()}|{location.lower().strip()}"
    return hashlib.sha256(raw.encode()).hexdigest()


def upsert_company(db: Session, data: dict) -> Company:
    """Insert company or return existing by unique name."""
    existing = db.query(Company).filter(Company.name == data["name"]).first()
    if existing:
        return existing
    company = Company(**data)
    db.add(company)
    db.flush()
    return company


def upsert_job(db: Session, company: Company, data: dict, skills: list[dict]) -> tuple[Job, bool]:
    """
    Insert job if its dedup_hash doesn't exist yet.
    Returns (job, was_created).
    """
    dedup = make_hash(company.name, data["title"], data.get("location", ""))
    existing = db.query(Job).filter(Job.dedup_hash == dedup).first()
    if existing:
        return existing, False

    job = Job(
        company_id=company.id,
        dedup_hash=dedup,
        source="seed",
        posted_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=90),
        **data,
    )
    db.add(job)
    db.flush()

    for s in skills:
        canonical = normalize_skill(s["name"])
        if canonical:
            db.add(JobSkill(
                job_id=job.id,
                skill_name=canonical,
                is_required=s.get("required", True),
            ))
    return job, True


# ---------------------------------------------------------------------------
# Seed Data
# ---------------------------------------------------------------------------

SEED_DATA: list[dict] = [
    # ── 09_JOBS_STAGING Google Sheet Board Imports ────────────────────────────────
    {
        "company": {
            "name": "Razorpay",
            "domain": "razorpay.com",
            "logo_url": "https://logo.clearbit.com/razorpay.com",
            "industry": "Fintech / Payments",
            "company_size": "1000-5000",
            "headquarters": "Bengaluru, India",
            "website": "https://razorpay.com",
            "careers_url": "https://razorpay.com/jobs",
            "linkedin_url": "https://linkedin.com/company/razorpay",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Graduate Engineer Trainee",
                    "description": "Join Razorpay's engineering core team. Build scalable payment gateway services, merchant dashboards, and banking integrations.",
                    "location": "Bengaluru, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher (0-1y)",
                    "salary_min": 1200000,
                    "salary_max": 1600000,
                    "apply_url": "https://razorpay.com/jobs",
                },
                "skills": [
                    {"name": "java", "required": True},
                    {"name": "golang", "required": True},
                    {"name": "sql", "required": True},
                    {"name": "rest api", "required": False},
                ],
            }
        ],
    },
    {
        "company": {
            "name": "Postman",
            "domain": "postman.com",
            "logo_url": "https://logo.clearbit.com/postman.com",
            "industry": "API Development / Software",
            "company_size": "500-1000",
            "headquarters": "Bengaluru, India",
            "website": "https://postman.com",
            "careers_url": "https://postman.com/careers",
            "linkedin_url": "https://linkedin.com/company/postman-platform",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Junior Software Engineer",
                    "description": "Build features for the Postman API Platform used by 25M+ developers. Work across Node.js, React, and cloud infrastructure.",
                    "location": "Bengaluru, India",
                    "job_type": "Full-time",
                    "employment_type": "Hybrid",
                    "remote_type": "Hybrid",
                    "experience_required": "Entry (0-2y)",
                    "salary_min": 800000,
                    "salary_max": 1400000,
                    "apply_url": "https://postman.com/careers",
                },
                "skills": [
                    {"name": "python", "required": True},
                    {"name": "javascript", "required": True},
                    {"name": "sql", "required": True},
                    {"name": "react", "required": False},
                ],
            }
        ],
    },
    {
        "company": {
            "name": "Navi",
            "domain": "navi.com",
            "logo_url": "https://logo.clearbit.com/navi.com",
            "industry": "Fintech / Financial Services",
            "company_size": "1000-5000",
            "headquarters": "Bengaluru, India",
            "website": "https://navi.com",
            "careers_url": "https://navi.com/careers",
            "linkedin_url": "https://linkedin.com/company/navi-tech",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Data Analyst",
                    "description": "Analyze credit, insurance, and lending data. Work closely with business and risk teams using SQL, Excel, and Tableau dashboards.",
                    "location": "Bengaluru, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher (0-1y)",
                    "salary_min": 600000,
                    "salary_max": 1000000,
                    "apply_url": "https://navi.com/careers",
                },
                "skills": [
                    {"name": "excel", "required": True},
                    {"name": "sql", "required": True},
                    {"name": "tableau", "required": True},
                    {"name": "python", "required": False},
                ],
            }
        ],
    },
    {
        "company": {
            "name": "Tantranzm",
            "domain": "tantranzm.com",
            "logo_url": "https://logo.clearbit.com/tantranzm.com",
            "industry": "Enterprise Technology & Consulting",
            "company_size": "100-500",
            "headquarters": "Gurugram, India",
            "website": "https://tantranzm.com",
            "careers_url": "https://tantranzm.com/careers",
            "linkedin_url": "https://linkedin.com/company/tantranzm",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Fresher – Cloud, AI & Enterprise Technology Associate",
                    "description": "Entry-level engineering role working with Python, Java, cloud services, and REST APIs for enterprise clients.",
                    "location": "Gurugram, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher (0-1y)",
                    "salary_min": 400000,
                    "salary_max": 700000,
                    "apply_url": "https://tantranzm.com/careers",
                },
                "skills": [
                    {"name": "python", "required": True},
                    {"name": "java", "required": True},
                    {"name": "javascript", "required": True},
                    {"name": "c++", "required": False},
                    {"name": "databases", "required": True},
                    {"name": "apis", "required": True},
                ],
            }
        ],
    },
    {
        "company": {
            "name": "pharma&",
            "domain": "pharmaand.com",
            "logo_url": "https://logo.clearbit.com/pharmaand.com",
            "industry": "Healthcare / Life Sciences AI",
            "company_size": "100-500",
            "headquarters": "Hyderabad, India",
            "website": "https://pharmaand.com",
            "careers_url": "https://pharmaand.com/careers",
            "linkedin_url": "https://linkedin.com/company/pharma-and",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "AI & Machine Learning Intern",
                    "description": "Assist in building ML data pipelines, NLP models, and data extraction pipelines for pharmaceutical research data.",
                    "location": "Hyderabad, India",
                    "job_type": "Internship",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher (0-1y)",
                    "salary_min": 180000,
                    "salary_max": 240000,
                    "apply_url": "https://pharmaand.com/careers",
                },
                "skills": [
                    {"name": "python", "required": True},
                    {"name": "pandas", "required": True},
                    {"name": "numpy", "required": True},
                    {"name": "machine learning", "required": False},
                ],
            }
        ],
    },
    {
        "company": {
            "name": "Swiggy",
            "domain": "swiggy.com",
            "logo_url": "https://logo.clearbit.com/swiggy.com",
            "industry": "Food Tech",
            "company_size": "5000-10000",
            "headquarters": "Bengaluru, India",
            "website": "https://swiggy.com",
            "careers_url": "https://careers.swiggy.com",
            "linkedin_url": "https://linkedin.com/company/swiggy",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Senior Engineering Manager",
                    "description": "Lead engineering teams building high-throughput logistics, search, and ordering engines at massive scale.",
                    "location": "Bengaluru, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Senior (8y+)",
                    "salary_min": 4000000,
                    "salary_max": 6000000,
                    "apply_url": "https://careers.swiggy.com",
                },
                "skills": [
                    {"name": "architecture", "required": True},
                    {"name": "management", "required": True},
                    {"name": "system design", "required": True},
                ],
            }
        ],
    },
    {
        "company": {
            "name": "BBL Consultants",
            "domain": "bblconsultants.com",
            "logo_url": "https://logo.clearbit.com/bblconsultants.com",
            "industry": "IT Consulting & Data",
            "company_size": "50-200",
            "headquarters": "Chennai, India",
            "website": "https://bblconsultants.com",
            "careers_url": "https://bblconsultants.com/careers",
            "linkedin_url": "https://linkedin.com/company/bbl-consultants",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Data Engineer Trainer",
                    "description": "Train and architect big data solutions using Databricks, Apache Spark, Delta Lake, and cloud data warehouses.",
                    "location": "Chennai, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Mid (2y+)",
                    "salary_min": 800000,
                    "salary_max": 1500000,
                    "apply_url": "https://bblconsultants.com/careers",
                },
                "skills": [
                    {"name": "databricks", "required": True},
                    {"name": "apache spark", "required": True},
                    {"name": "delta lake", "required": True},
                ],
            }
        ],
    },
    {
        "company": {
            "name": "micro1",
            "domain": "micro1.ai",
            "logo_url": "https://logo.clearbit.com/micro1.ai",
            "industry": "AI & Offshore Engineering Platform",
            "company_size": "100-500",
            "headquarters": "Remote / San Francisco, CA",
            "website": "https://micro1.ai",
            "careers_url": "https://micro1.ai/careers",
            "linkedin_url": "https://linkedin.com/company/micro1",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Senior Platform Engineer",
                    "description": "Build cloud platform infrastructure, Kubernetes clusters, and automated developer tooling.",
                    "location": "Remote, US",
                    "job_type": "Full-time",
                    "employment_type": "Remote",
                    "remote_type": "Fully Remote",
                    "experience_required": "Mid (3y+)",
                    "salary_min": 5000000,
                    "salary_max": 10000000,
                    "apply_url": "https://micro1.ai/careers",
                },
                "skills": [
                    {"name": "cloud infrastructure", "required": True},
                    {"name": "platform engineering", "required": True},
                    {"name": "devops", "required": True},
                ],
            }
        ],
    },
    {
        "company": {
            "name": "Infosys Finacle",
            "domain": "edgeverve.com",
            "logo_url": "https://logo.clearbit.com/edgeverve.com",
            "industry": "Banking Technology / SaaS",
            "company_size": "5000-10000",
            "headquarters": "Chennai, India",
            "website": "https://edgeverve.com",
            "careers_url": "https://edgeverve.com/careers",
            "linkedin_url": "https://linkedin.com/company/infosys-finacle",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Data Scientist - AI/ML Engineer",
                    "description": "Develop Generative AI, LLM, and RAG solutions for core banking and financial analytics products.",
                    "location": "Chennai, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Senior (6y+)",
                    "salary_min": 1500000,
                    "salary_max": 2800000,
                    "apply_url": "https://edgeverve.com/careers",
                },
                "skills": [
                    {"name": "genai", "required": True},
                    {"name": "python", "required": True},
                    {"name": "llm & rag", "required": True},
                ],
            }
        ],
    },
    {
        "company": {
            "name": "Wayfair",
            "domain": "wayfair.com",
            "logo_url": "https://logo.clearbit.com/wayfair.com",
            "industry": "E-Commerce / Tech",
            "company_size": "10000+",
            "headquarters": "Boston, MA",
            "website": "https://wayfair.com",
            "careers_url": "https://wayfair.com/careers",
            "linkedin_url": "https://linkedin.com/company/wayfair",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Machine Learning II",
                    "description": "Develop ranking algorithms, visual search, and recommendation engines for e-commerce catalog search.",
                    "location": "Bengaluru, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Mid (3y+)",
                    "salary_min": 1800000,
                    "salary_max": 3200000,
                    "apply_url": "https://wayfair.com/careers",
                },
                "skills": [
                    {"name": "python", "required": True},
                    {"name": "machine learning", "required": True},
                    {"name": "nlp", "required": True},
                ],
            }
        ],
    },
    # ── Google ────────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Google",
            "domain": "google.com",
            "logo_url": "https://logo.clearbit.com/google.com",
            "industry": "Technology",
            "company_size": "10000+",
            "headquarters": "Mountain View, CA",
            "website": "https://google.com",
            "careers_url": "https://careers.google.com",
            "linkedin_url": "https://linkedin.com/company/google",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Software Engineering Intern",
                    "description": "Work on large-scale distributed systems, contribute to production code, and collaborate with world-class engineers. Interns own projects end-to-end.",
                    "location": "Bangalore, India",
                    "job_type": "Internship",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher",
                    "salary_min": 80000,
                    "salary_max": 120000,
                    "apply_url": "https://careers.google.com/students/",
                },
                "skills": [
                    {"name": "python", "required": True},
                    {"name": "data structures", "required": True},
                    {"name": "algorithms", "required": True},
                    {"name": "java", "required": False},
                    {"name": "c++", "required": False},
                    {"name": "system design", "required": False},
                ],
            },
            {
                "info": {
                    "title": "Data Analyst Intern",
                    "description": "Analyze large datasets, build dashboards, and provide actionable insights to Google product teams. Work with SQL, BigQuery, and Looker.",
                    "location": "Hyderabad, India",
                    "job_type": "Internship",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher",
                    "salary_min": 70000,
                    "salary_max": 100000,
                    "apply_url": "https://careers.google.com/students/",
                },
                "skills": [
                    {"name": "sql", "required": True},
                    {"name": "python", "required": True},
                    {"name": "data visualization", "required": True},
                    {"name": "bigquery", "required": False},
                    {"name": "statistics", "required": False},
                ],
            },
        ],
    },
    # ── Microsoft ─────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Microsoft",
            "domain": "microsoft.com",
            "logo_url": "https://logo.clearbit.com/microsoft.com",
            "industry": "Technology",
            "company_size": "10000+",
            "headquarters": "Redmond, WA",
            "website": "https://microsoft.com",
            "careers_url": "https://careers.microsoft.com",
            "linkedin_url": "https://linkedin.com/company/microsoft",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Software Engineer – New Graduate",
                    "description": "Join Microsoft engineering to build products used by billions. You'll design, develop, and ship features in a fast-paced collaborative environment.",
                    "location": "Bangalore, India",
                    "job_type": "Full-time",
                    "employment_type": "Hybrid",
                    "remote_type": "Hybrid",
                    "experience_required": "0-1 years",
                    "salary_min": 2000000,
                    "salary_max": 3500000,
                    "apply_url": "https://careers.microsoft.com/students/us/en/new-grad",
                },
                "skills": [
                    {"name": "c++", "required": True},
                    {"name": "python", "required": True},
                    {"name": "algorithms", "required": True},
                    {"name": "azure", "required": False},
                    {"name": "typescript", "required": False},
                    {"name": "system design", "required": False},
                ],
            },
            {
                "info": {
                    "title": "Cloud & AI Engineer Intern",
                    "description": "Work on Azure AI services, integrate LLMs into enterprise workflows, and contribute to the Azure Machine Learning platform.",
                    "location": "Hyderabad, India",
                    "job_type": "Internship",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher",
                    "salary_min": 90000,
                    "salary_max": 130000,
                    "apply_url": "https://careers.microsoft.com/students",
                },
                "skills": [
                    {"name": "python", "required": True},
                    {"name": "machine learning", "required": True},
                    {"name": "azure", "required": False},
                    {"name": "pytorch", "required": False},
                    {"name": "rest api", "required": False},
                ],
            },
        ],
    },
    # ── Amazon ────────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Amazon",
            "domain": "amazon.com",
            "logo_url": "https://logo.clearbit.com/amazon.com",
            "industry": "E-Commerce / Cloud",
            "company_size": "10000+",
            "headquarters": "Seattle, WA",
            "website": "https://amazon.com",
            "careers_url": "https://amazon.jobs",
            "linkedin_url": "https://linkedin.com/company/amazon",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "SDE Intern (Summer)",
                    "description": "Build features on AWS or Amazon retail platform. Interns deliver production-grade code and present projects to senior leadership.",
                    "location": "Bangalore, India",
                    "job_type": "Internship",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher",
                    "salary_min": 100000,
                    "salary_max": 140000,
                    "apply_url": "https://amazon.jobs/en/jobs",
                },
                "skills": [
                    {"name": "java", "required": True},
                    {"name": "data structures", "required": True},
                    {"name": "algorithms", "required": True},
                    {"name": "amazon web services", "required": False},
                    {"name": "python", "required": False},
                ],
            },
            {
                "info": {
                    "title": "Business Analyst Intern",
                    "description": "Analyze business metrics, build reports in Excel and Tableau, and support operational decisions across Amazon's logistics network.",
                    "location": "Mumbai, India",
                    "job_type": "Internship",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher",
                    "salary_min": 60000,
                    "salary_max": 90000,
                    "apply_url": "https://amazon.jobs/en/jobs",
                },
                "skills": [
                    {"name": "sql", "required": True},
                    {"name": "excel", "required": True},
                    {"name": "tableau", "required": False},
                    {"name": "python", "required": False},
                    {"name": "data analysis", "required": True},
                ],
            },
        ],
    },
    # ── Meta ──────────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Meta",
            "domain": "meta.com",
            "logo_url": "https://logo.clearbit.com/meta.com",
            "industry": "Technology / Social Media",
            "company_size": "10000+",
            "headquarters": "Menlo Park, CA",
            "website": "https://meta.com",
            "careers_url": "https://metacareers.com",
            "linkedin_url": "https://linkedin.com/company/meta",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Software Engineer Intern (University)",
                    "description": "Build features for Facebook, Instagram, WhatsApp, and the Metaverse. Work in a full-stack capacity with Hack, React, and Python.",
                    "location": "Remote / London, UK",
                    "job_type": "Internship",
                    "employment_type": "Remote",
                    "remote_type": "Fully Remote",
                    "experience_required": "Fresher",
                    "salary_min": 120000,
                    "salary_max": 180000,
                    "apply_url": "https://metacareers.com/students",
                },
                "skills": [
                    {"name": "python", "required": True},
                    {"name": "react", "required": False},
                    {"name": "algorithms", "required": True},
                    {"name": "data structures", "required": True},
                    {"name": "php", "required": False},
                ],
            },
        ],
    },
    # ── Flipkart ──────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Flipkart",
            "domain": "flipkart.com",
            "logo_url": "https://logo.clearbit.com/flipkart.com",
            "industry": "E-Commerce",
            "company_size": "10000+",
            "headquarters": "Bangalore, India",
            "website": "https://flipkart.com",
            "careers_url": "https://flipkartcareers.com",
            "linkedin_url": "https://linkedin.com/company/flipkart",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Software Development Engineer – Fresher",
                    "description": "Join Flipkart's engineering team to build scalable microservices, work on the catalog search platform, or contribute to payments infrastructure.",
                    "location": "Bangalore, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher",
                    "salary_min": 1800000,
                    "salary_max": 2800000,
                    "apply_url": "https://flipkartcareers.com",
                },
                "skills": [
                    {"name": "java", "required": True},
                    {"name": "spring boot", "required": True},
                    {"name": "microservices", "required": False},
                    {"name": "sql", "required": True},
                    {"name": "kafka", "required": False},
                    {"name": "system design", "required": False},
                ],
            },
            {
                "info": {
                    "title": "Product Management Intern",
                    "description": "Define product requirements, work with engineering and design teams, and launch new features on the Flipkart app used by 200 million customers.",
                    "location": "Bangalore, India",
                    "job_type": "Internship",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher",
                    "salary_min": 50000,
                    "salary_max": 80000,
                    "apply_url": "https://flipkartcareers.com",
                },
                "skills": [
                    {"name": "product management", "required": True},
                    {"name": "sql", "required": False},
                    {"name": "user research", "required": True},
                    {"name": "agile", "required": False},
                    {"name": "figma", "required": False},
                ],
            },
        ],
    },
    # ── Razorpay ──────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Razorpay",
            "domain": "razorpay.com",
            "logo_url": "https://logo.clearbit.com/razorpay.com",
            "industry": "Fintech",
            "company_size": "1000-5000",
            "headquarters": "Bangalore, India",
            "website": "https://razorpay.com",
            "careers_url": "https://razorpay.com/jobs",
            "linkedin_url": "https://linkedin.com/company/razorpay",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Backend Engineer – New Grad",
                    "description": "Build the payment infrastructure that processes millions of transactions daily. Own services end-to-end in a microservices architecture.",
                    "location": "Bangalore, India",
                    "job_type": "Full-time",
                    "employment_type": "Hybrid",
                    "remote_type": "Hybrid",
                    "experience_required": "0-1 years",
                    "salary_min": 1200000,
                    "salary_max": 2000000,
                    "apply_url": "https://razorpay.com/jobs",
                },
                "skills": [
                    {"name": "golang", "required": True},
                    {"name": "python", "required": False},
                    {"name": "postgresql", "required": True},
                    {"name": "redis", "required": False},
                    {"name": "microservices", "required": False},
                    {"name": "rest api", "required": True},
                ],
            },
        ],
    },
    # ── Zomato ────────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Zomato",
            "domain": "zomato.com",
            "logo_url": "https://logo.clearbit.com/zomato.com",
            "industry": "Food Tech",
            "company_size": "5000-10000",
            "headquarters": "Gurugram, India",
            "website": "https://zomato.com",
            "careers_url": "https://www.zomato.com/careers",
            "linkedin_url": "https://linkedin.com/company/zomato",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Data Science Intern",
                    "description": "Work on demand forecasting, restaurant recommendation algorithms, and logistics optimization using Python and ML frameworks.",
                    "location": "Gurugram, India",
                    "job_type": "Internship",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher",
                    "salary_min": 60000,
                    "salary_max": 100000,
                    "apply_url": "https://www.zomato.com/careers",
                },
                "skills": [
                    {"name": "python", "required": True},
                    {"name": "machine learning", "required": True},
                    {"name": "sql", "required": True},
                    {"name": "pandas", "required": True},
                    {"name": "scikit-learn", "required": False},
                ],
            },
            {
                "info": {
                    "title": "Android Engineer – Fresher",
                    "description": "Build and ship Android app features for Zomato's consumer-facing app. Work with Kotlin, Jetpack Compose, and a high-throughput backend.",
                    "location": "Gurugram, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher",
                    "salary_min": 1000000,
                    "salary_max": 1600000,
                    "apply_url": "https://www.zomato.com/careers",
                },
                "skills": [
                    {"name": "kotlin", "required": True},
                    {"name": "android", "required": True},
                    {"name": "jetpack compose", "required": False},
                    {"name": "rest api", "required": True},
                    {"name": "git", "required": True},
                ],
            },
        ],
    },
    # ── Ola ───────────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Ola",
            "domain": "olacabs.com",
            "logo_url": "https://logo.clearbit.com/olacabs.com",
            "industry": "Mobility / Transportation",
            "company_size": "5000-10000",
            "headquarters": "Bangalore, India",
            "website": "https://olacabs.com",
            "careers_url": "https://jobs.lever.co/ola",
            "linkedin_url": "https://linkedin.com/company/ola-cabs",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Machine Learning Engineer – Entry Level",
                    "description": "Train and deploy ML models for ETA prediction, demand forecasting, and route optimization at scale across Ola's platform.",
                    "location": "Bangalore, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "0-1 years",
                    "salary_min": 1000000,
                    "salary_max": 1800000,
                    "apply_url": "https://jobs.lever.co/ola",
                },
                "skills": [
                    {"name": "python", "required": True},
                    {"name": "machine learning", "required": True},
                    {"name": "tensorflow", "required": False},
                    {"name": "pytorch", "required": False},
                    {"name": "sql", "required": True},
                    {"name": "spark", "required": False},
                ],
            },
        ],
    },
    # ── Infosys ───────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Infosys",
            "domain": "infosys.com",
            "logo_url": "https://logo.clearbit.com/infosys.com",
            "industry": "IT Services",
            "company_size": "10000+",
            "headquarters": "Bangalore, India",
            "website": "https://infosys.com",
            "careers_url": "https://infosys.com/careers",
            "linkedin_url": "https://linkedin.com/company/infosys",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Systems Engineer – Campus Hire",
                    "description": "Join Infosys as a Systems Engineer in our flagship Instep program. Rotate across technology stacks including Java, .NET, and cloud platforms.",
                    "location": "Multiple Locations, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher",
                    "salary_min": 360000,
                    "salary_max": 600000,
                    "apply_url": "https://infosys.com/careers",
                },
                "skills": [
                    {"name": "java", "required": True},
                    {"name": "sql", "required": True},
                    {"name": "html", "required": False},
                    {"name": "css", "required": False},
                    {"name": "communication skills", "required": True},
                ],
            },
        ],
    },
    # ── TCS ───────────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "TCS",
            "domain": "tcs.com",
            "logo_url": "https://logo.clearbit.com/tcs.com",
            "industry": "IT Services",
            "company_size": "10000+",
            "headquarters": "Mumbai, India",
            "website": "https://tcs.com",
            "careers_url": "https://careers.tcs.com",
            "linkedin_url": "https://linkedin.com/company/tata-consultancy-services",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Assistant System Engineer – Fresher",
                    "description": "Kickstart your career with TCS's large-scale enterprise projects in banking, retail, and telecom. 45-day initial training followed by project placement.",
                    "location": "Pan India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher",
                    "salary_min": 350000,
                    "salary_max": 420000,
                    "apply_url": "https://nextstep.tcs.com/campus",
                },
                "skills": [
                    {"name": "c++", "required": False},
                    {"name": "java", "required": False},
                    {"name": "sql", "required": True},
                    {"name": "communication skills", "required": True},
                    {"name": "problem solving", "required": True},
                ],
            },
        ],
    },
    # ── PhonePe ───────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "PhonePe",
            "domain": "phonepe.com",
            "logo_url": "https://logo.clearbit.com/phonepe.com",
            "industry": "Fintech",
            "company_size": "1000-5000",
            "headquarters": "Bangalore, India",
            "website": "https://phonepe.com",
            "careers_url": "https://phonepe.com/careers",
            "linkedin_url": "https://linkedin.com/company/phonepe-internet",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Backend Engineer – New Grad",
                    "description": "Build fault-tolerant, high-throughput microservices for PhonePe's UPI payment platform. Work at 100M+ transactions per day scale.",
                    "location": "Bangalore, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "0-1 years",
                    "salary_min": 1500000,
                    "salary_max": 2500000,
                    "apply_url": "https://phonepe.com/careers",
                },
                "skills": [
                    {"name": "java", "required": True},
                    {"name": "spring boot", "required": True},
                    {"name": "microservices", "required": True},
                    {"name": "postgresql", "required": False},
                    {"name": "redis", "required": False},
                ],
            },
        ],
    },
    # ── Swiggy ────────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Swiggy",
            "domain": "swiggy.com",
            "logo_url": "https://logo.clearbit.com/swiggy.com",
            "industry": "Food Tech",
            "company_size": "5000-10000",
            "headquarters": "Bangalore, India",
            "website": "https://swiggy.com",
            "careers_url": "https://careers.swiggy.com",
            "linkedin_url": "https://linkedin.com/company/swiggy",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "SDE-1 (Backend) – Fresher",
                    "description": "Work on Swiggy's delivery optimization, catalog search, or pricing engine. Responsibilities span system design, coding, and production debugging.",
                    "location": "Bangalore, India",
                    "job_type": "Full-time",
                    "employment_type": "Hybrid",
                    "remote_type": "Hybrid",
                    "experience_required": "0-1 years",
                    "salary_min": 1200000,
                    "salary_max": 2200000,
                    "apply_url": "https://careers.swiggy.com",
                },
                "skills": [
                    {"name": "python", "required": True},
                    {"name": "golang", "required": False},
                    {"name": "microservices", "required": True},
                    {"name": "kafka", "required": False},
                    {"name": "postgresql", "required": True},
                ],
            },
            {
                "info": {
                    "title": "Data Engineering Intern",
                    "description": "Build data pipelines, work with Spark and Hadoop, and deliver business-critical analytics dashboards for the ops team.",
                    "location": "Bangalore, India",
                    "job_type": "Internship",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher",
                    "salary_min": 60000,
                    "salary_max": 90000,
                    "apply_url": "https://careers.swiggy.com",
                },
                "skills": [
                    {"name": "python", "required": True},
                    {"name": "spark", "required": True},
                    {"name": "sql", "required": True},
                    {"name": "hadoop", "required": False},
                    {"name": "airflow", "required": False},
                ],
            },
        ],
    },
    # ── CRED ──────────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "CRED",
            "domain": "cred.club",
            "logo_url": "https://logo.clearbit.com/cred.club",
            "industry": "Fintech",
            "company_size": "500-1000",
            "headquarters": "Bangalore, India",
            "website": "https://cred.club",
            "careers_url": "https://cred.club/careers",
            "linkedin_url": "https://linkedin.com/company/cred-club",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Frontend Engineer – React (New Grad)",
                    "description": "Build CRED's beautiful consumer interfaces in React and TypeScript. Obsess over performance, animations, and delightful micro-interactions.",
                    "location": "Bangalore, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "0-1 years",
                    "salary_min": 1000000,
                    "salary_max": 1800000,
                    "apply_url": "https://cred.club/careers",
                },
                "skills": [
                    {"name": "react", "required": True},
                    {"name": "typescript", "required": True},
                    {"name": "javascript", "required": True},
                    {"name": "css", "required": True},
                    {"name": "git", "required": True},
                ],
            },
        ],
    },
    # ── Atlassian ─────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Atlassian",
            "domain": "atlassian.com",
            "logo_url": "https://logo.clearbit.com/atlassian.com",
            "industry": "Software / Collaboration",
            "company_size": "10000+",
            "headquarters": "Sydney, Australia",
            "website": "https://atlassian.com",
            "careers_url": "https://atlassian.com/company/careers",
            "linkedin_url": "https://linkedin.com/company/atlassian",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Software Engineer – Grad Hire",
                    "description": "Build Jira, Confluence, or Bitbucket features used by millions of developers. Atlassian is fully distributed — work from anywhere in India.",
                    "location": "Remote, India",
                    "job_type": "Full-time",
                    "employment_type": "Remote",
                    "remote_type": "Fully Remote",
                    "experience_required": "0-1 years",
                    "salary_min": 2000000,
                    "salary_max": 3500000,
                    "apply_url": "https://www.atlassian.com/company/careers",
                },
                "skills": [
                    {"name": "java", "required": True},
                    {"name": "python", "required": False},
                    {"name": "rest api", "required": True},
                    {"name": "git", "required": True},
                    {"name": "agile", "required": False},
                    {"name": "microservices", "required": False},
                ],
            },
        ],
    },
    # ── Freshworks ────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Freshworks",
            "domain": "freshworks.com",
            "logo_url": "https://logo.clearbit.com/freshworks.com",
            "industry": "SaaS / CRM",
            "company_size": "5000-10000",
            "headquarters": "Chennai, India",
            "website": "https://freshworks.com",
            "careers_url": "https://freshworks.com/company/careers",
            "linkedin_url": "https://linkedin.com/company/freshworks-inc",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Software Development Engineer I",
                    "description": "Build world-class SaaS products in the Freshworks ecosystem. Work with Ruby on Rails, React, and distributed systems at scale.",
                    "location": "Chennai, India",
                    "job_type": "Full-time",
                    "employment_type": "Hybrid",
                    "remote_type": "Hybrid",
                    "experience_required": "0-1 years",
                    "salary_min": 900000,
                    "salary_max": 1600000,
                    "apply_url": "https://freshworks.com/company/careers",
                },
                "skills": [
                    {"name": "ruby on rails", "required": True},
                    {"name": "react", "required": False},
                    {"name": "postgresql", "required": True},
                    {"name": "redis", "required": False},
                    {"name": "javascript", "required": False},
                ],
            },
            {
                "info": {
                    "title": "QA Engineer – Fresher",
                    "description": "Automate end-to-end test cases for Freshdesk and Freshsales. Work with Selenium, Cypress, and REST Assured to ensure product quality.",
                    "location": "Chennai, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher",
                    "salary_min": 600000,
                    "salary_max": 1000000,
                    "apply_url": "https://freshworks.com/company/careers",
                },
                "skills": [
                    {"name": "selenium", "required": True},
                    {"name": "python", "required": True},
                    {"name": "rest api", "required": False},
                    {"name": "cypress", "required": False},
                    {"name": "agile", "required": False},
                ],
            },
        ],
    },
    # ── Meesho ────────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Meesho",
            "domain": "meesho.com",
            "logo_url": "https://logo.clearbit.com/meesho.com",
            "industry": "E-Commerce / Social Commerce",
            "company_size": "1000-5000",
            "headquarters": "Bangalore, India",
            "website": "https://meesho.com",
            "careers_url": "https://meesho.io/careers",
            "linkedin_url": "https://linkedin.com/company/meesho",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Data Scientist – Entry Level",
                    "description": "Build recommendation models, run A/B tests, and analyse user behavior to drive decisions on Meesho's reseller platform.",
                    "location": "Bangalore, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "0-1 years",
                    "salary_min": 900000,
                    "salary_max": 1500000,
                    "apply_url": "https://meesho.io/careers",
                },
                "skills": [
                    {"name": "python", "required": True},
                    {"name": "machine learning", "required": True},
                    {"name": "sql", "required": True},
                    {"name": "statistics", "required": True},
                    {"name": "pandas", "required": True},
                    {"name": "a/b testing", "required": False},
                ],
            },
        ],
    },
    # ── Nvidia ────────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "NVIDIA",
            "domain": "nvidia.com",
            "logo_url": "https://logo.clearbit.com/nvidia.com",
            "industry": "Semiconductors / AI",
            "company_size": "10000+",
            "headquarters": "Santa Clara, CA",
            "website": "https://nvidia.com",
            "careers_url": "https://nvidia.com/en-us/about-nvidia/careers",
            "linkedin_url": "https://linkedin.com/company/nvidia",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "AI Research Intern",
                    "description": "Conduct research on LLMs, diffusion models, and GPU-accelerated AI training. Publish findings and contribute to NVIDIA's AI research roadmap.",
                    "location": "Pune, India",
                    "job_type": "Internship",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher",
                    "salary_min": 120000,
                    "salary_max": 200000,
                    "apply_url": "https://nvidia.com/en-us/about-nvidia/careers",
                },
                "skills": [
                    {"name": "python", "required": True},
                    {"name": "pytorch", "required": True},
                    {"name": "deep learning", "required": True},
                    {"name": "natural language processing", "required": False},
                    {"name": "cuda", "required": False},
                    {"name": "computer vision", "required": False},
                ],
            },
            {
                "info": {
                    "title": "Compiler Engineer – New Grad",
                    "description": "Work on CUDA compiler toolchain, optimize GPU kernels, and advance developer experience for the world's AI computing platform.",
                    "location": "Pune, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "0-1 years",
                    "salary_min": 2000000,
                    "salary_max": 4000000,
                    "apply_url": "https://nvidia.com/en-us/about-nvidia/careers",
                },
                "skills": [
                    {"name": "c++", "required": True},
                    {"name": "llvm", "required": False},
                    {"name": "cuda", "required": True},
                    {"name": "algorithms", "required": True},
                    {"name": "compiler design", "required": False},
                ],
            },
        ],
    },
    # ── Stripe ────────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Stripe",
            "domain": "stripe.com",
            "logo_url": "https://logo.clearbit.com/stripe.com",
            "industry": "Fintech / Payments",
            "company_size": "5000-10000",
            "headquarters": "San Francisco, CA",
            "website": "https://stripe.com",
            "careers_url": "https://stripe.com/jobs",
            "linkedin_url": "https://linkedin.com/company/stripe",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Software Engineer – New Grad",
                    "description": "Build the payment infrastructure that powers global commerce. Stripe engineers work across full-stack in Ruby, Go, and TypeScript.",
                    "location": "Remote / Bangalore, India",
                    "job_type": "Full-time",
                    "employment_type": "Remote",
                    "remote_type": "Hybrid",
                    "experience_required": "0-1 years",
                    "salary_min": 3000000,
                    "salary_max": 5000000,
                    "apply_url": "https://stripe.com/jobs/new-grad",
                },
                "skills": [
                    {"name": "ruby on rails", "required": False},
                    {"name": "golang", "required": False},
                    {"name": "typescript", "required": False},
                    {"name": "rest api", "required": True},
                    {"name": "distributed systems", "required": False},
                    {"name": "algorithms", "required": True},
                ],
            },
        ],
    },
    # ── Uber ──────────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Uber",
            "domain": "uber.com",
            "logo_url": "https://logo.clearbit.com/uber.com",
            "industry": "Mobility / Technology",
            "company_size": "10000+",
            "headquarters": "San Francisco, CA",
            "website": "https://uber.com",
            "careers_url": "https://uber.com/us/en/careers",
            "linkedin_url": "https://linkedin.com/company/uber-com",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Software Engineer Intern",
                    "description": "Build features across Uber's rider, driver, and Eats platforms. Projects span backend services, mapping, real-time streaming, and ML.",
                    "location": "Bangalore, India",
                    "job_type": "Internship",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher",
                    "salary_min": 100000,
                    "salary_max": 150000,
                    "apply_url": "https://uber.com/us/en/careers/",
                },
                "skills": [
                    {"name": "golang", "required": False},
                    {"name": "python", "required": True},
                    {"name": "java", "required": False},
                    {"name": "distributed systems", "required": False},
                    {"name": "kafka", "required": False},
                    {"name": "algorithms", "required": True},
                ],
            },
        ],
    },
    # ── Zepto ─────────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Zepto",
            "domain": "zeptonow.com",
            "logo_url": "https://logo.clearbit.com/zeptonow.com",
            "industry": "Quick Commerce",
            "company_size": "500-1000",
            "headquarters": "Mumbai, India",
            "website": "https://zeptonow.com",
            "careers_url": "https://jobs.zeptonow.com",
            "linkedin_url": "https://linkedin.com/company/zepto-india",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Full Stack Engineer – New Grad",
                    "description": "Build Zepto's customer app, warehouse management system, and analytics dashboards. Work across React and Node.js with a fast-moving team.",
                    "location": "Mumbai, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "0-1 years",
                    "salary_min": 1000000,
                    "salary_max": 1800000,
                    "apply_url": "https://jobs.zeptonow.com",
                },
                "skills": [
                    {"name": "react", "required": True},
                    {"name": "nodejs", "required": True},
                    {"name": "typescript", "required": True},
                    {"name": "postgresql", "required": False},
                    {"name": "javascript", "required": True},
                ],
            },
        ],
    },
    # ── IBM ───────────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "IBM",
            "domain": "ibm.com",
            "logo_url": "https://logo.clearbit.com/ibm.com",
            "industry": "Technology / IT Services",
            "company_size": "10000+",
            "headquarters": "Armonk, NY",
            "website": "https://ibm.com",
            "careers_url": "https://ibm.com/employment",
            "linkedin_url": "https://linkedin.com/company/ibm",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Associate Software Engineer",
                    "description": "Join IBM's India Software Labs. Work on AI, hybrid cloud, and enterprise software using Java, Python, and IBM Cloud technologies.",
                    "location": "Bangalore, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "Fresher",
                    "salary_min": 700000,
                    "salary_max": 1200000,
                    "apply_url": "https://ibm.com/employment",
                },
                "skills": [
                    {"name": "java", "required": True},
                    {"name": "python", "required": False},
                    {"name": "microservices", "required": False},
                    {"name": "docker", "required": False},
                    {"name": "kubernetes", "required": False},
                    {"name": "sql", "required": True},
                ],
            },
        ],
    },
    # ── Paytm ─────────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Paytm",
            "domain": "paytm.com",
            "logo_url": "https://logo.clearbit.com/paytm.com",
            "industry": "Fintech",
            "company_size": "5000-10000",
            "headquarters": "Noida, India",
            "website": "https://paytm.com",
            "careers_url": "https://paytm.com/about-us/careers",
            "linkedin_url": "https://linkedin.com/company/paytm",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "iOS Developer – Entry Level",
                    "description": "Build and ship iOS features for Paytm's flagship app used by 350M+ users. Work with Swift, UIKit, and Paytm's custom payment SDKs.",
                    "location": "Noida, India",
                    "job_type": "Full-time",
                    "employment_type": "On-site",
                    "remote_type": "On-site",
                    "experience_required": "0-1 years",
                    "salary_min": 800000,
                    "salary_max": 1400000,
                    "apply_url": "https://paytm.com/about-us/careers",
                },
                "skills": [
                    {"name": "swift", "required": True},
                    {"name": "ios", "required": True},
                    {"name": "xcode", "required": True},
                    {"name": "rest api", "required": True},
                    {"name": "git", "required": True},
                ],
            },
        ],
    },
    # ── Oracle ────────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Oracle",
            "domain": "oracle.com",
            "logo_url": "https://logo.clearbit.com/oracle.com",
            "industry": "Enterprise Software / Cloud",
            "company_size": "10000+",
            "headquarters": "Austin, TX",
            "website": "https://oracle.com",
            "careers_url": "https://oracle.com/corporate/careers",
            "linkedin_url": "https://linkedin.com/company/oracle",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Cloud Infrastructure Engineer – New Grad",
                    "description": "Build Oracle Cloud Infrastructure (OCI) services in Java and Python. Work on compute, networking, storage, and IAM at hyperscale.",
                    "location": "Bangalore, India",
                    "job_type": "Full-time",
                    "employment_type": "Hybrid",
                    "remote_type": "Hybrid",
                    "experience_required": "0-1 years",
                    "salary_min": 1500000,
                    "salary_max": 2500000,
                    "apply_url": "https://oracle.com/corporate/careers",
                },
                "skills": [
                    {"name": "java", "required": True},
                    {"name": "python", "required": False},
                    {"name": "distributed systems", "required": False},
                    {"name": "rest api", "required": True},
                    {"name": "linux", "required": False},
                    {"name": "networking", "required": False},
                ],
            },
        ],
    },
    # ── Rubrik ────────────────────────────────────────────────────────────────
    {
        "company": {
            "name": "Rubrik",
            "domain": "rubrik.com",
            "logo_url": "https://logo.clearbit.com/rubrik.com",
            "industry": "Cybersecurity / Cloud Data",
            "company_size": "1000-5000",
            "headquarters": "Palo Alto, CA",
            "website": "https://rubrik.com",
            "careers_url": "https://rubrik.com/careers",
            "linkedin_url": "https://linkedin.com/company/rubrik-inc",
            "is_hiring": True,
        },
        "jobs": [
            {
                "info": {
                    "title": "Software Engineer – University Hire",
                    "description": "Build cloud data security products in Python and Go. Rubrik is hiring new graduates with strong coding and system design fundamentals.",
                    "location": "Bangalore, India",
                    "job_type": "Full-time",
                    "employment_type": "Hybrid",
                    "remote_type": "Hybrid",
                    "experience_required": "Fresher",
                    "salary_min": 2000000,
                    "salary_max": 3500000,
                    "apply_url": "https://rubrik.com/careers",
                },
                "skills": [
                    {"name": "python", "required": True},
                    {"name": "golang", "required": False},
                    {"name": "distributed systems", "required": False},
                    {"name": "algorithms", "required": True},
                    {"name": "data structures", "required": True},
                ],
            },
        ],
    },
]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run_seed() -> None:
    start = time.perf_counter()
    logger.info("=" * 60)
    logger.info("Saarthi Job Ecosystem Seeder — Starting")
    logger.info("=" * 60)

    # Ensure schema exists (safe for SQLite; Postgres needs external migration)
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    stats = {"companies_inserted": 0, "jobs_inserted": 0, "skills_inserted": 0, "duplicates_skipped": 0}

    try:
        for entry in SEED_DATA:
            company_data = entry["company"]
            company = upsert_company(db, company_data)
            if not db.query(Company).filter(Company.id == company.id).first():
                stats["companies_inserted"] += 1
            else:
                # Count only newly flushed
                was_in_session = db.is_modified(company)
                if was_in_session:
                    stats["companies_inserted"] += 1

            for job_entry in entry["jobs"]:
                job, created = upsert_job(db, company, job_entry["info"], job_entry["skills"])
                if created:
                    stats["jobs_inserted"] += 1
                    stats["skills_inserted"] += len(job_entry["skills"])
                else:
                    stats["duplicates_skipped"] += 1

        db.commit()

        elapsed = time.perf_counter() - start
        logger.info("=" * 60)
        logger.info("✅  Seed Complete")
        logger.info("   Companies tracked : %d", len(SEED_DATA))
        logger.info("   Jobs inserted     : %d", stats["jobs_inserted"])
        logger.info("   Skills inserted   : %d", stats["skills_inserted"])
        logger.info("   Duplicates skipped: %d", stats["duplicates_skipped"])
        logger.info("   Elapsed time      : %.2fs", elapsed)
        logger.info("=" * 60)

    except Exception as exc:
        db.rollback()
        logger.error("Seed failed: %s", exc, exc_info=True)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
