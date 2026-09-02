from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger

from src.config import settings
from src.service import MosResService


async def _run_refresh() -> None:
    logger.info("scheduled refresh_all start")
    await MosResService().refresh_all()
    logger.info("scheduled refresh_all done")


def build_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        _run_refresh,
        trigger=IntervalTrigger(minutes=settings.REFRESH_INTERVAL_MINUTES),
        id="periodic-refresh",
        coalesce=True,
        max_instances=1,
        misfire_grace_time=600,
        replace_existing=True,
    )
    return scheduler
