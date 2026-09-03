from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils import (
    create_insert_query_for_table,
    create_insert_query_for_table_with_except_from_temp,
    create_truncate_query,
    read_from_sql_folder,
)
from src.models import NewApartHistory, BuildingHistory, NewApart
from sqlalchemy import select, text


async def upsert_with_except_from_temp_table(
    table: str,
    temp_table: str,
    on_conflict_column: str,
    columns: list[str],
    data: list[dict[str, Any]],
    session: AsyncSession,
):
    insert_query_to_temp = create_insert_query_for_table(
        table=temp_table, columns=columns, on_conflict_column=on_conflict_column
    )
    insert_to_target_query_with_except_from_temp = (
        create_insert_query_for_table_with_except_from_temp(
            table=table,
            columns=columns,
            temp_table=temp_table,
            on_conflict_column=on_conflict_column,
        )
    )
    clear_temp = create_truncate_query(table=temp_table)
    await session.execute(insert_query_to_temp, data)
    await session.execute(insert_to_target_query_with_except_from_temp)
    await session.execute(clear_temp)


async def insert_into_table(
    table: str,
    columns: str,
    on_conflict_column: str,
    data: list[dict[str, Any]],
    session: AsyncSession,
):
    insert_query = create_insert_query_for_table(
        table=table, columns=columns, on_conflict_column=on_conflict_column
    )
    await session.execute(insert_query, data)


async def get_new_aparts_table(
    *, new_apart_ids: list[int] | None, session: AsyncSession
):
    stmt = select(NewApart)
    if new_apart_ids:
        stmt = stmt.where(NewApart.new_apart_id.in_(new_apart_ids))
    result = await session.execute(stmt)
    return result.mappings().all()


async def get_new_aparts_history(*, new_apart_id: int, session: AsyncSession):
    result = await session.execute(
        select(NewApartHistory.__table__)
        .where(NewApartHistory.new_apart_id == new_apart_id)
        .order_by(NewApartHistory.version)
    )
    return result.mappings().all()


async def get_buildings_table(*, session: AsyncSession):
    sql = await read_from_sql_folder("buildings_table")
    result = await session.execute(text(sql))
    return result.mappings().all()


async def get_buildings_history(*, building_id: int, session: AsyncSession):
    result = await session.execute(
        select(BuildingHistory.__table__)
        .where(BuildingHistory.building_id == building_id)
        .order_by(BuildingHistory.version)
    )
    return result.mappings().all()


async def get_buildings_apartments(*, building_id: int, session: AsyncSession):
    result = await session.execute(
        select(NewApart.__table__).where(NewApart.building_id == str(building_id))
    )
    return result.mappings().all()


async def get_data_for_excel_file(sql: str, session: AsyncSession):
    result = await session.execute(text(sql))
    return result.mappings().all()


async def get_aparts_table(
    *,
    building_id: int | None,
    building_ids: str | None,
    favorites_only: bool,
    discount_only: bool,
    price_drop_only: bool,
    reserved_only: bool,
    available_only: bool,
    family_only: bool,
    auction_only: bool,
    finishing: str | None,
    comment_only: bool,
    min_price: float | None,
    max_price: float | None,
    min_discount: float | None,
    q: str | None,
    session: AsyncSession,
):
    sql = await read_from_sql_folder("aparts_table")
    result = await session.execute(
        text(sql),
        {
            "building_id": building_id,
            "building_ids": building_ids or None,
            "favorites_only": favorites_only,
            "discount_only": discount_only,
            "price_drop_only": price_drop_only,
            "reserved_only": reserved_only,
            "available_only": available_only,
            "family_only": family_only,
            "auction_only": auction_only,
            "finishing": finishing or None,
            "comment_only": comment_only,
            "min_price": min_price,
            "max_price": max_price,
            "min_discount": min_discount,
            "q": q,
            "q_like": f"%{q}%" if q else None,
        },
    )
    return result.mappings().all()


async def list_comments(*, new_apart_id: int, session: AsyncSession):
    result = await session.execute(
        text(
            "SELECT id, new_apart_id, body, created_at FROM comments "
            "WHERE new_apart_id = :i ORDER BY created_at"
        ),
        {"i": new_apart_id},
    )
    return result.mappings().all()


async def add_comment(*, new_apart_id: int, body: str, session: AsyncSession):
    result = await session.execute(
        text(
            "INSERT INTO comments (new_apart_id, body) VALUES (:i, :b) "
            "RETURNING id, new_apart_id, body, created_at"
        ),
        {"i": new_apart_id, "b": body},
    )
    return result.mappings().one()


