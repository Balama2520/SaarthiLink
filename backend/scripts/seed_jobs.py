"""
seed_jobs.py — Idempotent Job Ecosystem Seeder for Saarthi Beta
===============================================================
Run from the backend/ directory with the venv activated:

    python -m scripts.seed_jobs

This script is IDEMPOTENT: running it multiple times will never create
duplicate Companies, Jobs, or JobSkills. It relies on the `dedup_hash`
column on Job (sha256 of company_name + title + location) and the
unique constraint on Company.name.

Dataset: 10 live curated jobs from the 09_JOBS_STAGING Google Sheet Board.
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

    posted_at = data.pop("posted_at", datetime.now(timezone.utc))
    expires_at = data.pop("expires_at", datetime.now(timezone.utc) + timedelta(days=90))
    job = Job(
        company_id=company.id,
        dedup_hash=dedup,
        source="09_JOBS_STAGING",
        posted_at=posted_at,
        expires_at=expires_at,
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
# Seed Data — Exact 10 Jobs from Google Sheet 09_JOBS_STAGING Board
# ---------------------------------------------------------------------------

SEED_DATA: list[dict] = [
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
                    "description": "Join Razorpay's engineering core team. Build scalable payment gateway services, merchant dashboards, and banking integrations in Java and Go.",
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
                    "description": "Build features for the Postman API Platform used by 25M+ developers. Work across Node.js, React, Python, and cloud infrastructure.",
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
]


def fetch_public_sheets_jobs(spreadsheet_id: str = "1qPGJYxq_Nq-33xda4ZYA7DkX9pP2_VrMlWQAaviiI44") -> list[dict]:
    """Fetch live job rows from public Google Sheet tab 09_JOBS_STAGING via CSV export."""
    import urllib.request
    import csv
    import io

    url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/gviz/tq?tqx=out:csv&sheet=09_JOBS_STAGING"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            csv_text = resp.read().decode("utf-8")
        reader = csv.DictReader(io.StringIO(csv_text))

        entries = []
        for row in reader:
            title = (row.get("title") or "").strip()
            company_name = (row.get("company") or "").strip()
            if not title or not company_name:
                continue

            location = (row.get("location") or "").strip()
            country = (row.get("country") or "").strip()
            full_location = f"{location}, {country}" if location and country else (location or country or "India")

            skills_raw = (row.get("skills") or "").split(",")
            skill_list = [{"name": s.strip(), "required": True} for s in skills_raw if s.strip()]

            exp_min = row.get("experience_min") or "0"
            exp_max = row.get("experience_max") or "2"
            exp_str = f"{exp_min}-{exp_max} yrs" if exp_max else f"{exp_min}+ yrs"

            try:
                sal_min = int(float(row.get("salary_min") or 0))
            except ValueError:
                sal_min = 0

            try:
                sal_max = int(float(row.get("salary_max") or 0))
            except ValueError:
                sal_max = 0

            domain_name = (row.get("company_url") or "").replace("https://", "").replace("http://", "").split("/")[0] or f"{company_name.lower().replace(' ', '')}.com"

            posted_val = row.get("posted_at") or ""
            expires_val = row.get("expires_at") or ""

            try:
                posted_dt = datetime.fromisoformat(posted_val.strip()) if posted_val.strip() else datetime.now(timezone.utc)
                if posted_dt.tzinfo is None:
                    posted_dt = posted_dt.replace(tzinfo=timezone.utc)
            except Exception:
                posted_dt = datetime.now(timezone.utc)

            try:
                expires_dt = datetime.fromisoformat(expires_val.strip()) if expires_val.strip() else datetime.now(timezone.utc) + timedelta(days=30)
                if expires_dt.tzinfo is None:
                    expires_dt = expires_dt.replace(tzinfo=timezone.utc)
            except Exception:
                expires_dt = datetime.now(timezone.utc) + timedelta(days=30)

            entries.append({
                "company": {
                    "name": company_name,
                    "domain": domain_name,
                    "logo_url": f"https://logo.clearbit.com/{domain_name}",
                    "industry": "Technology",
                    "company_size": "500-1000",
                    "headquarters": full_location,
                    "website": row.get("company_url") or "https://saarthi-link.netlify.app",
                    "careers_url": row.get("apply_url") or "https://saarthi-link.netlify.app",
                    "linkedin_url": f"https://linkedin.com/company/{company_name.lower().replace(' ', '-')}",
                    "is_hiring": True,
                },
                "jobs": [
                    {
                        "info": {
                            "title": title,
                            "description": row.get("description") or f"{title} position at {company_name}.",
                            "location": full_location,
                            "job_type": "Full-time" if (row.get("employment_type") or "").upper() == "FULL_TIME" else "Internship",
                            "employment_type": "On-site" if (row.get("remote_type") or "").upper() == "ON_SITE" else ("Remote" if (row.get("remote_type") or "").upper() == "REMOTE" else "Hybrid"),
                            "remote_type": row.get("remote_type") or "On-site",
                            "experience_required": exp_str,
                            "salary_min": sal_min,
                            "salary_max": sal_max,
                            "apply_url": row.get("apply_url") or "https://saarthi-link.netlify.app",
                            "posted_at": posted_dt,
                            "expires_at": expires_dt,
                        },
                        "skills": skill_list,
                    }
                ]
            })
        return entries
    except Exception as err:
        logger.warning("Could not fetch live public Google Sheet CSV: %s", err)
        return []


def run_seed() -> None:
    start = time.perf_counter()
    logger.info("=" * 60)
    logger.info("Saarthi Job Ecosystem Seeder — Starting Live Google Sheet Sync")
    logger.info("=" * 60)

    Base.metadata.create_all(bind=engine)

    # Try fetching live jobs directly from Google Sheet tab 09_JOBS_STAGING
    live_entries = fetch_public_sheets_jobs()
    entries_to_seed = live_entries if live_entries else SEED_DATA
    logger.info("Loaded %d live job entries from Google Sheet staging board.", len(entries_to_seed))

    db: Session = SessionLocal()
    stats = {"companies_inserted": 0, "jobs_inserted": 0, "skills_inserted": 0, "duplicates_skipped": 0}

    try:
        # Wipe old jobs so ONLY the live Google Sheet staging jobs exist
        db.query(JobSkill).delete()
        db.query(Job).delete()
        db.commit()

        for entry in entries_to_seed:
            company_data = entry["company"]
            company = upsert_company(db, company_data)

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
        logger.info("[SUCCESS] Live Google Sheets Seed Complete")
        logger.info("   Companies tracked : %d", len(entries_to_seed))
        logger.info("   Jobs inserted     : %d", stats["jobs_inserted"])
        logger.info("   Skills inserted   : %d", stats["skills_inserted"])
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
