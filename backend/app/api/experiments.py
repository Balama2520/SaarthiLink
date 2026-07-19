from fastapi import APIRouter, Depends

from app.core.dependencies.auth import get_current_user
from app.models.models import User
from app.services.experiment_service import ExperimentService
from app.core.dependencies.services import get_experiment_service
from pydantic import BaseModel

router = APIRouter(prefix="/api/experiments", tags=["Experiments"])

class ExperimentRequest(BaseModel):
    project_id: str
    model_name: str
    dataset: str
    hyperparameters: dict
    metrics: dict
    notes: str = ""

@router.post("/track")
async def track_experiment(
    request: ExperimentRequest,
    current_user: User = Depends(get_current_user),
    service: ExperimentService = Depends(get_experiment_service)
):
    """Log an experiment with metrics (like MLflow)"""
    experiment_id = service.track_experiment(
        user_id=current_user.id,
        project_id=request.project_id,
        model_name=request.model_name,
        dataset=request.dataset,
        hyperparameters=request.hyperparameters,
        metrics=request.metrics,
        notes=request.notes
    )
    return {"status": "success", "experiment_id": experiment_id}

@router.get("/")
async def list_experiments(
    current_user: User = Depends(get_current_user),
    service: ExperimentService = Depends(get_experiment_service)
):
    """Get all experiment logs for the user."""
    return {"status": "success", "experiments": service.list_experiments(current_user.id)}

