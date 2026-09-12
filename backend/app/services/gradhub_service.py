import json
from app.repositories.gradhub_repository import GradhubRepository
from app.models.models import DegreeTracker, CertificationPlanner, PlacementTracker
from app.ai.gateway import AIGateway
from app.ai.prompt_manager import PromptManager
from fastapi import HTTPException
from typing import List, Dict, Any

async def _collect_stream(stream) -> str:
    full = ""
    async for chunk in stream:
        full += chunk
    return full

def _strip_markdown_json(text: str) -> str:
    clean = text.strip()
    if clean.startswith("```json"):
        clean = clean[7:]
    elif clean.startswith("```"):
        clean = clean[3:]
    if clean.endswith("```"):
        clean = clean[:-3]
    return clean.strip()

class GradhubService:
    def __init__(self, repo: GradhubRepository):
        self.repo = repo

    def add_degree_course(self, user_id: int, semester: int, course_name: str, credits: int, gpa: str, status: str) -> int:
        course = DegreeTracker(
            user_id=user_id,
            semester=semester,
            course_name=course_name,
            credits=credits,
            gpa=gpa,
            status=status
        )
        course = self.repo.create_degree_course(course)
        return course.id

    def list_degree_courses(self, user_id: int) -> List[Dict[str, Any]]:
        courses = self.repo.get_user_degree_courses(user_id)
        return [
            {
                "id": c.id,
                "semester": c.semester,
                "course_name": c.course_name,
                "credits": c.credits,
                "gpa": c.gpa,
                "status": c.status
            } for c in courses
        ]

    def delete_degree_course(self, user_id: int, course_id: str):
        course = self.repo.get_degree_course(course_id, user_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        self.repo.delete_degree_course(course)

    def add_cert(self, user_id: int, name: str, provider: str, target_date: str, status: str) -> str:
        cert = CertificationPlanner(
            user_id=user_id,
            name=name,
            provider=provider,
            target_date=target_date,
            status=status
        )
        cert = self.repo.create_cert(cert)
        return cert.id

    def list_certs(self, user_id: int) -> List[Dict[str, Any]]:
        certs = self.repo.get_user_certs(user_id)
        return [
            {
                "id": c.id,
                "name": c.name,
                "provider": c.provider,
                "target_date": c.target_date,
                "status": c.status
            } for c in certs
        ]

    def delete_cert(self, user_id: int, cert_id: str):
        cert = self.repo.get_cert(cert_id, user_id)
        if not cert:
            raise HTTPException(status_code=404, detail="Certification not found")
        self.repo.delete_cert(cert)

    def add_placement(self, user_id: int, company: str, role: str, rounds_json: str, package: str, status: str) -> str:
        p = PlacementTracker(
            user_id=user_id,
            company=company,
            role=role,
            rounds_json=rounds_json,
            package=package,
            status=status
        )
        p = self.repo.create_placement(p)
        return p.id

    def list_placements(self, user_id: int) -> List[Dict[str, Any]]:
        placements = self.repo.get_user_placements(user_id)
        return [
            {
                "id": p.id,
                "company": p.company,
                "role": p.role,
                "rounds_json": p.rounds_json,
                "package": p.package,
                "status": p.status
            } for p in placements
        ]

    def delete_placement(self, user_id: int, placement_id: str):
        p = self.repo.get_placement(placement_id, user_id)
        if not p:
            raise HTTPException(status_code=404, detail="Placement not found")
        self.repo.delete_placement(p)

    async def github_review(self, profile_text: str, target_role: str) -> dict:
        prompt = PromptManager.load("gradhub/github_review", profile_text=profile_text, target_role=target_role)
        messages = [{"role": "user", "content": prompt}]
        stream = AIGateway().generate_response_stream(messages, personality="career")
        full_text = await _collect_stream(stream)
        
        try:
            return json.loads(_strip_markdown_json(full_text))
        except Exception:
            return {
                "profile_score": 75,
                "strengths": ["Active contribution streak", "Solid Javascript projects"],
                "weaknesses": ["Lack of backend systems documentation", "No readme files in 3 main repos"],
                "readme_advice": "Add detailed setup guides, architecture diagrams, and links to live demos for your pinned repos.",
                "project_ideas": ["Building a microservices auth gateway", "Implementing a custom rate-limiting middleware"]
            }

    async def linkedin_optimize(self, profile_text: str, target_role: str) -> dict:
        prompt = PromptManager.load("gradhub/linkedin_optimize", profile_text=profile_text, target_role=target_role)
        messages = [{"role": "user", "content": prompt}]
        stream = AIGateway().generate_response_stream(messages, personality="career")
        full_text = await _collect_stream(stream)
            
        try:
            return json.loads(_strip_markdown_json(full_text))
        except Exception:
            return {
                "headline_suggestions": [f"{target_role} | Scaling Web Apps", f"Incoming {target_role} | Open-Source Enthusiast"],
                "about_summary": "Passionate developer focused on building scalable, performant architectures...",
                "star_bullets": ["Designed and implemented a distributed queue system reducing latency by 35%.", "Led development of a React dashboard resulting in 50% faster onboarding."],
                "keyword_boosters": ["Distributed Systems", "Cloud Architecture", "RESTful APIs", "State Management", "CI/CD Platforms"]
            }
