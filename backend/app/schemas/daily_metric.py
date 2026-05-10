from datetime import date, datetime
from uuid import UUID

from pydantic import Field

from .base import ORMBase


class DailyMetricCreate(ORMBase):
    account_id: UUID
    record_date: date
    bronze_raw: dict = Field(default_factory=dict)
    silver_normalized: dict = Field(default_factory=dict)


class DailyMetricRead(ORMBase):
    id: UUID
    account_id: UUID
    record_date: date
    bronze_raw: dict
    silver_normalized: dict
    created_at: datetime
    updated_at: datetime