async def delete_comment(*, comment_id: int, session: AsyncSession) -> None:
    await session.execute(
        text("DELETE FROM comments WHERE id = :i"), {"i": comment_id}
    )


async def add_favorite(*, new_apart_id: int, session: AsyncSession) -> None:
    await session.execute(
        text("INSERT INTO favorites (new_apart_id) VALUES (:i) ON CONFLICT DO NOTHING"),
        {"i": new_apart_id},
    )


async def remove_favorite(*, new_apart_id: int, session: AsyncSession) -> None:
    await session.execute(
        text("DELETE FROM favorites WHERE new_apart_id = :i"), {"i": new_apart_id}
    )


async def list_favorites(*, session: AsyncSession) -> list[int]:
    result = await session.execute(
        text("SELECT new_apart_id FROM favorites ORDER BY new_apart_id")
    )
    return [row[0] for row in result.all()]


async def refresh_building_price_stats(*, session: AsyncSession) -> int:
    sql = await read_from_sql_folder("building_price_stats_refresh")
    result = await session.execute(text(sql))
    return result.rowcount


async def get_dashboard_metrics(*, favorites_only: bool, session: AsyncSession):
    sql = await read_from_sql_folder("dashboard")
    result = await session.execute(text(sql), {"favorites_only": favorites_only})
    return result.mappings().one()


async def get_dashboard_timeseries(
    *, favorites_only: bool, date_from, date_to, session: AsyncSession
):
    sql = await read_from_sql_folder("dashboard_timeseries")
    result = await session.execute(
        text(sql),
        {
            "favorites_only": favorites_only,
            "date_from": date_from,
            "date_to": date_to,
        },
    )
    return result.mappings().all()


async def get_dashboard_changes(
    *, favorites_only: bool, date, session: AsyncSession
):
    sql = await read_from_sql_folder("dashboard_changes")
    result = await session.execute(
        text(sql), {"favorites_only": favorites_only, "date": date}
    )
    return result.mappings().all()


async def get_scatter(*, favorites_only: bool, session: AsyncSession):
    sql = await read_from_sql_folder("scatter")
    result = await session.execute(text(sql), {"favorites_only": favorites_only})
    return result.mappings().all()


async def get_pivot_date(
    *, favorites_only: bool, date_from, date_to, session: AsyncSession
):
    sql = await read_from_sql_folder("pivot_date")
    result = await session.execute(
        text(sql),
        {
            "favorites_only": favorites_only,
            "date_from": date_from,
            "date_to": date_to,
        },
    )
    return result.mappings().all()


async def get_pivot_category(
    *, key_expr: str, join: str, favorites_only: bool, session: AsyncSession
):
    template = await read_from_sql_folder("pivot_category")
    sql = template.replace("{key}", key_expr).replace("{join}", join)
    result = await session.execute(text(sql), {"favorites_only": favorites_only})
    return result.mappings().all()


async def get_history_date_range(*, session: AsyncSession):
    result = await session.execute(
        text(
            "SELECT min(updated_at::date) AS history_from, "
            "max(updated_at::date) AS history_to FROM new_aparts_history"
        )
    )
    return result.mappings().one()


async def get_buildings_stats(*, session: AsyncSession):
    sql = await read_from_sql_folder("buildings_stats")
    result = await session.execute(text(sql))
    return result.mappings().all()


async def get_notifications(*, days: int, session: AsyncSession):
    sql = await read_from_sql_folder("notifications")
    result = await session.execute(text(sql), {"days": days})
    return result.mappings().all()


async def get_metro_stats(*, session: AsyncSession):
    sql = await read_from_sql_folder("metro_stats")
    result = await session.execute(text(sql))
    return result.mappings().all()


async def get_price_history(*, session: AsyncSession):
    sql = await read_from_sql_folder("price_history")
    result = await session.execute(text(sql))
    return result.mappings().all()


async def record_refresh_run(*, ok: bool, session: AsyncSession) -> None:
    await session.execute(
        text("INSERT INTO refresh_runs (ok) VALUES (:ok)"), {"ok": ok}
    )


async def get_last_refresh(*, session: AsyncSession):
    result = await session.execute(
        text("SELECT max(ran_at) FROM refresh_runs WHERE ok")
    )
    return result.scalar_one_or_none()


async def get_building_price_dynamics(*, building_id: int, session: AsyncSession):
    result = await session.execute(
        text(
            "SELECT snapshot_date, avg_price_m, min_price_m, median_price_m, apart_count "
            "FROM building_price_stats WHERE building_id = :b ORDER BY snapshot_date"
        ),
        {"b": building_id},
    )
    return result.mappings().all()
