from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func

from database import Base

class PantryItem(Base):
    __tablename__ = "pantry_items"

    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String, nullable=False)
    quantity     = Column(Float, nullable=False)
    unit         = Column(String, nullable=False)        
    category     = Column(String, nullable=True)        
    low_threshold = Column(Float, default=0.0)
    added_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())