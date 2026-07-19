from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import json
import logging
from PyPDF2 import PdfReader

from app.database.connection import get_db
from app.auth.auth import get_current_user
from app.models.models import User, LiteraturePaper, ThesisProject
from app.ai.llm import generate_response_stream_async
from pydantic import BaseModel

class CompassRequest(BaseModel):
    interests: str

router = APIRouter(prefix="/research", tags=["research"])
logger = logging.getLogger(__name__)

@router.post("/analyze")
async def analyze_paper(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if file.filename.endswith(".pdf"):
            reader = PdfReader(file.file)
            text = "".join([page.extract_text() for page in reader.pages if page.extract_text()])
        else:
            text = (await file.read()).decode("utf-8")
            
        prompt = f"""
        You are an AI Research Assistant. Analyze the following research paper text.
        Provide a detailed summary, explanation of key concepts, study notes, and a 3-question quiz.
        
        Paper Text (truncated):
        {text[:5000]}
        
        Output STRICTLY as a valid JSON object matching this structure. Do not output markdown, just the JSON string:
        {{
            "summary": "High-level summary of the paper.",
            "explanation": "Detailed explanation of the methodology and results.",
            "notes": ["Note 1", "Note 2", "Note 3"],
            "quiz": [
                {{"question": "Q1?", "options": ["A", "B", "C", "D"], "answer": "A"}}
            ]
        }}
        """

        messages = [{"role": "user", "content": prompt}]
        response_stream = generate_response_stream_async(messages, personality="default")
        
        full_response = ""
        async for chunk in response_stream:
            full_response += chunk

        clean_json = full_response.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
        
        parsed_data = json.loads(clean_json.strip())
        return parsed_data

    except json.JSONDecodeError:
        logger.error(f"Failed to decode LLM JSON. Raw output: {full_response}")
        raise HTTPException(status_code=500, detail="Failed to analyze research paper. Please try again.")
    except Exception as e:
        logger.error(f"Error processing paper: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compass")
async def get_research_compass(request: CompassRequest, current_user: User = Depends(get_current_user)):
    """
    Generate a research roadmap based on the user's interests.
    """
    prompt = f"""
    You are an AI Research Mentor. Create a research roadmap based on the user's interests: "{request.interests}".
    Output STRICTLY as a JSON object matching this schema (no markdown, just raw JSON string):
    {{
        "status": "success",
        "roadmap": {{
            "trending_topics": ["Topic 1", "Topic 2", "Topic 3"],
            "prerequisites": ["Prerequisite 1", "Prerequisite 2", "Prerequisite 3"],
            "papers_to_read": ["Paper 1", "Paper 2", "Paper 3"],
            "tools_to_learn": ["Tool 1", "Tool 2", "Tool 3"],
            "weekly_milestones": [
                "Week 1: Goal",
                "Week 2: Goal",
                "Week 3: Goal",
                "Week 4: Goal"
            ]
        }}
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
        # Fallback if parsing fails
        return {
            "status": "success",
            "roadmap": {
                "trending_topics": [f"{request.interests} state-of-the-art", "Self-supervised learning", "Efficient architectures"],
                "prerequisites": ["Linear Algebra", "Optimization", "Advanced Python"],
                "papers_to_read": ["Attention Is All You Need", "ResNet", f"Survey on {request.interests}"],
                "tools_to_learn": ["PyTorch", "HuggingFace", "Weights & Biases"],
                "weekly_milestones": [
                    "Week 1: Foundations and Literature Review",
                    "Week 2: Setup environment and baseline model",
                    "Week 3: Implement novel architecture",
                    "Week 4: Evaluation and Ablation Studies"
                ]
            }
        }

@router.get("/matrix")
async def generate_matrix(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Automatically creates a literature matrix from the user's papers.
    """
    papers = db.query(LiteraturePaper).filter(LiteraturePaper.user_id == current_user.id).all()
    if not papers:
        return {"status": "success", "matrix": []}
    
    paper_titles = [p.title for p in papers]
    prompt = f"""
    You are an AI Research Assistant. Construct a literature matrix summarizing these papers: {paper_titles}.
    For each paper, infer or generate plausible summaries for the problem, method, dataset, accuracy, and limitation.
    Output STRICTLY as a JSON list matching this schema (no markdown, just raw JSON list of objects):
    [
        {{
            "paper": "Title of paper",
            "problem": "Problem it solves",
            "method": "Key methodology",
            "dataset": "Datasets used",
            "accuracy": "Reported metrics or 'N/A'",
            "limitation": "Key limitation"
        }}
    ]
    """
    messages = [{"role": "user", "content": prompt}]
    stream = generate_response_stream_async(messages, personality="default")
    full_text = ""
    async for chunk in stream:
        full_text += chunk
    try:
        clean = full_text.strip().lstrip("```json").rstrip("```").strip()
        matrix_data = json.loads(clean)
        return {"status": "success", "matrix": matrix_data}
    except Exception:
        # Fallback
        matrix = []
        for p in papers:
            matrix.append({
                "paper": p.title,
                "problem": "Unspecified",
                "method": "Unspecified",
                "dataset": "Unspecified",
                "accuracy": "N/A",
                "limitation": "N/A"
            })
        return {"status": "success", "matrix": matrix}

@router.post("/gap-finder")
async def find_research_gap(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Identifies missing work and future scope from literature.
    """
    papers = db.query(LiteraturePaper).filter(LiteraturePaper.user_id == current_user.id).all()
    paper_titles = [p.title for p in papers]
    
    prompt = f"""
    You are an AI Research Mentor. Analyze these read papers to find research gaps and novel ideas: {paper_titles}.
    If no papers are listed, suggest general AI/CS research gaps.
    Output STRICTLY as a JSON object matching this schema (no markdown, just raw JSON string):
    {{
        "status": "success",
        "gaps": ["Gap 1", "Gap 2", "Gap 3"],
        "novel_ideas": ["Idea 1", "Idea 2"]
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
            "status": "success",
            "gaps": [
                "Lack of robustness in out-of-distribution data.",
                "High computational cost during inference.",
                "Limited interpretability of the latent space."
            ],
            "novel_ideas": [
                "Combine approach X with modality Y.",
                "Optimize inference using quantization specific to this domain."
            ]
        }
