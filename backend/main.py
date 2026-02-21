import asyncio
import time
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from .config import settings
from .database import init_db, async_session
from .auth.models import AuditLog
from .pools.models import ScrubSchedule
from .pools import zfs_executor

from .auth.router import router as auth_router
from .pools.router import router as pools_router
from .datasets.router import router as datasets_router
from .users.router import router as users_router
from .shares.router import router as shares_router
from .drives.router import router as drives_router
from .websockets.router import router as ws_router

logger = logging.getLogger(__name__)

# Methods that modify state and should be audited
AUDITED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


async def _session_cleanup_loop():
    """Purge expired sessions every hour."""
    from .auth.service import cleanup_expired_sessions

    while True:
        await asyncio.sleep(3600)
        try:
            async with async_session() as db:
                await cleanup_expired_sessions(db)
                await db.commit()
        except Exception as e:
            logger.warning("Session cleanup error: %s", e)


async def _scrub_scheduler_loop():
    """Check enabled scrub schedules every 60s and trigger when due."""
    while True:
        await asyncio.sleep(60)
        try:
            async with async_session() as db:
                result = await db.execute(
                    select(ScrubSchedule).where(ScrubSchedule.enabled == True)
                )
                schedules = list(result.scalars().all())
                now = datetime.now()

                for sched in schedules:
                    should_run = False

                    if sched.frequency == "daily":
                        should_run = now.hour == sched.hour and now.minute == sched.minute
                    elif sched.frequency == "weekly":
                        should_run = (
                            now.weekday() == sched.day_of_week
                            and now.hour == sched.hour
                            and now.minute == sched.minute
                        )
                    elif sched.frequency == "monthly":
                        should_run = (
                            now.day == sched.day_of_month
                            and now.hour == sched.hour
                            and now.minute == sched.minute
                        )

                    if not should_run:
                        continue

                    # Guard against re-triggering within same window
                    if sched.last_run and (time.time() - sched.last_run) < 120:
                        continue

                    try:
                        await zfs_executor.zpool_scrub(sched.pool)
                        sched.last_run = time.time()
                        sched.last_status = "started"
                        logger.info("Scrub started on pool %s by scheduler", sched.pool)
                    except Exception as e:
                        sched.last_run = time.time()
                        sched.last_status = f"error: {e}"
                        logger.warning("Scheduled scrub failed for %s: %s", sched.pool, e)

                await db.commit()
        except Exception as e:
            logger.warning("Scrub scheduler error: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Database URL: %s", settings.database_url)
    await init_db()
    logger.info("Application startup complete")
    cleanup_task = asyncio.create_task(_session_cleanup_loop())
    scrub_task = asyncio.create_task(_scrub_scheduler_loop())
    yield
    cleanup_task.cancel()
    scrub_task.cancel()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    response = await call_next(request)

    if request.method in AUDITED_METHODS and request.url.path.startswith("/api/v1"):
        try:
            async with async_session() as session:
                log_entry = AuditLog(
                    action=f"{request.method} {request.url.path}",
                    resource=request.url.path,
                    detail=f"status={response.status_code}",
                )
                session.add(log_entry)
                await session.commit()
        except Exception as e:
            logger.warning("Failed to write audit log: %s", e)

    return response


app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(pools_router, prefix="/api/v1/pools", tags=["pools"])
app.include_router(datasets_router, prefix="/api/v1/datasets", tags=["datasets"])
app.include_router(users_router, prefix="/api/v1/users", tags=["users"])
app.include_router(shares_router, prefix="/api/v1/shares", tags=["shares"])
app.include_router(drives_router, prefix="/api/v1/drives", tags=["drives"])
app.include_router(ws_router, prefix="/api/v1/ws", tags=["websocket"])


@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok"}
