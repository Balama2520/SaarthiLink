import logging
import json
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.models import WorkflowState
from app.engine.events import EventPublisher

logger = logging.getLogger(__name__)


class WorkflowEngine:
    def __init__(self, db: Session):
        self.db = db
        self.events = EventPublisher(db)

    def start_workflow(
        self, user_id: int, workflow_type: str, initial_context: Dict[str, Any]
    ) -> WorkflowState:
        """
        Starts a new cross-module workflow.
        """
        # Suspend any currently active workflows for this user
        active_workflows = (
            self.db.query(WorkflowState)
            .filter(WorkflowState.user_id == user_id, WorkflowState.status == "ACTIVE")
            .all()
        )
        for wf in active_workflows:
            wf.status = "SUSPENDED"

        # Create new workflow
        new_workflow = WorkflowState(
            user_id=user_id,
            workflow_type=workflow_type,
            current_step="INITIATED",
            status="ACTIVE",
            context_payload=json.dumps(initial_context),
        )
        self.db.add(new_workflow)
        self.db.commit()
        self.db.refresh(new_workflow)

        self.events.publish(
            "WorkflowStarted",
            {"workflow_id": new_workflow.id, "user_id": user_id, "type": workflow_type},
        )

        return new_workflow

    def advance_workflow(
        self, workflow_id: str, next_step: str, context_updates: Dict[str, Any]
    ) -> WorkflowState:
        """
        Moves a workflow to the next step and merges context.
        """
        workflow = (
            self.db.query(WorkflowState).filter(WorkflowState.id == workflow_id).first()
        )
        if not workflow:
            raise ValueError("Workflow not found")

        workflow.current_step = next_step

        # Merge context
        current_context = (
            json.loads(workflow.context_payload) if workflow.context_payload else {}
        )
        current_context.update(context_updates)
        workflow.context_payload = json.dumps(current_context)

        self.db.commit()
        self.db.refresh(workflow)

        return workflow

    def complete_workflow(self, workflow_id: str) -> WorkflowState:
        """
        Marks a workflow as completed and emits an event.
        """
        workflow = (
            self.db.query(WorkflowState).filter(WorkflowState.id == workflow_id).first()
        )
        if not workflow:
            raise ValueError("Workflow not found")

        workflow.status = "COMPLETED"
        self.db.commit()
        self.db.refresh(workflow)

        self.events.publish(
            "WorkflowCompleted",
            {
                "workflow_id": workflow.id,
                "user_id": workflow.user_id,
                "type": workflow.workflow_type,
                "final_context": (
                    json.loads(workflow.context_payload)
                    if workflow.context_payload
                    else {}
                ),
            },
        )

        return workflow

    def get_active_workflow(self, user_id: int) -> Optional[WorkflowState]:
        """
        Fetches the active workflow for context propagation to the UI.
        """
        return (
            self.db.query(WorkflowState)
            .filter(WorkflowState.user_id == user_id, WorkflowState.status == "ACTIVE")
            .first()
        )

    def resume_workflow(self, workflow_id: str) -> WorkflowState:
        """
        Resumes a suspended workflow.
        """
        workflow = (
            self.db.query(WorkflowState).filter(WorkflowState.id == workflow_id).first()
        )
        if not workflow:
            raise ValueError("Workflow not found")

        # Suspend other actives
        active_workflows = (
            self.db.query(WorkflowState)
            .filter(
                WorkflowState.user_id == workflow.user_id,
                WorkflowState.status == "ACTIVE",
            )
            .all()
        )
        for wf in active_workflows:
            wf.status = "SUSPENDED"

        workflow.status = "ACTIVE"
        self.db.commit()
        self.db.refresh(workflow)

        self.events.publish(
            "WorkflowResumed",
            {
                "workflow_id": workflow.id,
                "user_id": workflow.user_id,
                "type": workflow.workflow_type,
            },
        )

        return workflow
