from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from src.auth import current_user_id
from src.utils import (
    create_insert_query_for_table,
    create_insert_query_for_table_with_except_from_temp,
    create_truncate_query,
    read_from_sql_folder,
)
from src.models import NewApartHistory, BuildingHistory, NewApart, TorgiLotHistory
from sqlalchemy import select, text


def _p(**params: Any) -> dict[str, Any]:
    """Параметры запроса + id текущего пользователя: избранное у каждого своё,
    и все отчёты считают его по :user_id (см. src/sql/*.sql)."""
    return {**params, "user_id": current_user_id()}


async def upsert_with_except_from_temp_table(
    table: str,
    temp_table: str,
    on_conflict_column: str,
    columns: list[str],
    data: list[dict[str, Any]],
    session: AsyncSession,
    coalesce_columns: tuple[str, ...] = (),
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
            coalesce_columns=coalesce_columns,
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
    result = await session.execute(text(sql), _p())
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
    apart_id: int | None = None,
    building_id: int | None,
    building_ids: str | None,
    favorites_only: bool,
    discount_only: bool,
    price_drop_only: bool,
    price_rise_only: bool,
    new_only: bool,
    changed_only: bool,
    reserved_only: bool,
    available_only: bool,
    family_only: bool,
    auction_only: bool,
    finishing: str | None,
    deadline_max: int | None,
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
        _p(**{
            "apart_id": apart_id,
            "building_id": building_id,
            "building_ids": building_ids or None,
            "favorites_only": favorites_only,
            "discount_only": discount_only,
            "price_drop_only": price_drop_only,
            "price_rise_only": price_rise_only,
            "new_only": new_only,
            "changed_only": changed_only,
            "reserved_only": reserved_only,
            "available_only": available_only,
            "family_only": family_only,
            "auction_only": auction_only,
            "finishing": finishing or None,
            "deadline_max": deadline_max,
            "comment_only": comment_only,
            "min_price": min_price,
            "max_price": max_price,
            "min_discount": min_discount,
            "q": q,
            "q_like": f"%{q}%" if q else None,
        }),
    )
    return result.mappings().all()


async def list_comments(*, new_apart_id: int, session: AsyncSession):
    """Комментарии видны всем — с именем автора; удалять можно только свои."""
    result = await session.execute(
        text(
            "SELECT c.id, c.new_apart_id, c.body, c.created_at, u.username AS author, "
            "       c.user_id = :u AS is_mine "
            "FROM comments c JOIN users u ON u.id = c.user_id "
            "WHERE c.new_apart_id = :i ORDER BY c.created_at"
        ),
        {"i": new_apart_id, "u": current_user_id()},
    )
    return result.mappings().all()


async def add_comment(*, new_apart_id: int, body: str, session: AsyncSession):
    result = await session.execute(
        text(
            "INSERT INTO comments (new_apart_id, user_id, body) VALUES (:i, :u, :b) "
            "RETURNING id, new_apart_id, body, created_at, "
            "          (SELECT username FROM users WHERE id = :u) AS author, "
            "          true AS is_mine"
        ),
        {"i": new_apart_id, "u": current_user_id(), "b": body},
    )
    return result.mappings().one()


async def delete_comment(*, comment_id: int, session: AsyncSession) -> int:
    """Возвращает число удалённых строк: чужой комментарий не трогаем."""
    result = await session.execute(
        text("DELETE FROM comments WHERE id = :i AND user_id = :u"),
        {"i": comment_id, "u": current_user_id()},
    )
    return result.rowcount


async def add_favorite(*, new_apart_id: int, session: AsyncSession) -> None:
    await session.execute(
        text(
            "INSERT INTO favorites (new_apart_id, user_id) VALUES (:i, :u) "
            "ON CONFLICT DO NOTHING"
        ),
        {"i": new_apart_id, "u": current_user_id()},
    )


async def remove_favorite(*, new_apart_id: int, session: AsyncSession) -> None:
    await session.execute(
        text("DELETE FROM favorites WHERE new_apart_id = :i AND user_id = :u"),
        {"i": new_apart_id, "u": current_user_id()},
    )


