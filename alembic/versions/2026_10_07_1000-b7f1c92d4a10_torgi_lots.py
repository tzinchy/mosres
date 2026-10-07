"""torgi.mos.ru vehicle lots

Revision ID: b7f1c92d4a10
Revises: a1b2c3d4e5f6
Create Date: 2026-10-07 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as sapg
from alembic import op

from src.pg_definitions import (
    insert_torgi_lots_history_func,
    torgi_lots_history_trigger,
)

# revision identifiers, used by Alembic.
revision: str = "b7f1c92d4a10"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "torgi_lots",
        sa.Column("lot_id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("url", sa.String(), nullable=True),
        sa.Column("status_text", sa.String(), nullable=True),
        sa.Column("transport_category", sa.String(), nullable=True),
        sa.Column("brand", sa.String(), nullable=True),
        sa.Column("model", sa.String(), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("plate", sa.String(), nullable=True),
        sa.Column("vin", sa.String(), nullable=True),
        sa.Column("pts", sa.String(), nullable=True),
        sa.Column("color", sa.String(), nullable=True),
        sa.Column("body", sa.String(), nullable=True),
        sa.Column("eco_class", sa.String(), nullable=True),
        sa.Column("power", sa.String(), nullable=True),
        sa.Column("engine_volume", sa.String(), nullable=True),
        sa.Column("drive", sa.String(), nullable=True),
        sa.Column("transmission", sa.String(), nullable=True),
        sa.Column("mileage", sa.Integer(), nullable=True),
        sa.Column("start_price", sa.Numeric(), nullable=True),
        sa.Column("deposit", sa.Numeric(), nullable=True),
        sa.Column("auction_step", sa.Numeric(), nullable=True),
        sa.Column("final_price", sa.Numeric(), nullable=True),
        sa.Column("request_start_date", sa.DateTime(), nullable=True),
        sa.Column("request_end_date", sa.DateTime(), nullable=True),
        sa.Column("tender_date", sa.DateTime(), nullable=True),
        sa.Column("final_date", sa.DateTime(), nullable=True),
        sa.Column("platform_link", sa.String(), nullable=True),
        sa.Column("torgi_gov_link", sa.String(), nullable=True),
        sa.Column("video_link", sa.String(), nullable=True),
        sa.Column("latitude", sa.String(), nullable=True),
        sa.Column("longitude", sa.String(), nullable=True),
        sa.Column("photos", sapg.ARRAY(sa.String()), nullable=True),
        sa.Column("portal_views", sa.Integer(), nullable=True),
        sa.Column("source_updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("lot_id", name="pk_torgi_lots"),
    )
    op.create_table(
        "torgi_lots_history",
        sa.Column("torgi_lot_history_id", sa.Integer(), nullable=False),
        sa.Column("lot_id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("url", sa.String(), nullable=True),
        sa.Column("status_text", sa.String(), nullable=True),
        sa.Column("transport_category", sa.String(), nullable=True),
        sa.Column("brand", sa.String(), nullable=True),
        sa.Column("model", sa.String(), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("plate", sa.String(), nullable=True),
        sa.Column("vin", sa.String(), nullable=True),
        sa.Column("pts", sa.String(), nullable=True),
        sa.Column("color", sa.String(), nullable=True),
        sa.Column("body", sa.String(), nullable=True),
        sa.Column("eco_class", sa.String(), nullable=True),
        sa.Column("power", sa.String(), nullable=True),
        sa.Column("engine_volume", sa.String(), nullable=True),
        sa.Column("drive", sa.String(), nullable=True),
        sa.Column("transmission", sa.String(), nullable=True),
        sa.Column("mileage", sa.Integer(), nullable=True),
        sa.Column("start_price", sa.Numeric(), nullable=True),
        sa.Column("deposit", sa.Numeric(), nullable=True),
        sa.Column("auction_step", sa.Numeric(), nullable=True),
        sa.Column("final_price", sa.Numeric(), nullable=True),
        sa.Column("request_start_date", sa.DateTime(), nullable=True),
        sa.Column("request_end_date", sa.DateTime(), nullable=True),
        sa.Column("tender_date", sa.DateTime(), nullable=True),
        sa.Column("final_date", sa.DateTime(), nullable=True),
        sa.Column("platform_link", sa.String(), nullable=True),
        sa.Column("torgi_gov_link", sa.String(), nullable=True),
        sa.Column("video_link", sa.String(), nullable=True),
        sa.Column("latitude", sa.String(), nullable=True),
        sa.Column("longitude", sa.String(), nullable=True),
        sa.Column("photos", sapg.ARRAY(sa.String()), nullable=True),
        sa.Column("portal_views", sa.Integer(), nullable=True),
        sa.Column("source_updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("torgi_lot_history_id", name="pk_torgi_lots_history"),
    )
    op.create_table(
        "torgi_lots_temp",
        sa.Column("lot_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("url", sa.String(), nullable=True),
        sa.Column("status_text", sa.String(), nullable=True),
        sa.Column("transport_category", sa.String(), nullable=True),
        sa.Column("brand", sa.String(), nullable=True),
        sa.Column("model", sa.String(), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("plate", sa.String(), nullable=True),
        sa.Column("vin", sa.String(), nullable=True),
        sa.Column("pts", sa.String(), nullable=True),
        sa.Column("color", sa.String(), nullable=True),
        sa.Column("body", sa.String(), nullable=True),
        sa.Column("eco_class", sa.String(), nullable=True),
        sa.Column("power", sa.String(), nullable=True),
        sa.Column("engine_volume", sa.String(), nullable=True),
        sa.Column("drive", sa.String(), nullable=True),
        sa.Column("transmission", sa.String(), nullable=True),
        sa.Column("mileage", sa.Integer(), nullable=True),
        sa.Column("start_price", sa.Numeric(), nullable=True),
        sa.Column("deposit", sa.Numeric(), nullable=True),
        sa.Column("auction_step", sa.Numeric(), nullable=True),
        sa.Column("final_price", sa.Numeric(), nullable=True),
        sa.Column("request_start_date", sa.DateTime(), nullable=True),
        sa.Column("request_end_date", sa.DateTime(), nullable=True),
        sa.Column("tender_date", sa.DateTime(), nullable=True),
        sa.Column("final_date", sa.DateTime(), nullable=True),
        sa.Column("platform_link", sa.String(), nullable=True),
        sa.Column("torgi_gov_link", sa.String(), nullable=True),
        sa.Column("video_link", sa.String(), nullable=True),
        sa.Column("latitude", sa.String(), nullable=True),
        sa.Column("longitude", sa.String(), nullable=True),
        sa.Column("photos", sapg.ARRAY(sa.String()), nullable=True),
        sa.Column("portal_views", sa.Integer(), nullable=True),
        sa.Column("source_updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("lot_id", name="pk_torgi_lots_temp"),
    )
    op.create_index(
        "ix_torgi_lots_history_lot_id_version",
        "torgi_lots_history",
        ["lot_id", "version"],
    )
    op.create_index("ix_torgi_lots_status_text", "torgi_lots", ["status_text"])
    op.create_index("ix_torgi_lots_plate", "torgi_lots", ["plate"])
    op.create_entity(insert_torgi_lots_history_func)
    op.create_entity(torgi_lots_history_trigger)


def downgrade() -> None:
    op.drop_entity(torgi_lots_history_trigger)
    op.drop_entity(insert_torgi_lots_history_func)
    op.drop_index("ix_torgi_lots_plate", "torgi_lots")
    op.drop_index("ix_torgi_lots_status_text", "torgi_lots")
    op.drop_index("ix_torgi_lots_history_lot_id_version", "torgi_lots_history")
    op.drop_table("torgi_lots_temp")
    op.drop_table("torgi_lots_history")
    op.drop_table("torgi_lots")
