from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils import (
    create_insert_query_for_table,
    create_insert_query_for_table_with_except_from_temp,
    create_truncate_query,
    read_from_sql_folder,
)
from src.models import NewApartHistory, Building, BuildingHistory, NewApart
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
    result = await session.execute(select(Building.__table__))
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
    favorites_only: bool,
    discount_only: bool,
    price_drop_only: bool,
    q: str | None,
    session: AsyncSession,
):
    sql = await read_from_sql_folder("aparts_table")
    result = await session.execute(
        text(sql),
        {
            "building_id": building_id,
            "favorites_only": favorites_only,
            "discount_only": discount_only,
            "price_drop_only": price_drop_only,
            "q": q,
            "q_like": f"%{q}%" if q else None,
        },
    )
    return result.mappings().all()


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


async def get_building_price_dynamics(*, building_id: int, session: AsyncSession):
    result = await session.execute(
        text(
            "SELECT snapshot_date, avg_price_m, min_price_m, median_price_m, apart_count "
            "FROM building_price_stats WHERE building_id = :b ORDER BY snapshot_date"
        ),
        {"b": building_id},
    )
    return result.mappings().all()
