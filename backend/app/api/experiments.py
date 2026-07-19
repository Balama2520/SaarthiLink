from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.auth.auth import get_current_user
from app.models.models import User, ExperimentLog
from pydantic import BaseModel
import json

router = APIRouter(prefix="/api/experiments", tags=["Experiments"])

class ExperimentRequest(BaseModel):
    project_id: str
    model_name: str
    dataset: str
    hyperparameters: dict
    metrics: dict
    notes: str = ""

@router.post("/track")
async def track_experiment(request: ExperimentRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Log an experiment with metrics (like MLflow)
    """
    exp = ExperimentLog(
        user_id=current_user.id,
        project_id=request.project_id,
        model_name=request.model_name,
        dataset=request.dataset,
        hyperparameters_json=json.dumps(request.hyperparameters),
        metrics_json=json.dumps(request.metrics),
        notes=request.notes
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return {"status": "success", "experiment_id": exp.id}

@router.get("/")
async def list_experiments(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get all experiment logs for the user.
    """
    experiments = db.query(ExperimentLog).filter(ExperimentLog.user_id == current_user.id).all()
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
    return {"status": "success", "experiments": res}
