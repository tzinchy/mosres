import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger

from src.config import settings
from src.service import MosResService
from src.torgi import TorgiService
from src.torgi_objects import TorgiObjectsService


async def _run_refresh() -> None:
    logger.info("scheduled refresh_all start")
    try:
        await MosResService().refresh_all()
        logger.info("scheduled refresh_all done")
    except Exception:
        # never let a failed refresh kill the job — it retries next interval
        logger.exception("scheduled refresh_all failed")


async def _run_torgi_refresh() -> None:
    """Лоты torgi.mos.ru — отдельная джоба: падение одного источника не должно
    останавливать обновление другого."""
    logger.info("scheduled torgi refresh start")
    try:
        await TorgiService().update_all_data()
        logger.info("scheduled torgi refresh done")
    except Exception:
        logger.exception("scheduled torgi refresh failed")


async def _run_torgi_objects_refresh() -> None:
    """Лоты недвижимости torgi.mos.ru — третья независимая джоба. Карточки
    архива дочитываются порциями, поэтому первые прогоны идут долго."""
    logger.info("scheduled torgi objects refresh start")
    try:
        result = await TorgiObjectsService().update_all_data(
            detail_budget=settings.TORGI_OBJECTS_DETAIL_BUDGET
        )
        logger.info(f"scheduled torgi objects refresh done: {result}")
    except Exception:
        logger.exception("scheduled torgi objects refresh failed")


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
    if settings.TORGI_ENABLED:
        scheduler.add_job(
            _run_torgi_refresh,
            trigger=IntervalTrigger(minutes=settings.TORGI_REFRESH_INTERVAL_MINUTES),
            id="periodic-torgi-refresh",
            coalesce=True,
            max_instances=1,
            misfire_grace_time=600,
            replace_existing=True,
            # на минуту позже первой джобы, чтобы два источника не стартовали
            # одновременно на холодном старте
            next_run_time=datetime.datetime.now() + datetime.timedelta(seconds=70),
        )
    if settings.TORGI_OBJECTS_ENABLED:
        scheduler.add_job(
            _run_torgi_objects_refresh,
            trigger=IntervalTrigger(
                minutes=settings.TORGI_OBJECTS_REFRESH_INTERVAL_MINUTES
            ),
            id="periodic-torgi-objects-refresh",
            coalesce=True,
            max_instances=1,
            misfire_grace_time=600,
            replace_existing=True,
            # ещё минутой позже: три источника не стартуют одновременно
            next_run_time=datetime.datetime.now() + datetime.timedelta(seconds=130),
        )
    return scheduler
