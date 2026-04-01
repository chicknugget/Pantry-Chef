import requests
from sqlalchemy.orm import Session


from config import OLLAMA_BASE_URL
from services.pantry_service import get_pantry_summary

OLLAMA_MODEL = "llama3.2"

SYSTEM_PROMPT = """You are a personal chef assistant. You help users cook nutritious, 
filling meals using only the ingredients they already have in their pantry.

Rules you must follow:
- Only suggest recipes using ingredients listed in the pantry, you can add one or two additional ingredients outside the pantry
- Always mention exact quantities needed from the pantry
- Always use the exact formatted unit with which the items in the pantry were listed (e.g. if the pantry says "200g chicken", say "150g chicken" instead of "0.75 chicken breast")
- Flag if a recipe will use up a low stock item
- Keep recipes practical and simple unless asked otherwise
- Always include approximate nutrition info (calories, protein, carbs, fat)
- Format your response exactly as shown in the template

Response template:
RECIPE NAME: <name>
PREP TIME: <time>
SERVES: <number>

INGREDIENTS NEEDED FROM YOUR PANTRY:
- <ingredient1>: <amount needed>
- <ingredient2>: <amount needed>...
so on, as many you need but try to minimize the number of pantry ingredients used, no need to mention ingredients you didn't use from the pantry. 

INGREDIENTS NEEDED FROM OUTSIDE (if any, try to keep it iunder 2 ingredients):
- <ingredient1>: <amount needed>
- <ingredient2>: <amount needed>

STEPS:
1. <step>
2. <step>...and so on

NUTRITION (approximate per serving):
Calories: <number> | Protein: <number>g | Carbs: <number>g | Fat: <number>g

PANTRY IMPACT:
- <ingredient1> will drop to <remaining amount> after this meal
- <ingredient2> will drop to <remaining amount> after this meal...
and so on, always mention all the ingredients, how much quantity was required, and flag if any will be at low stock levels after cooking
"""


def build_prompt(user_message: str, pantry_summary: str, user_prefs: dict = None) -> str:
    prefs_text = ""
    if user_prefs:
        if user_prefs.get("dietary_goal"):
            prefs_text += f"\nUser dietary goal: {user_prefs['dietary_goal']}"
        if user_prefs.get("allergies"):
            prefs_text += f"\nUser allergies (NEVER include these): {', '.join(user_prefs['allergies'])}"
        if user_prefs.get("cuisine_preference"):
            prefs_text += f"\nPreferred cuisine: {user_prefs['cuisine_preference']}"

    return f"""{pantry_summary}
{prefs_text}

User request: {user_message}"""


def ask_ollama(prompt: str, system: str = SYSTEM_PROMPT) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "system": system,
        "prompt": prompt,
        "stream": False,
    }

    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json=payload,
            timeout=120
        )
        response.raise_for_status()
        return response.json()["response"]

    except requests.exceptions.ConnectionError:
        return "error: could not connect to Ollama. Make sure it is running with 'ollama serve'."
    except requests.exceptions.Timeout:
        return "error: Ollama took too long to respond. Try a simpler request."
    except Exception as e:
        return f"error: {str(e)}"


def get_recipe_suggestion(user_message: str, db: Session, user_prefs: dict = None) -> str:
    pantry_summary = get_pantry_summary(db)
    prompt = build_prompt(user_message, pantry_summary, user_prefs)
    return ask_ollama(prompt)


def chat_with_pantry(conversation_history: list, db: Session, user_prefs: dict = None) -> str:
    pantry_summary = get_pantry_summary(db)

    history_text = ""
    for msg in conversation_history[:-1]:
        role = "User" if msg["role"] == "user" else "Assistant"
        history_text += f"{role}: {msg['content']}\n"

    last_message = conversation_history[-1]["content"]
    prompt = f"{pantry_summary}\n\nConversation so far:\n{history_text}\nUser: {last_message}"

    return ask_ollama(prompt)