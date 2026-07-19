import json
from app.repositories.experiment_repository import ExperimentRepository
from app.models.models import ExperimentLog
from typing import List, Dict, Any

class ExperimentService:
    def __init__(self, repo: ExperimentRepository):
        self.repo = repo

    def track_experiment(self, user_id: int, project_id: str, model_name: str, dataset: str, hyperparameters: dict, metrics: dict, notes: str) -> str:
        exp = ExperimentLog(
            user_id=user_id,
            project_id=project_id,
            model_name=model_name,
            dataset=dataset,
            hyperparameters_json=json.dumps(hyperparameters),
            metrics_json=json.dumps(metrics),
            notes=notes
        )
        exp = self.repo.create(exp)
        return exp.id

    def list_experiments(self, user_id: int) -> List[Dict[str, Any]]:
        experiments = self.repo.get_user_experiments(user_id)
        res = []
        for exp in experiments:
            res.append({
                "id": exp.id,
                "project_id": exp.project_id,
                "model_name": exp.model_name,
                "dataset": exp.dataset,
                "metrics": json.loads(exp.metrics_json) if exp.metrics_json else {},
                "created_at": exp.created_at
            })
        return res
