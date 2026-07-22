import json
import logging
from fastapi import HTTPException
from app.repositories.research_repository import ResearchRepository
from app.ai.llm import generate_response_stream_async

logger = logging.getLogger(__name__)


def _strip_markdown_json(text: str) -> str:
    """Strip markdown code fences from an LLM JSON response."""
    clean = text.strip()
    if clean.startswith("```json"):
        clean = clean[7:]
    elif clean.startswith("```"):
        clean = clean[3:]
    if clean.endswith("```"):
        clean = clean[:-3]
    return clean.strip()


async def _collect_stream(stream) -> str:
    """Collect all chunks from an async generator into a single string."""
    full = ""
    async for chunk in stream:
        full += chunk
    return full


class ResearchService:
    def __init__(self, repo: ResearchRepository):
        self.repo = repo

    async def analyze_paper(self, file_content: bytes, filename: str) -> dict:
        """
        Run AI analysis on extracted paper text.
        Returns structured JSON: summary, explanation, notes, quiz.
        """
        import io
        from PyPDF2 import PdfReader

        try:
            if filename.endswith(".pdf"):
                reader = PdfReader(io.BytesIO(file_content))
                text = "".join(
                    [page.extract_text() for page in reader.pages if page.extract_text()]
                )
            else:
                text = file_content.decode("utf-8")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not read file: {e}")

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
        stream = generate_response_stream_async(messages, personality="default")
        full_response = await _collect_stream(stream)

        try:
            clean = _strip_markdown_json(full_response)
            return json.loads(clean)
        except json.JSONDecodeError:
            logger.error(f"Failed to decode LLM JSON. Raw output: {full_response}")
            raise HTTPException(
                status_code=500,
                detail="Failed to analyze research paper. Please try again."
            )

    async def get_compass(self, interests: str) -> dict:
        """
        Generate an AI research roadmap based on user interests.
        """
        prompt = f"""
You are an AI Research Mentor. Create a research roadmap based on the user's interests: "{interests}".
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
        full_text = await _collect_stream(stream)

        try:
            clean = _strip_markdown_json(full_text)
            return json.loads(clean)
        except Exception:
            return {
                "status": "success",
                "roadmap": {
                    "trending_topics": [
                        f"{interests} state-of-the-art",
                        "Self-supervised learning",
                        "Efficient architectures",
                    ],
                    "prerequisites": ["Linear Algebra", "Optimization", "Advanced Python"],
                    "papers_to_read": [
                        "Attention Is All You Need",
                        "ResNet",
                        f"Survey on {interests}",
                    ],
                    "tools_to_learn": ["PyTorch", "HuggingFace", "Weights & Biases"],
                    "weekly_milestones": [
                        "Week 1: Foundations and Literature Review",
                        "Week 2: Setup environment and baseline model",
                        "Week 3: Implement novel architecture",
                        "Week 4: Evaluation and Ablation Studies",
                    ],
                },
            }

    async def generate_matrix(self, user_id: int) -> dict:
        """
        Build an AI-powered literature matrix from the user's saved papers.
        """
        paper_titles = self.repo.get_paper_titles_by_user(user_id)
        if not paper_titles:
            return {"status": "success", "matrix": []}

        papers = self.repo.get_papers_by_user(user_id)
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
        full_text = await _collect_stream(stream)

        try:
            clean = _strip_markdown_json(full_text)
            matrix_data = json.loads(clean)
            return {"status": "success", "matrix": matrix_data}
        except Exception:
            matrix = [
                {
                    "paper": p.title,
                    "problem": "Unspecified",
                    "method": "Unspecified",
                    "dataset": "Unspecified",
                    "accuracy": "N/A",
                    "limitation": "N/A",
                }
                for p in papers
            ]
            return {"status": "success", "matrix": matrix}

    async def find_gaps(self, user_id: int) -> dict:
        """
        Identify research gaps and novel ideas from the user's literature library.
        """
        paper_titles = self.repo.get_paper_titles_by_user(user_id)

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
        full_text = await _collect_stream(stream)

        try:
            clean = _strip_markdown_json(full_text)
            return json.loads(clean)
        except Exception:
            return {
                "status": "success",
                "gaps": [
                    "Lack of robustness in out-of-distribution data.",
                    "High computational cost during inference.",
                    "Limited interpretability of the latent space.",
                ],
                "novel_ideas": [
                    "Combine approach X with modality Y.",
                    "Optimize inference using quantization specific to this domain.",
                ],
            }