async def list_favorites(*, session: AsyncSession) -> list[int]:
    result = await session.execute(
        text(
            "SELECT new_apart_id FROM favorites WHERE user_id = :u "
            "ORDER BY new_apart_id"
        ),
        {"u": current_user_id()},
    )
    return [row[0] for row in result.all()]


async def create_user(*, username: str, password_hash: str, session: AsyncSession):
    """id нового пользователя или None, если логин занят."""
    result = await session.execute(
        text(
            "INSERT INTO users (username, password_hash) VALUES (:n, :h)"
            " ON CONFLICT (username) DO NOTHING RETURNING id"
        ),
        {"n": username, "h": password_hash},
    )
    return result.scalar_one_or_none()


async def get_user_by_username(*, username: str, session: AsyncSession):
    result = await session.execute(
        text("SELECT id, username, password_hash FROM users WHERE username = :n"),
        {"n": username},
    )
    return result.mappings().one_or_none()


async def get_user(*, user_id: int, session: AsyncSession):
    result = await session.execute(
        text("SELECT id, username FROM users WHERE id = :i"), {"i": user_id}
    )
    return result.mappings().one_or_none()


async def refresh_building_price_stats(*, session: AsyncSession) -> int:
    sql = await read_from_sql_folder("building_price_stats_refresh")
    result = await session.execute(text(sql))
    return result.rowcount


async def get_dashboard_metrics(*, favorites_only: bool, session: AsyncSession):
    sql = await read_from_sql_folder("dashboard")
    result = await session.execute(text(sql), _p(favorites_only=favorites_only))
    return result.mappings().one()


async def get_dashboard_timeseries(
    *, favorites_only: bool, date_from, date_to, session: AsyncSession
):
    sql = await read_from_sql_folder("dashboard_timeseries")
    result = await session.execute(
        text(sql),
        _p(favorites_only=favorites_only, date_from=date_from, date_to=date_to),
    )
    return result.mappings().all()


async def get_dashboard_changes(
    *, favorites_only: bool, date, session: AsyncSession
):
    sql = await read_from_sql_folder("dashboard_changes")
    result = await session.execute(
        text(sql), _p(favorites_only=favorites_only, date=date)
    )
    return result.mappings().all()


async def get_scatter(*, favorites_only: bool, session: AsyncSession):
    sql = await read_from_sql_folder("scatter")
    result = await session.execute(text(sql), _p(favorites_only=favorites_only))
    return result.mappings().all()


async def get_sankey(*, favorites_only: bool, session: AsyncSession):
    sql = await read_from_sql_folder("sankey")
    result = await session.execute(text(sql), _p(favorites_only=favorites_only))
    return result.mappings().all()


async def get_deadlines(*, favorites_only: bool, session: AsyncSession):
    sql = await read_from_sql_folder("deadlines")
    result = await session.execute(text(sql), _p(favorites_only=favorites_only))
    return result.mappings().all()


async def get_pivot_date(
    *, favorites_only: bool, date_from, date_to, district, session: AsyncSession
):
    sql = await read_from_sql_folder("pivot_date")
    result = await session.execute(
        text(sql),
        _p(
            favorites_only=favorites_only,
            date_from=date_from,
            date_to=date_to,
            district=district,
        ),
    )
    return result.mappings().all()


async def get_pivot_category(
    *, key_expr: str, favorites_only: bool, district, session: AsyncSession
):
    template = await read_from_sql_folder("pivot_category")
    sql = template.replace("{key}", key_expr)
    result = await session.execute(
        text(sql), _p(favorites_only=favorites_only, district=district)
    )
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
    result = await session.execute(text(sql), _p())
    return result.mappings().all()


async def get_notifications(*, days: int, session: AsyncSession):
    sql = await read_from_sql_folder("notifications")
    result = await session.execute(text(sql), _p(days=days))
    return result.mappings().all()


async def get_metro_stats(*, session: AsyncSession):
    sql = await read_from_sql_folder("metro_stats")
    result = await session.execute(text(sql), _p())
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


