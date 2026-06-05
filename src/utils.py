from sqlalchemy import text
from functools import wraps
from typing import Any
import aiofiles
from src.config import MAIN_FOLDER

def response_format(satext: bool):
    """
    Для оборачивания ответа от query builder'ов в формат sa (опционально)
    Можно переопределить в момент вызова функции
    """

    def decorator(func: Any):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if satext:
                return text(func(*args, **kwargs))
            return func(*args, **kwargs)

        return wrapper

    return decorator


def create_placheholders(columns: list[str]) -> tuple[str, str]:
    return ", ".join(columns), ", ".join([f":{col}" for col in columns])


def create_placheholders_with_excluded(columns: list[str]) -> tuple[str, str, str]:
    insert_columns, values_columns = create_placheholders(columns)
    return (
        insert_columns,
        values_columns,
        ", ".join([f"{column} = EXCLUDED.{column}" for column in columns]),
    )


@response_format(satext=True)
def create_insert_query_for_table(
    table: str, columns: list[str], on_conflict_column: str
) -> str:
    insert_columns, values_columns = create_placheholders(columns=columns)
    return f"""
    INSERT INTO {table} (
        {insert_columns}
    ) VALUES (
        {values_columns}
    ) ON CONFLICT ({on_conflict_column}) DO NOTHING
    """


@response_format(satext=True)
def create_insert_query_for_table_with_except_from_temp(
    table: str, temp_table: str, columns: str, on_conflict_column: str
) -> str:
    insert_columns, _, excluded_columns = create_placheholders_with_excluded(
        columns=columns
    )
    return f"""
    INSERT INTO {table} (
        {insert_columns}
    )
    SELECT
        {insert_columns}
    FROM {temp_table}
    EXCEPT
    SELECT
        {insert_columns}
    FROM {table}
    ON CONFLICT ({on_conflict_column}) DO UPDATE SET
        {excluded_columns},
        updated_at = NOW()
    """

@response_format(satext=True)
def create_truncate_query(table : str) -> str:
    return f"truncate {table}"

@response_format(satext=True)
async def read_from_sql_folder(filename : str):
    """Необходимо передавать только название файла
       Все файлы в папке по умолчанию .sql
    """
    async with aiofiles.open(
        MAIN_FOLDER.joinpath("sql", f"{filename}.sql")
    ) as f:
        return await f.read()