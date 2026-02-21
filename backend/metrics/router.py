from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..dependencies import get_current_user
from .schemas import MetricsQueryResponse
from .service import VALID_RANGES, query_metrics

router = APIRouter()


@router.get("", response_model=MetricsQueryResponse)
async def get_metrics(
    metric_names: str = Query(..., description="Comma-separated metric names"),
    range: str = Query("1h", description="Time range: 1m, 5m, 15m, 30m, 1h, 24h, 7d"),
    pool: str | None = Query(None, description="Filter by pool name"),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
) -> MetricsQueryResponse:
    if range not in VALID_RANGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid range. Must be one of: {', '.join(sorted(VALID_RANGES))}",
        )
    names = [n.strip() for n in metric_names.split(",") if n.strip()]
    if not names:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="metric_names must not be empty",
        )
    return await query_metrics(db, names, range, pool)
