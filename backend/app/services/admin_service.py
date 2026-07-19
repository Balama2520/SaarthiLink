from app.repositories.admin_repository import AdminRepository

class AdminService:
    def __init__(self, repo: AdminRepository):
        self.repo = repo

    def get_stats(self) -> dict:
        recent_users = self.repo.get_recent_users()
        recent_users_list = [
            {"id": u.id, "email": u.email, "username": u.username} for u in recent_users
        ]
        
        return {
            "total_users": self.repo.count_users(),
            "total_chat_sessions": self.repo.count_chat_sessions(),
            "total_projects": self.repo.count_projects(),
            "total_applications": self.repo.count_applications(),
            "active_models": ["Qwen3 8B (Local)", "DeepSeek-R1 (Local)", "Gemini-1.5-Flash (Fallback)"],
            "recent_users": recent_users_list
        }
