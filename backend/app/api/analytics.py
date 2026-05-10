from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas import DailyMetricRead

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/metrics/{account_id}", response_model=list[DailyMetricRead])
async def get_account_metrics(account_id: str, db: AsyncSession = Depends(get_db)):
    """Get daily metrics for a social account (bronze/silver layers)."""
    # TODO: Implement medallion architecture queries
    pass


@router.post("/metrics/aggregate")
async def aggregate_metrics(db: AsyncSession = Depends(get_db)):
    """Trigger metric aggregation from bronze to silver layer."""
    # TODO: Implement background task
    pass
