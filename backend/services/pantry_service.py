from sqlalchemy.orm import Session

from models.pantry_item import PantryItem


def get_all_items(db: Session):
    return db.query(PantryItem).all()


def get_low_stock_items(db: Session):
    return db.query(PantryItem).filter(
        PantryItem.quantity <= PantryItem.low_threshold,
        PantryItem.low_threshold > 0
    ).all()

def get_pantry_summary(db: Session) -> str:
    items = get_all_items(db)

    if not items:
        return "The pantry is empty."

    grouped = {}
    for item in items:
        category = item.category or "other"
        if category not in grouped:
            grouped[category] = []
        grouped[category].append(item)

    lines = ["Current pantry contents:"]
    for category, items_in_cat in grouped.items():
        lines.append(f"\n{category.upper()}:")
        for item in items_in_cat:
            lines.append(f"  - {item.name}: {item.quantity} {item.unit}")

    low_stock = get_low_stock_items(db)
    if low_stock:
        lines.append("\nLOW STOCK (running out soon):")
        for item in low_stock:
            lines.append(f"  - {item.name} ({item.quantity} {item.unit} remaining)")

    return "\n".join(lines)


def get_shopping_list(db: Session) -> list:
    low_items = get_low_stock_items(db)
    return [
        {
            "name": item.name,
            "current_quantity": item.quantity,
            "unit": item.unit,
            "low_threshold": item.low_threshold
        }
        for item in low_items
    ]


def deduct_ingredients(db: Session, ingredients: list[dict]):
    updated = []
    not_found = []

    for ingredient in ingredients:
        name = ingredient.get("name", "").lower().strip()
        amount = ingredient.get("amount", 0)

        db_item = db.query(PantryItem).filter(
            PantryItem.name == name
        ).first()

        if not db_item:
            not_found.append(name)
            continue

        db_item.quantity = max(0, db_item.quantity - amount)
        updated.append(db_item.name)

    db.commit()
    return {"updated": updated, "not_found": not_found}