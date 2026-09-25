"""
Resume Intelligence Pipeline — modular processing stages with structured logging,
timing metrics, and granular error handling.
"""

import json
import logging
import time
import io
import re
from typing import Optional

from fastapi import HTTPException
from app.ai.gateway import AIGateway
from app.services.profile_sync_service import ProfileSyncService
from app.core.logging import get_request_id

logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────
async def _collect_stream(stream) -> str:
    chunks = []
    async for chunk in stream:
        chunks.append(chunk)
    return "".join(chunks)


def _strip_markdown_json(text: str) -> str:
    clean = text.strip()
    for prefix in ("```json", "```"):
        if clean.startswith(prefix):
            clean = clean[len(prefix) :]
            break
    if clean.endswith("```"):
        clean = clean[:-3]
    return clean.strip()


def _parse_json_response(text: str) -> dict:
    """Parse a JSON object even when the model adds prose or code fences."""
    clean = _strip_markdown_json(text)
    try:
        parsed = json.loads(clean)
    except json.JSONDecodeError:
        start = clean.find("{")
        if start < 0:
            raise
        parsed, _ = json.JSONDecoder().raw_decode(clean[start:])

    if not isinstance(parsed, dict):
        raise json.JSONDecodeError("AI response was not a JSON object", clean, 0)
    return parsed


def _build_fallback_analysis(text: str) -> dict:
    """Keep resume analysis useful when the model returns malformed output."""
    lowered = text.lower()
    known_skills = [
        "python",
        "javascript",
        "typescript",
        "react",
        "node.js",
        "fastapi",
        "sql",
        "postgresql",
        "docker",
        "kubernetes",
        "aws",
        "azure",
        "java",
        "c++",
        "machine learning",
        "git",
    ]
    skills = [skill for skill in known_skills if skill in lowered]
    word_count = len(text.split())
    score = min(95, max(35, 35 + len(skills) * 4 + (10 if word_count >= 250 else 0)))
    email_match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    phone_match = re.search(r"(?:\+?\d[\d ()-]{8,}\d)", text)
    links = re.findall(r"https?://\S+", text)

    return {
        "overall_ats_score": score,
        "section_scores": {
            "structure": score,
            "skills": min(100, 40 + len(skills) * 6),
            "education": 60 if "education" in lowered or "university" in lowered else 30,
            "experience": 65 if "experience" in lowered else 35,
            "keywords": min(100, 35 + len(skills) * 5),
        },
        "personal_info": {
            "name": None,
            "email": email_match.group(0) if email_match else None,
            "phone": phone_match.group(0) if phone_match else None,
        },
        "education": [],
        "experience": [],
        "projects": [],
        "tech_skills": skills,
        "soft_skills": [],
        "certifications": [],
        "languages": [],
        "links": {
            "github": next((link for link in links if "github" in link.lower()), None),
            "linkedin": next((link for link in links if "linkedin" in link.lower()), None),
            "portfolio": None,
        },
        "strengths": [
            "Resume text was extracted successfully.",
            "Technical keywords were detected.",
        ],
        "weaknesses": [
            "Full AI structuring is temporarily unavailable; retry analysis for richer insights."
        ],
        "skill_gaps": [],
        "recommendations": ["Add quantified achievements and detailed project outcomes."],
        "summary": text.strip()[:500] or "Resume text was extracted successfully.",
        "analysis_source": "fallback",
        "word_count": word_count,
    }


