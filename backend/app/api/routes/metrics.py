"""GET /metrics: canonical metric catalogue for building forms."""

from __future__ import annotations

from fastapi import APIRouter

from app.domain.metrics import METRICS
from app.schemas.common import Page
from app.schemas.metrics import MetricOut

router = APIRouter(tags=["metrics"])


@router.get("/metrics", response_model=Page[MetricOut], summary="Metric catalogue")
def list_metrics() -> Page[MetricOut]:
    items = [
        MetricOut(
            metric_key=m.metric_key,
            display_name=m.display_name,
            category=m.category.value,
            canonical_unit=m.canonical_unit,
            description=m.description,
            plausible_min=m.plausible_min,
            plausible_max=m.plausible_max,
            freshness_hours=m.freshness_hours,
            allowed_source_types=sorted(s.value for s in m.allowed_source_types),
        )
        for m in METRICS
    ]
    return Page[MetricOut](items=items, total=len(items), limit=len(items), offset=0)