async def get_torgi_lots(
    *,
    lot_id: int | None,
    open_only: bool,
    status: str | None,
    category: str | None,
    brand: str | None,
    year_min: int | None,
    year_max: int | None,
    min_price: float | None,
    max_price: float | None,
    max_mileage: int | None,
    price_drop_only: bool,
    with_plate_only: bool,
    fav_only: bool,
    watch_only: bool,
    valid_plate_only: bool,
    plate_region: str | None,
    q: str | None,
    session: AsyncSession,
):
    sql = await read_from_sql_folder("torgi_lots")
    result = await session.execute(
        text(sql),
        _p(**{
            "lot_id": lot_id,
            "open_only": open_only,
            "status": status or None,
            "category": category or None,
            "brand": f"%{brand}%" if brand else None,
            "year_min": year_min,
            "year_max": year_max,
            "min_price": min_price,
            "max_price": max_price,
            "max_mileage": max_mileage,
            "price_drop_only": price_drop_only,
            "with_plate_only": with_plate_only,
            "fav_only": fav_only,
            "watch_only": watch_only,
            "valid_plate_only": valid_plate_only,
            "plate_region": plate_region or None,
            "q": q,
            "q_like": f"%{q}%" if q else None,
        }),
    )
    return result.mappings().all()


async def get_torgi_lot_history(*, lot_id: int, session: AsyncSession):
    result = await session.execute(
        select(TorgiLotHistory.__table__)
        .where(TorgiLotHistory.lot_id == lot_id)
        .order_by(TorgiLotHistory.version)
    )
    return result.mappings().all()


async def get_torgi_stats(*, session: AsyncSession):
    sql = await read_from_sql_folder("torgi_stats")
    result = await session.execute(text(sql))
    return result.mappings().all()


# --- торги: избранное, паттерны номеров, отчёты ------------------------------

# Строка паттерна для ответа: matched_now считается на чтение, таблицы
# «доставленного» нет (см. спеку, раздел 4).
_WATCH_ROW = (
    "SELECT w.id, w.mask, w.label, w.regex, w.created_at, "
    "       (SELECT count(*) FROM torgi_lots tl WHERE tl.plate_norm ~ w.regex) "
    "           AS matched_now "
    "FROM plate_watches w WHERE w.user_id = :u"
)


async def add_torgi_favorite(*, lot_id: int, session: AsyncSession) -> None:
    await session.execute(
        text(
            "INSERT INTO torgi_favorites (lot_id, user_id) VALUES (:i, :u) "
            "ON CONFLICT DO NOTHING"
        ),
        {"i": lot_id, "u": current_user_id()},
    )


async def remove_torgi_favorite(*, lot_id: int, session: AsyncSession) -> None:
    await session.execute(
        text("DELETE FROM torgi_favorites WHERE lot_id = :i AND user_id = :u"),
        {"i": lot_id, "u": current_user_id()},
    )


async def list_torgi_favorites(*, session: AsyncSession) -> list[int]:
    result = await session.execute(
        text(
            "SELECT lot_id FROM torgi_favorites WHERE user_id = :u ORDER BY lot_id"
        ),
        {"u": current_user_id()},
    )
    return [row[0] for row in result.all()]


async def list_plate_watches(*, session: AsyncSession):
    result = await session.execute(
        text(f"{_WATCH_ROW} ORDER BY w.id"), {"u": current_user_id()}
    )
    return result.mappings().all()


async def get_plate_watch(*, watch_id: int, session: AsyncSession):
    result = await session.execute(
        text(f"{_WATCH_ROW} AND w.id = :i"),
        {"u": current_user_id(), "i": watch_id},
    )
    return result.mappings().one_or_none()


async def add_plate_watch(
    *, mask: str | None, regex: str, label: str | None, session: AsyncSession
) -> int:
    """Дубликат (user_id, regex) идемпотентен: возвращается id существующего
    паттерна, а переданный label его переименовывает."""
    result = await session.execute(
        text(
            "INSERT INTO plate_watches (user_id, mask, regex, label) "
            "VALUES (:u, :m, :r, :l) "
            "ON CONFLICT (user_id, regex) DO UPDATE "
            "    SET label = COALESCE(EXCLUDED.label, plate_watches.label) "
            "RETURNING id"
        ),
        {"u": current_user_id(), "m": mask, "r": regex, "l": label},
    )
    return result.scalar_one()