def _normalize_analysis_shape(parsed: dict, word_count: int) -> dict:
    """Coerce common provider shape drift into the frontend contract."""

    def as_dict(value):
        if isinstance(value, dict):
            return value
        if isinstance(value, list):
            return next((item for item in value if isinstance(item, dict)), {})
        return {}

    parsed["section_scores"] = as_dict(parsed.get("section_scores"))
    parsed["personal_info"] = as_dict(parsed.get("personal_info"))
    parsed["links"] = as_dict(parsed.get("links"))
    for key in (
        "education",
        "experience",
        "projects",
        "tech_skills",
        "soft_skills",
        "certifications",
        "languages",
        "strengths",
        "weaknesses",
        "skill_gaps",
        "recommendations",
    ):
        if not isinstance(parsed.get(key), list):
            parsed[key] = []
    if not isinstance(parsed.get("summary"), str):
        parsed["summary"] = str(parsed.get("summary") or "")
    parsed["word_count"] = word_count
    parsed["analysis_source"] = "ai"
    return parsed


# ── Pipeline ──────────────────────────────────────────────────────────────────
class ResumeIntelligencePipeline:

    ALLOWED_MIME = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
    }
    MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

    def __init__(self):
        self.ai_gateway = AIGateway()
        self.profile_sync = ProfileSyncService()

    # ── Stage 1: Validate ─────────────────────────────────────────────────────
    def validate_file(self, file_bytes: bytes, filename: str, content_type: str) -> None:
        """Validates size and extension. Raises HTTPException on failure."""
        if len(file_bytes) > self.MAX_SIZE_BYTES:
            logger.warning(
                "Resume upload rejected: file too large",
                extra={"resume_filename": filename, "size_bytes": len(file_bytes)},
            )
            raise HTTPException(
                status_code=400, detail="File too large. Maximum allowed size is 5 MB."
            )

        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in {"pdf", "docx", "txt"}:
            logger.warning(
                "Resume upload rejected: invalid extension",
                extra={"resume_filename": filename, "extension": ext},
            )
            raise HTTPException(
                status_code=400, detail="Unsupported file type. Use PDF, DOCX, or TXT."
            )

    # ── Stage 2: Extract Text ─────────────────────────────────────────────────
    def extract_text(self, file_bytes: bytes, filename: str) -> str:
        """Returns plain text from PDF/DOCX/TXT. Raises HTTPException on failure."""
        ext = filename.rsplit(".", 1)[-1].lower()
        t0 = time.perf_counter()
        try:
            if ext == "pdf":
                text = ""
                # Primary: pdfplumber — best for modern, form, and multi-column PDFs
                try:
                    import pdfplumber

                    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                        pages_text = []
                        for page in pdf.pages:
                            extracted = page.extract_text()
                            if extracted:
                                pages_text.append(extracted)
                        text = "\n".join(pages_text)
                except Exception:
                    text = ""

                # Fallback 1: PyPDF2 / pypdf
                if not text.strip():
                    try:
                        import pypdf

                        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                        text = "\n".join(p.extract_text() or "" for p in reader.pages)
                    except Exception:
                        try:
                            import PyPDF2

                            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
                            text = "\n".join(p.extract_text() or "" for p in reader.pages)
                        except Exception:
                            text = ""

                # Fallback 2: raw bytes (for plain-text PDFs)
                if not text.strip():
                    text = file_bytes.decode("utf-8", errors="ignore")

                if not text.strip():
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Could not extract text from this PDF. "
                            "It may be scanned/image-only. Try uploading a DOCX or TXT version."
                        ),
                    )

            elif ext == "docx":
                from docx import Document

                doc = Document(io.BytesIO(file_bytes))
                text = "\n".join(para.text for para in doc.paragraphs)
            else:
                text = file_bytes.decode("utf-8", errors="ignore")

            duration_ms = (time.perf_counter() - t0) * 1000
            logger.info(
                "Stage 2: Text extraction completed",
                extra={
                    "resume_filename": filename,
                    "ext": ext,
                    "chars": len(text),
                    "duration_ms": round(duration_ms, 2),
                    "request_id": get_request_id(),
                },
            )
            return text
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(
                "Stage 2: Text extraction failed",
                extra={
                    "resume_filename": filename,
                    "error": str(exc),
                    "request_id": get_request_id(),
                },
            )
            raise HTTPException(
                status_code=422,
                detail="Could not read the uploaded file. It may be corrupt or password-protected.",
            )

    # ── Stage 3: AI Analysis & ATS Scoring ───────────────────────────────────
    async def analyze_with_ai(self, text: str, target_role: Optional[str]) -> dict:
        """Calls AI gateway, returns structured ATS analysis."""
        if not text.strip():
            raise HTTPException(status_code=400, detail="The document contains no readable text.")

        word_count = len(text.split())
        prompt = f"""
You are an expert ATS (Applicant Tracking System) and Career Coach.
Analyze the following resume text.
Target Role: {target_role or 'General / Not specified'}

Resume Text:
---
{text[:6000]}
---

Return one valid JSON object only. Do not use markdown or explanatory text.
Include these keys: overall_ats_score, section_scores, personal_info, education,
experience, projects, tech_skills, soft_skills, certifications, languages, links,
strengths, weaknesses, skill_gaps, recommendations, and summary.
Use arrays for list fields, objects for section_scores/personal_info/links, and an
integer from 0 to 100 for overall_ats_score.
"""
        t0 = time.perf_counter()
        try:
            messages = [{"role": "user", "content": prompt}]
            stream = self.ai_gateway.generate_response_stream(messages, personality="career")
            raw = await _collect_stream(stream)
            duration_ms = (time.perf_counter() - t0) * 1000

            parsed = _parse_json_response(raw)
            parsed = _normalize_analysis_shape(parsed, word_count)

            logger.info(
                "Stage 3: AI analysis completed",
                extra={
                    "target_role": target_role,
                    "ats_score": parsed.get("overall_ats_score"),
                    "duration_ms": round(duration_ms, 2),
                    "request_id": get_request_id(),
                },
            )
            return parsed

        except json.JSONDecodeError as exc:
            logger.warning(
                "Stage 3: LLM returned invalid JSON; using fallback analysis: %s",
                exc,
                extra={"error": str(exc), "request_id": get_request_id()},
            )
            return _build_fallback_analysis(text)
        except Exception as exc:
            logger.error(
                "Stage 3: AI analysis failed",
                extra={"error": str(exc), "request_id": get_request_id()},
            )
            raise HTTPException(status_code=502, detail="AI analysis failed. Please try again.")

    # ── Stage 4: Skill Normalization ──────────────────────────────────────────
    def normalize_skills(self, parsed_data: dict) -> dict:
        skills = parsed_data.get("tech_skills", [])
        normalized = self.profile_sync.normalize_skills(skills)
        parsed_data["tech_skills"] = normalized
        logger.debug(
            "Stage 4: Skills normalized",
            extra={"original_count": len(skills), "normalized_count": len(normalized)},
        )
        return parsed_data

    # ── Full Pipeline ─────────────────────────────────────────────────────────
    async def execute_pipeline(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str,
        target_role: Optional[str],
    ) -> dict:
        """
        Runs all pipeline stages sequentially.
        Returns {"parsed_data": {...}, "raw_text": "..."}
        """
        pipeline_start = time.perf_counter()
        logger.info(
            "Pipeline started",
            extra={
                "resume_filename": filename,
                "size_bytes": len(file_bytes),
                "target_role": target_role,
                "request_id": get_request_id(),
            },
        )

        # Stage 1
        self.validate_file(file_bytes, filename, content_type)
        # Stage 2
        text = self.extract_text(file_bytes, filename)
        # Stage 3
        parsed_data = await self.analyze_with_ai(text, target_role)
        # Stage 4
        parsed_data = self.normalize_skills(parsed_data)

        total_ms = (time.perf_counter() - pipeline_start) * 1000
        logger.info(
            "Pipeline completed",
            extra={
                "total_duration_ms": round(total_ms, 2),
                "request_id": get_request_id(),
            },
        )

        return {"parsed_data": parsed_data, "raw_text": text[:6000]}
