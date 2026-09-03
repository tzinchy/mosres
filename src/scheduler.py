import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger

from src.config import settings
from src.service import MosResService


async def _run_refresh() -> None:
    logger.info("scheduled refresh_all start")
    try:
        await MosResService().refresh_all()
        logger.info("scheduled refresh_all done")
    except Exception:
        # never let a failed refresh kill the job — it retries next interval
        logger.exception("scheduled refresh_all failed")


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
        # fire ~10s after start so a redeploy doesn't leave data stale for a
        # whole interval, then keep the fixed cadence
        next_run_time=datetime.datetime.now() + datetime.timedelta(seconds=10),
    )
    return scheduler
