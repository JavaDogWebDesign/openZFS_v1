import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db, async_session
from .auth.models import AuditLog

from .auth.router import router as auth_router
from .pools.router import router as pools_router
from .datasets.router import router as datasets_router
from .users.router import router as users_router
from .shares.router import router as shares_router
from .websockets.router import router as ws_router

logger = logging.getLogger(__name__)

# Methods that modify state and should be audited
AUDITED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    from .auth.service import create_default_admin
    async with async_session() as session:
        await create_default_admin(session)
        await session.commit()
    yield


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
app.include_router(ws_router, prefix="/api/v1/ws", tags=["websocket"])


@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok"}
