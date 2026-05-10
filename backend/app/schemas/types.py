from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class BrandVoice(BaseModel):
    tone: str | None = None
    forbidden: list[str] = Field(default_factory=list)
    catchphrases: list[str] = Field(default_factory=list)


class BusinessGoal(BaseModel):
    primary_cta: str | None = None
    link: str | None = None


class NicheData(BaseModel):
    description: str | None = None
    persona: str | None = None
    brand_voice: BrandVoice = Field(default_factory=BrandVoice)
    pillars: list[str] = Field(default_factory=list)
    benchmarks: list[str] = Field(default_factory=list)
    business_goal: BusinessGoal = Field(default_factory=BusinessGoal)


class AISettings(BaseModel):
    proactivity_level: int | None = None
    response_style: str | None = None
    preferences: dict[str, Any] = Field(default_factory=dict)
