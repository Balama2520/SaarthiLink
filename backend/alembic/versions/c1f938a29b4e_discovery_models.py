"""Add Discovery Domain Models

Revision ID: c1f938a29b4e
Revises: b9f484181401
Create Date: 2026-09-11 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1f938a29b4e'
down_revision: Union[str, Sequence[str], None] = 'b9f484181401'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The reconstructed initial migration creates the complete SQLAlchemy
    # metadata for a fresh database, including these discovery tables.  Older
    # deployments may instead reach this revision without them.  Make this
    # revision idempotent across both supported histories.
    if sa.inspect(op.get_bind()).has_table("consent_records"):
        return

    # 1. consent_records
    op.create_table(
        'consent_records',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('consent_given', sa.Boolean(), default=True),
        sa.Column('consent_version', sa.String(length=20), default='1.0'),
        sa.Column('ip_hash', sa.String(length=64), nullable=True),
        sa.Column('user_agent_hash', sa.String(length=64), nullable=True),
        sa.Column('status', sa.String(length=20), default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_consent_records_session_id'), 'consent_records', ['session_id'], unique=False)

    # 2. user_discovery_profiles
    op.create_table(
        'user_discovery_profiles',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('consent_id', sa.String(), nullable=True),
        sa.Column('user_type', sa.String(length=80), nullable=True),
        sa.Column('user_type_other', sa.String(length=255), nullable=True),
        sa.Column('source', sa.String(length=50), default='discover_page'),
        sa.Column('status', sa.String(length=30), default='in_progress'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['consent_id'], ['consent_records.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_discovery_profiles_session_id'), 'user_discovery_profiles', ['session_id'], unique=True)

    # 3. user_intents
    op.create_table(
        'user_intents',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('profile_id', sa.String(), nullable=False),
        sa.Column('intent_key', sa.String(length=100), nullable=False),
        sa.Column('intent_label', sa.String(length=255), nullable=True),
        sa.Column('is_primary', sa.Boolean(), default=False),
        sa.Column('free_text', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['profile_id'], ['user_discovery_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_intents_profile_id'), 'user_intents', ['profile_id'], unique=False)

    # 4. career_challenges
    op.create_table(
        'career_challenges',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('profile_id', sa.String(), nullable=False),
        sa.Column('finding_relevant_jobs', sa.Integer(), nullable=True),
        sa.Column('finding_genuine_opportunities', sa.Integer(), nullable=True),
        sa.Column('understanding_jds', sa.Integer(), nullable=True),
        sa.Column('knowing_qualification', sa.Integer(), nullable=True),
        sa.Column('resume_improvement', sa.Integer(), nullable=True),
        sa.Column('skill_gap_identification', sa.Integer(), nullable=True),
        sa.Column('interview_preparation', sa.Integer(), nullable=True),
        sa.Column('finding_companies', sa.Integer(), nullable=True),
        sa.Column('tracking_applications', sa.Integer(), nullable=True),
        sa.Column('knowing_what_to_learn', sa.Integer(), nullable=True),
        sa.Column('biggest_difficulty', sa.Text(), nullable=True),
        sa.Column('one_problem_to_solve', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['profile_id'], ['user_discovery_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_career_challenges_profile_id'), 'career_challenges', ['profile_id'], unique=False)

    # 5. feature_feedbacks
    op.create_table(
        'feature_feedbacks',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('profile_id', sa.String(), nullable=False),
        sa.Column('feature_id', sa.Integer(), nullable=False),
        sa.Column('feature_key', sa.String(length=100), nullable=False),
        sa.Column('feature_label', sa.String(length=255), nullable=True),
        sa.Column('rating', sa.String(length=30), nullable=False),
        sa.Column('is_most_valuable', sa.Boolean(), default=False),
        sa.Column('is_least_valuable', sa.Boolean(), default=False),
        sa.Column('is_missing', sa.Boolean(), default=False),
        sa.Column('is_want_next', sa.Boolean(), default=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['profile_id'], ['user_discovery_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('profile_id', 'feature_id', name='uq_profile_feature')
    )
    op.create_index(op.f('ix_feature_feedbacks_feature_key'), 'feature_feedbacks', ['feature_key'], unique=False)
    op.create_index(op.f('ix_feature_feedbacks_profile_id'), 'feature_feedbacks', ['profile_id'], unique=False)

    # 6. product_feedbacks
    op.create_table(
        'product_feedbacks',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('profile_id', sa.String(), nullable=False),
        sa.Column('what_you_like', sa.Text(), nullable=True),
        sa.Column('what_you_dislike', sa.Text(), nullable=True),
        sa.Column('what_feels_confusing', sa.Text(), nullable=True),
        sa.Column('what_feels_unnecessary', sa.Text(), nullable=True),
        sa.Column('what_feels_missing', sa.Text(), nullable=True),
        sa.Column('would_use_regularly_if', sa.Text(), nullable=True),
        sa.Column('wish_saarthi_could', sa.Text(), nullable=True),
        sa.Column('should_never_do', sa.Text(), nullable=True),
        sa.Column('improve_immediately', sa.Text(), nullable=True),
        sa.Column('solve_next', sa.Text(), nullable=True),
        sa.Column('would_recommend_if', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['profile_id'], ['user_discovery_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_product_feedbacks_profile_id'), 'product_feedbacks', ['profile_id'], unique=False)

    # 7. opportunity_signals
    op.create_table(
        'opportunity_signals',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('profile_id', sa.String(), nullable=True),
        sa.Column('public_job_url', sa.String(length=2048), nullable=True),
        sa.Column('company', sa.String(length=255), nullable=True),
        sa.Column('role', sa.String(length=255), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('skills', sa.Text(), nullable=True),
        sa.Column('additional_context', sa.Text(), nullable=True),
        sa.Column('submitter_email', sa.String(length=255), nullable=True),
        sa.Column('validation_status', sa.String(length=30), default='pending'),
        sa.Column('ingestion_status', sa.String(length=30), default='pending'),
        sa.Column('dedup_hash', sa.String(length=64), nullable=True),
        sa.Column('status', sa.String(length=20), default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['profile_id'], ['user_discovery_profiles.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_opportunity_signals_dedup_hash'), 'opportunity_signals', ['dedup_hash'], unique=False)
    op.create_index(op.f('ix_opportunity_signals_profile_id'), 'opportunity_signals', ['profile_id'], unique=False)

    # 8. company_profiles
    op.create_table(
        'company_profiles',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('profile_id', sa.String(), nullable=True),
        sa.Column('company_name', sa.String(length=255), nullable=False),
        sa.Column('website', sa.String(length=512), nullable=True),
        sa.Column('industry', sa.String(length=100), nullable=True),
        sa.Column('company_size', sa.String(length=50), nullable=True),
        sa.Column('contact_name', sa.String(length=255), nullable=True),
        sa.Column('contact_role', sa.String(length=100), nullable=True),
        sa.Column('contact_email', sa.String(length=255), nullable=True),
        sa.Column('hiring_plans', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['profile_id'], ['user_discovery_profiles.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_company_profiles_profile_id'), 'company_profiles', ['profile_id'], unique=False)

    # 9. hiring_signals
    op.create_table(
        'hiring_signals',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('company_profile_id', sa.String(), nullable=False),
        sa.Column('roles_hiring_for', sa.Text(), nullable=True),
        sa.Column('skills_needed', sa.Text(), nullable=True),
        sa.Column('experience_levels', sa.String(length=255), nullable=True),
        sa.Column('biggest_hiring_challenge', sa.Text(), nullable=True),
        sa.Column('interested_in_saarthi_hire', sa.Boolean(), default=False),
        sa.Column('status', sa.String(length=20), default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['company_profile_id'], ['company_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_hiring_signals_company_profile_id'), 'hiring_signals', ['company_profile_id'], unique=False)

    # 10. job_submissions
    op.create_table(
        'job_submissions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('company_profile_id', sa.String(), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('jd_text', sa.Text(), nullable=True),
        sa.Column('apply_link', sa.String(length=2048), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('salary_range', sa.String(length=100), nullable=True),
        sa.Column('validation_status', sa.String(length=30), default='pending'),
        sa.Column('status', sa.String(length=20), default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['company_profile_id'], ['company_profiles.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_job_submissions_company_profile_id'), 'job_submissions', ['company_profile_id'], unique=False)

    # 11. contact_requests
    op.create_table(
        'contact_requests',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('role_type', sa.String(length=80), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('reason', sa.String(length=100), nullable=True),
        sa.Column('consent_given', sa.Boolean(), default=True),
        sa.Column('target_email', sa.String(length=255), default='saarthi.ai.platform@gmail.com'),
        sa.Column('status', sa.String(length=20), default='pending'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_contact_requests_email'), 'contact_requests', ['email'], unique=False)

    # 12. feedback_events
    op.create_table(
        'feedback_events',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.String(), nullable=True),
        sa.Column('session_id', sa.String(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('payload_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_feedback_events_event_type'), 'feedback_events', ['event_type'], unique=False)


def downgrade() -> None:
    op.drop_table('feedback_events')
    op.drop_table('contact_requests')
    op.drop_table('job_submissions')
    op.drop_table('hiring_signals')
    op.drop_table('company_profiles')
    op.drop_table('opportunity_signals')
    op.drop_table('product_feedbacks')
    op.drop_table('feature_feedbacks')
    op.drop_table('career_challenges')
    op.drop_table('user_intents')
    op.drop_table('user_discovery_profiles')
    op.drop_table('consent_records')
