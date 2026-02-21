from pydantic import BaseModel


class MetricDataPoint(BaseModel):
    timestamp: float
    value: float


class MetricSeriesResponse(BaseModel):
    metric_name: str
    tags: str | None
    data: list[MetricDataPoint]


class MetricsQueryResponse(BaseModel):
    series: list[MetricSeriesResponse]
