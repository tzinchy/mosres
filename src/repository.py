from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils import (
    create_insert_query_for_table,
    create_insert_query_for_table_with_except_from_temp,
    create_truncate_query,
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
        stmt.where(NewApart.new_apart_id.in_(new_apart_ids))
    result = await session.execute(stmt)
    return result.mappings().all()


async def get_new_aparts_history(new_apart_id, session: AsyncSession):
    result = await session.execute(
        select(NewApartHistory).where(NewApartHistory.new_apart_id == new_apart_id)
    )
    return result.mappings().all()


async def get_buildings_table(session: AsyncSession):
    result = await session.execute(select(Building))
    return result.mappings().all()


async def get_buildings_history(building_id, session: AsyncSession):
    result = await session.execute(
        select(BuildingHistory).where(
            BuildingHistory.building_id == building_id
        )
    )
    return result.mappings().all()


async def get_buildings_apartments(*, building_id: int, session: AsyncSession):
    result = await session.execute(
        select(NewApart).where(NewApart.building_id == building_id)
    )
    return result.mappings().all()

async def get_data_for_excel_file(sql : str, session : AsyncSession):
    result = await session.execute(text(sql))
    return result.mappings().all()