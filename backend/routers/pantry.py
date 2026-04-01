from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from schemas.pantry import PantryItemCreate, PantryItemOut, PantryItemUpdate
from database import get_db
from models.pantry_item import PantryItem
from services.pantry_service import get_low_stock_items, get_shopping_list

router = APIRouter(prefix = "/pantry", tags = ["pantry"])

@router.post("/", response_model=PantryItemOut)
def add_item(item: PantryItemCreate, db: Session = Depends(get_db)):
    db_item = PantryItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/", response_model=List[PantryItemOut])
def get_pantry(db: Session = Depends(get_db)):
    return db.query(PantryItem).all()

@router.get("/low-stock", response_model=List[PantryItemOut])
def low_stock(db: Session = Depends(get_db)):
    return get_low_stock_items(db)


@router.get("/shopping-list")
def shopping_list(db: Session = Depends(get_db)):
    return get_shopping_list(db)


@router.patch("/{item_id}", response_model=PantryItemOut)
def update_item(item_id: int, updates: PantryItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(PantryItem).filter(PantryItem.id == item_id).first()

    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    for field, value in updates.model_dump(exclude_none=True).items():
        setattr(db_item, field, value)

    db.commit()
    db.refresh(db_item)
    return db_item


@router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(PantryItem).filter(PantryItem.id == item_id).first()

    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(db_item)
    db.commit()
    return {"message": f"{db_item.name} removed from pantry"}
