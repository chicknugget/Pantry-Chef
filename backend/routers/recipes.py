from fastapi import APIRouter, Depends
import requests
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from services.llm_service import get_recipe_suggestion, chat_with_pantry
from services.pantry_service import deduct_ingredients
from config import YOUTUBE_API_KEY

router = APIRouter(prefix="/recipes", tags=["recipes"])


def get_youtube_link(recipe_name: str) -> str:
    if not YOUTUBE_API_KEY:
        query = recipe_name.strip().replace(" ", "+")
        return f"https://www.youtube.com/results?search_query={query}+recipe"

    try:
        response = requests.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "q": f"{recipe_name} recipe",
                "maxResults": 1,
                "type": "video",
                "videoDuration": "medium",
                "relevanceLanguage": "en",
                "key": YOUTUBE_API_KEY
            },
            timeout=10
        )
        data = response.json()
        items = data.get("items", [])
        if items:
            video_id = items[0]["id"]["videoId"]
            return f"https://www.youtube.com/watch?v={video_id}"
    except Exception:
        pass

    query = recipe_name.strip().replace(" ", "+")
    return f"https://www.youtube.com/results?search_query={query}+recipe"


def extract_recipe_name(llm_response: str) -> str:
    for line in llm_response.splitlines():
        if line.startswith("RECIPE NAME:"):
            return line.replace("RECIPE NAME:", "").strip()
    return "this recipe"


class RecipeRequest(BaseModel):
    message: str
    dietary_goal: Optional[str] = None
    allergies: Optional[list[str]] = None
    cuisine_preference: Optional[str] = None


class ChatRequest(BaseModel):
    history: list[dict]
    dietary_goal: Optional[str] = None
    allergies: Optional[list[str]] = None


class DeductRequest(BaseModel):
    ingredients: list[dict]


@router.post("/suggest")
def suggest_recipe(request: RecipeRequest, db: Session = Depends(get_db)):
    user_prefs = {
        "dietary_goal": request.dietary_goal,
        "allergies": request.allergies,
        "cuisine_preference": request.cuisine_preference
    }

    response = get_recipe_suggestion(request.message, db, user_prefs)

    recipe_name = extract_recipe_name(response)
    youtube_link = get_youtube_link(recipe_name)

    return {
        "recipe": response,
        "youtube_link": youtube_link,
        "recipe_name": recipe_name
    }


@router.post("/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    user_prefs = {
        "dietary_goal": request.dietary_goal,
        "allergies": request.allergies,
    }

    response = chat_with_pantry(request.history, db, user_prefs)

    recipe_name = extract_recipe_name(response)
    youtube_link = get_youtube_link(recipe_name) if recipe_name != "this recipe" else None

    return {
        "response": response,
        "youtube_link": youtube_link,
        "recipe_name": recipe_name
    }


@router.post("/deduct")
def deduct(request: DeductRequest, db: Session = Depends(get_db)):
    result = deduct_ingredients(db, request.ingredients)
    return result