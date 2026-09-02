from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
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
        trigger=CronTrigger(hour=settings.REFRESH_HOUR, minute=0),
        id="daily-refresh",
        coalesce=True,
        max_instances=1,
        misfire_grace_time=3600,
        replace_existing=True,
    )
    return scheduler
