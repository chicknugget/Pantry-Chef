from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

class PantryItemCreate(BaseModel): #add item(no id, no timestamps)
    name: str = Field(..., min_length = 1, max_length=100)
    quantity: float = Field(..., gt=0)
    unit: str = Field(..., min_length = 1, max_length=25)
    category: Optional[str] = None
    low_threshold: Optional[float] = Field(default=0.0, ge=0)

    @field_validator("name", "unit")
    @classmethod
    def strip_whitespace(cls, v):
        return v.strip().lower()


class PantryItemUpdate(BaseModel): #edit item (optional)
    name: Optional[str] = Field(None, min_length = 1, max_length=100)
    quantity: Optional[float] = Field(None, gt=0)
    unit: Optional[str] = Field(None, min_length = 1, max_length=25)
    category: Optional[str] = None
    low_threshold: Optional[float] = Field(None, ge=0)

class PantryItemOut(BaseModel): #delete item(inclues id, timestamp)
    id: int
    name: str
    quantity: float
    unit: str
    category: Optional[str]
    low_threshold: float
    added_at: datetime
    updated_at: Optional[datetime]

    model_config  = {"from_attributes": True}