async def delete_plate_watch(*, watch_id: int, session: AsyncSession) -> int:
    """Возвращает число удалённых строк: чужой паттерн не трогаем."""
    result = await session.execute(
        text("DELETE FROM plate_watches WHERE id = :i AND user_id = :u"),
        {"i": watch_id, "u": current_user_id()},
    )
    return result.rowcount


async def get_torgi_block(name: str, *, session: AsyncSession, **params):
    """Блок отчётов по торгам: один файл в src/sql/ — один запрос. name всегда
    литерал из сервиса, весь пользовательский ввод идёт bind-параметрами."""
    sql = await read_from_sql_folder(name)
    result = await session.execute(text(sql), _p(**params))
    return result.mappings().all()


async def get_torgi_pivot(*, key_expr: str, session: AsyncSession):
    template = await read_from_sql_folder("torgi_pivot")
    result = await session.execute(text(template.replace("{key}", key_expr)), _p())
    return result.mappings().all()


# --- лоты недвижимости torgi.mos.ru ---------------------------------------


async def get_torgi_objects(
    *,
    lot_id: int | None = None,
    object_type: str | None = None,
    district: str | None = None,
    region: str | None = None,
    fav_only: bool = False,
    live_only: bool = False,
    sold_only: bool = False,
    price_drop_only: bool = False,
    min_price: float | None = None,
    max_price: float | None = None,
    min_area: float | None = None,
    max_area: float | None = None,
    rooms: int | None = None,
    q: str | None = None,
    limit: int = 500,
    session: AsyncSession,
):
    sql = await read_from_sql_folder("torgi_objects")
    result = await session.execute(
        text(sql),
        _p(**{
            "lot_id": lot_id,
            "object_type": object_type or None,
            "district": district or None,
            "region": region or None,
            "fav_only": fav_only,
            "live_only": live_only,
            "sold_only": sold_only,
            "price_drop_only": price_drop_only,
            "min_price": min_price,
            "max_price": max_price,
            "min_area": min_area,
            "max_area": max_area,
            "rooms": rooms,
            "q": q,
            "q_like": f"%{q}%" if q else None,
            "limit": limit,
        }),
    )
    return result.mappings().all()


async def get_torgi_objects_breakdown(
    *, dimension_sql: str, object_type: str | None, session: AsyncSession
):
    """dimension_sql приходит из словаря сервиса, не из запроса пользователя."""
    sql = await read_from_sql_folder("torgi_objects_breakdown")
    result = await session.execute(
        text(sql.replace("{dimension}", dimension_sql)),
        {"object_type": object_type or None},
    )
    return result.mappings().all()


async def get_torgi_objects_stats(*, session: AsyncSession):
    sql = await read_from_sql_folder("torgi_objects_stats")
    result = await session.execute(text(sql), _p())
    return result.mappings().all()


async def get_torgi_object_versions(*, lot_id: int, session: AsyncSession):
    sql = await read_from_sql_folder("torgi_object_versions")
    result = await session.execute(text(sql), {"lot_id": lot_id})
    return result.mappings().all()


async def add_torgi_object_favorite(*, lot_id: int, session: AsyncSession) -> None:
    await session.execute(
        text(
            "INSERT INTO torgi_object_favorites (lot_id, user_id) VALUES (:i, :u) "
            "ON CONFLICT DO NOTHING"
        ),
        {"i": lot_id, "u": current_user_id()},
    )


async def remove_torgi_object_favorite(*, lot_id: int, session: AsyncSession) -> None:
    await session.execute(
        text(
            "DELETE FROM torgi_object_favorites WHERE lot_id = :i AND user_id = :u"
        ),
        {"i": lot_id, "u": current_user_id()},
    )


async def list_torgi_object_favorites(*, session: AsyncSession) -> list[int]:
    result = await session.execute(
        text(
            "SELECT lot_id FROM torgi_object_favorites WHERE user_id = :u "
            "ORDER BY lot_id"
        ),
        {"u": current_user_id()},
    )
    return [row[0] for row in result.all()]
