"""
Career Toolkit router — pure-AI endpoints for the CareerToolkit page.
Each endpoint calls the AI gateway with an existing prompt template and
returns structured JSON.  No DB persistence is needed for these features.
"""

import json
import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.dependencies.auth import get_current_user
from app.models.models import User
from app.ai.gateway import AIGateway
from app.ai.prompt_manager import PromptManager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["toolkit"])


# ── helpers ──────────────────────────────────────────────────────────────────


async def _run_prompt(prompt_name: str, **kwargs) -> dict:
    prompt = PromptManager.load(prompt_name, **kwargs)
    messages = [{"role": "user", "content": prompt}]
    stream = AIGateway().generate_response_stream(messages, personality="career")
    full = ""
    async for chunk in stream:
        full += chunk
    # strip markdown fences if the model returns them
    clean = full.strip()
    for prefix in ("```json", "```"):
        if clean.startswith(prefix):
            clean = clean[len(prefix) :]
    if clean.endswith("```"):
        clean = clean[:-3]
    try:
        return json.loads(clean.strip())
    except Exception:
        # Return raw text as a single-key dict so callers always get JSON
        return {"result": full.strip()}


# ── Company Decoder ───────────────────────────────────────────────────────────


class CompanyDecodeBody(BaseModel):
    company_name: str


@router.post("/company/decode")
async def decode_company(body: CompanyDecodeBody, current_user: User = Depends(get_current_user)):
    return await _run_prompt("career/decode_company", company_name=body.company_name)


# ── Coding Arena ──────────────────────────────────────────────────────────────


class CodingArenaBody(BaseModel):
    problem_title: str
    language: str
    user_code: str
    mode: str = "review"


@router.post("/coding/arena")
async def coding_arena(body: CodingArenaBody, current_user: User = Depends(get_current_user)):
    return await _run_prompt(
        "career/coding_arena",
        problem_title=body.problem_title,
        language=body.language,
        user_code=body.user_code,
        mode=body.mode,
    )


# ── Network Builder ───────────────────────────────────────────────────────────


class NetworkBody(BaseModel):
    person_type: str
    company: str
    user_context: str


@router.post("/network/builder")
async def network_builder(body: NetworkBody, current_user: User = Depends(get_current_user)):
    return await _run_prompt(
        "career/network_outreach",
        person_type=body.person_type,
        company=body.company,
        user_context=body.user_context,
    )


# ── Salary Insight ────────────────────────────────────────────────────────────


class SalaryBody(BaseModel):
    role: str
    location: str


@router.post("/salary/insight")
async def salary_insight(body: SalaryBody, current_user: User = Depends(get_current_user)):
    return await _run_prompt("career/salary_insight", role=body.role, location=body.location)


# ── Global Path ───────────────────────────────────────────────────────────────


class GlobalPathBody(BaseModel):
    country: str


@router.post("/global/path")
async def global_path(body: GlobalPathBody, current_user: User = Depends(get_current_user)):
    return await _run_prompt("career/global_path", country=body.country)


# ── Opportunity Feed ──────────────────────────────────────────────────────────


@router.get("/opportunities/feed")
async def opportunity_feed(current_user: User = Depends(get_current_user)):
    # Return a lightweight static feed; live aggregation is a V2 feature.
    return [
        {
            "type": "hackathon",
            "title": "Smart India Hackathon 2026",
            "deadline": "2026-09-15",
            "link": "https://www.sih.gov.in",
        },
        {
            "type": "internship",
            "title": "Google STEP Internship",
            "deadline": "2026-10-01",
            "link": "https://careers.google.com",
        },
        {
            "type": "fellowship",
            "title": "MLH Fellowship",
            "deadline": "2026-09-30",
            "link": "https://fellowship.mlh.io",
        },
        {
            "type": "competition",
            "title": "ICPC Asia Regional",
            "deadline": "2026-09-20",
            "link": "https://icpcasia.org",
        },
        {
            "type": "scholarship",
            "title": "Tata Capital Pankh Scholarship",
            "deadline": "2026-09-25",
            "link": "https://tatacapitalpankh.com",
        },
    ]


# ── STAR Bullets (Resume feature, also used by toolkit) ───────────────────────


class STARBody(BaseModel):
    project_or_exp: str
    description: str


@router.post("/resume/star-bullets")
async def star_bullets(body: STARBody, current_user: User = Depends(get_current_user)):
    return await _run_prompt(
        "career/star_bullets",
        project_or_exp=body.project_or_exp,
        description=body.description,
    )


# ── Keyword Optimizer ─────────────────────────────────────────────────────────


class KeywordsBody(BaseModel):
    resume_text: str
    job_title: str


@router.post("/resume/keywords")
async def optimize_keywords(body: KeywordsBody, current_user: User = Depends(get_current_user)):
    return await _run_prompt(
        "career/keywords", resume_text=body.resume_text, job_title=body.job_title
    )
