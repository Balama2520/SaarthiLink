"""add_job_ecosystem_phase1

Adds the Job Ecosystem tables: companies, jobs, job_skills, user_skills, saved_jobs.
This is a safe, additive migration — it never drops or modifies existing tables.

Revision ID: 06e519b97e2b
Revises: 558e39301e77
Create Date: 2026-07-31 12:20:16.213926

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '06e519b97e2b'
down_revision: Union[str, Sequence[str], None] = '558e39301e77'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Included in the reconstructed empty-database baseline.
    return
    """Create the Job Ecosystem tables (additive-only migration)."""

    # ── companies ─────────────────────────────────────────────────────────────
    op.create_table(
        'companies',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('domain', sa.String(255), nullable=True),
        sa.Column('logo_url', sa.String(512), nullable=True),
        sa.Column('industry', sa.String(100), nullable=True),
        sa.Column('company_size', sa.String(50), nullable=True),
        sa.Column('headquarters', sa.String(255), nullable=True),
        sa.Column('website', sa.String(512), nullable=True),
        sa.Column('careers_url', sa.String(512), nullable=True),
        sa.Column('linkedin_url', sa.String(512), nullable=True),
        sa.Column('is_hiring', sa.Boolean(), nullable=True),
        sa.Column('last_synced', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index('ix_companies_name', 'companies', ['name'], unique=True)

    # ── jobs ──────────────────────────────────────────────────────────────────
    op.create_table(
        'jobs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('company_id', sa.String(), sa.ForeignKey('companies.id'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('job_type', sa.String(50), nullable=True),
        sa.Column('employment_type', sa.String(50), nullable=True),
        sa.Column('remote_type', sa.String(50), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='ACTIVE'),
        sa.Column('salary_min', sa.Integer(), nullable=True),
        sa.Column('salary_max', sa.Integer(), nullable=True),
        sa.Column('experience_required', sa.String(50), nullable=True),
        sa.Column('apply_url', sa.String(512), nullable=True),
        sa.Column('source', sa.String(100), nullable=True),
        sa.Column('dedup_hash', sa.String(64), nullable=True),
        sa.Column('posted_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('dedup_hash'),
    )
    op.create_index('ix_jobs_title', 'jobs', ['title'])
    op.create_index('ix_jobs_status_expires', 'jobs', ['status', 'expires_at'])
    op.create_index('ix_jobs_company_title', 'jobs', ['company_id', 'title'])
    op.create_index('ix_jobs_location', 'jobs', ['location'])
    op.create_index('ix_jobs_job_type', 'jobs', ['job_type'])

    # ── job_skills ────────────────────────────────────────────────────────────
    op.create_table(
        'job_skills',
        sa.Column('job_id', sa.String(), sa.ForeignKey('jobs.id'), nullable=False),
        sa.Column('skill_name', sa.String(100), nullable=False),
        sa.Column('is_required', sa.Boolean(), nullable=True, server_default='1'),
        sa.PrimaryKeyConstraint('job_id', 'skill_name'),
    )
    op.create_index('ix_job_skills_skill_name', 'job_skills', ['skill_name'])

    # ── user_skills ───────────────────────────────────────────────────────────
    op.create_table(
        'user_skills',
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('skill_name', sa.String(100), nullable=False),
        sa.Column('proficiency', sa.Integer(), nullable=True, server_default='1'),
        sa.Column('source', sa.String(50), nullable=True, server_default='resume'),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('user_id', 'skill_name'),
    )
    op.create_index('ix_user_skills_user_id', 'user_skills', ['user_id'])
    op.create_index('ix_user_skills_skill_name', 'user_skills', ['skill_name'])

    # ── saved_jobs ────────────────────────────────────────────────────────────
    op.create_table(
        'saved_jobs',
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('job_id', sa.String(), sa.ForeignKey('jobs.id'), nullable=False),
        sa.Column('saved_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('user_id', 'job_id'),
    )


def downgrade() -> None:
    return
    """Remove the Job Ecosystem tables (reverse of upgrade)."""
    op.drop_table('saved_jobs')
    op.drop_index('ix_user_skills_skill_name', table_name='user_skills')
    op.drop_index('ix_user_skills_user_id', table_name='user_skills')
    op.drop_table('user_skills')
    op.drop_index('ix_job_skills_skill_name', table_name='job_skills')
    op.drop_table('job_skills')
    op.drop_index('ix_jobs_job_type', table_name='jobs')
    op.drop_index('ix_jobs_location', table_name='jobs')
    op.drop_index('ix_jobs_company_title', table_name='jobs')
    op.drop_index('ix_jobs_status_expires', table_name='jobs')
    op.drop_index('ix_jobs_title', table_name='jobs')
    op.drop_table('jobs')
    op.drop_index('ix_companies_name', table_name='companies')
    op.drop_table('companies')
