"""Initial schema for reports and matches.

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-09-10 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create reports table
    op.create_table(
        "reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("type", sa.String(length=10), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("color", sa.String(length=50), nullable=True),
        sa.Column("location", sa.String(length=100), nullable=False),
        sa.Column("date_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("photo_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reports_id"), "reports", ["id"], unique=False)
    op.create_index(op.f("ix_reports_type"), "reports", ["type"], unique=False)
    op.create_index(op.f("ix_reports_category"), "reports", ["category"], unique=False)
    op.create_index(op.f("ix_reports_color"), "reports", ["color"], unique=False)
    op.create_index(op.f("ix_reports_location"), "reports", ["location"], unique=False)
    op.create_index(op.f("ix_reports_date_time"), "reports", ["date_time"], unique=False)
    op.create_index(op.f("ix_reports_created_at"), "reports", ["created_at"], unique=False)

    # Create matches audit table
    op.create_table(
        "matches",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_report_id", sa.Uuid(), nullable=False),
        sa.Column("candidate_report_id", sa.Uuid(), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("decision", sa.String(length=20), nullable=False),
        sa.Column("factor_scores", sa.JSON(), nullable=False),
        sa.Column("explanation", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["source_report_id"], ["reports.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["candidate_report_id"], ["reports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_matches_id"), "matches", ["id"], unique=False)
    op.create_index(op.f("ix_matches_source_report_id"), "matches", ["source_report_id"], unique=False)
    op.create_index(op.f("ix_matches_candidate_report_id"), "matches", ["candidate_report_id"], unique=False)
    op.create_index(op.f("ix_matches_created_at"), "matches", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_matches_created_at"), table_name="matches")
    op.drop_index(op.f("ix_matches_candidate_report_id"), table_name="matches")
    op.drop_index(op.f("ix_matches_source_report_id"), table_name="matches")
    op.drop_index(op.f("ix_matches_id"), table_name="matches")
    op.drop_table("matches")

    op.drop_index(op.f("ix_reports_created_at"), table_name="reports")
    op.drop_index(op.f("ix_reports_date_time"), table_name="reports")
    op.drop_index(op.f("ix_reports_location"), table_name="reports")
    op.drop_index(op.f("ix_reports_color"), table_name="reports")
    op.drop_index(op.f("ix_reports_category"), table_name="reports")
    op.drop_index(op.f("ix_reports_type"), table_name="reports")
    op.drop_index(op.f("ix_reports_id"), table_name="reports")
    op.drop_table("reports")
