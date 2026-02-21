"""Query and downsample collected metrics."""

import time
from collections import defaultdict

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Metric
from .schemas import MetricDataPoint, MetricSeriesResponse, MetricsQueryResponse

# range string → (seconds lookback, bucket size for downsampling or None for raw)
_RANGE_MAP: dict[str, tuple[int, int | None]] = {
    "1m": (60, None),
    "5m": (300, None),
    "15m": (900, None),
    "30m": (1800, None),
    "1h": (3600, None),
    "24h": (86400, 300),      # 5-minute buckets
    "7d": (604800, 3600),     # 1-hour buckets
}

VALID_RANGES = set(_RANGE_MAP.keys())


async def query_metrics(
    db: AsyncSession,
    names: list[str],
    time_range: str,
    pool: str | None = None,
) -> MetricsQueryResponse:
    lookback, bucket = _RANGE_MAP[time_range]
    since = time.time() - lookback

    if bucket is not None:
        # Downsampled query: average values per time bucket
        bucket_expr = (func.cast(Metric.timestamp / bucket, type_=Metric.timestamp.type) * bucket)
        stmt = (
            select(
                Metric.metric_name,
                Metric.tags,
                bucket_expr.label("bucket_ts"),
                func.avg(Metric.metric_value).label("avg_value"),
            )
            .where(Metric.metric_name.in_(names))
            .where(Metric.timestamp >= since)
        )
        if pool is not None:
            stmt = stmt.where(Metric.tags == pool)
        stmt = stmt.group_by(Metric.metric_name, Metric.tags, "bucket_ts").order_by("bucket_ts")

        result = await db.execute(stmt)
        rows = result.all()

        grouped: dict[tuple[str, str | None], list[MetricDataPoint]] = defaultdict(list)
        for metric_name, tags, bucket_ts, avg_value in rows:
            grouped[(metric_name, tags)].append(
                MetricDataPoint(timestamp=float(bucket_ts), value=round(float(avg_value), 2))
            )
    else:
        # Raw query
        stmt = (
            select(Metric)
            .where(Metric.metric_name.in_(names))
            .where(Metric.timestamp >= since)
        )
        if pool is not None:
            stmt = stmt.where(Metric.tags == pool)
        stmt = stmt.order_by(Metric.timestamp)

        result = await db.execute(stmt)
        metrics = result.scalars().all()

        grouped = defaultdict(list)
        for m in metrics:
            grouped[(m.metric_name, m.tags)].append(
                MetricDataPoint(timestamp=m.timestamp, value=m.metric_value)
            )

    series = [
        MetricSeriesResponse(metric_name=name, tags=tags, data=points)
        for (name, tags), points in grouped.items()
    ]
    return MetricsQueryResponse(series=series)
