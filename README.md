# Pantry Chef 🍳

A personal pantry management app powered by a local LLM. Tell it what you have, ask what to cook — it figures out the rest.

---

## What it does

- Tracks everything in your pantry organized by category (meats, vegetables, dairy, miscellaneous)
- Suggests recipes using only what you already have
- Accounts for dietary goals, allergies, and cuisine preferences
- Links a YouTube video for every recipe it suggests
- Automatically deducts used ingredients when you cook something
- Flags low stock items and builds a shopping list
- Runs entirely on your machine — no cloud, no subscription, no data leaving your device

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Python, FastAPI |
| Database | PostgreSQL + SQLAlchemy |
| AI | Ollama (llama3.2) — local LLM |
| Recipe videos | YouTube Data API v3 |

---

## Project Structure

```
PANTRY_CHEF/
│
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # Environment variables
│   ├── database.py              # SQLAlchemy engine + session
│   │
│   ├── models/
│   │   ├── pantry_item.py       # Pantry items DB table
│   │   └── __init__.py
│   │
│   ├── schemas/
│   │   ├── pantry.py            # Pydantic request/response shapes
│   │   └── __init__.py
│   │
│   ├── routers/
│   │   ├── pantry.py            # CRUD endpoints + low stock + shopping list
│   │   ├── recipes.py           # LLM chat, recipe suggest, deduct
│   │   └── __init__.py
│   │
│   ├── services/
│   │   ├── pantry_service.py    # Low stock logic, pantry summary formatter
│   │   ├── llm_service.py       # Ollama connection + prompt builder
│   │   ├── recipe_service.py    # YouTube link fetcher
│   │   └── __init__.py
│   │
│   └── requirements.txt
│
└── frontend/
    ├── index.html               # Full single-page layout
    ├── style.css                # All styles
    ├── app.js                   # All API calls + DOM logic
    └── assets/                  # Images, icons, backgrounds
```

---

## Prerequisites

Make sure you have these installed before starting:

- Python 3.10+
- PostgreSQL
- [Ollama](https://ollama.com) — for running the LLM locally
- A Google account — for the YouTube API key (free)

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/pantry-chef.git
cd pantry-chef
```

### 2. Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Create the database

```bash
createdb pantry_chef
```

### 4. Set up environment variables

Create a `.env` file inside the `backend/` folder:

```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/pantry_chef
OLLAMA_BASE_URL=http://localhost:11434
YOUTUBE_API_KEY=your_youtube_api_key_here
```

To get a free YouTube API key: go to [console.cloud.google.com](https://console.cloud.google.com), create a project, enable **YouTube Data API v3**, and create an API key under Credentials.

### 5. Pull the LLM model

```bash
ollama pull llama3.2
```

### 6. Start Ollama

```bash
ollama serve
```

Leave this running in a separate terminal.

### 7. Start the backend

```bash
cd backend
uvicorn main:app --reload
```

The API will be live at `http://localhost:8000`. Visit `http://localhost:8000/docs` to see all endpoints.

### 8. Open the frontend

Open `frontend/index.html` directly in your browser. No build step needed.

---

## API Endpoints

### Pantry

| Method | Endpoint | Description |
|---|---|---|
| GET | `/pantry/` | Get all pantry items |
| POST | `/pantry/` | Add a new item |
| PATCH | `/pantry/{id}` | Update an item |
| DELETE | `/pantry/{id}` | Remove an item |
| GET | `/pantry/low-stock` | Items below their threshold |
| GET | `/pantry/shopping-list` | Formatted shopping list |

### Recipes

| Method | Endpoint | Description |
|---|---|---|
| POST | `/recipes/suggest` | Get a recipe suggestion |
| POST | `/recipes/chat` | Conversational recipe chat |
| POST | `/recipes/deduct` | Deduct ingredients after cooking |

---

## How the LLM works

When you ask for a recipe, the app:

1. Fetches your current pantry from the database
2. Formats it into a structured summary grouped by category
3. Injects your dietary goal, allergies, and preferences
4. Sends everything to Ollama (llama3.2) running locally
5. Gets back a formatted recipe with ingredients, steps, and nutrition info
6. Fetches a YouTube video link for the recipe name
7. Returns everything to the frontend in one response

The model runs entirely on your machine — nothing is sent to any external AI service.

---

## Using the app

**Adding items** — fill in the ingredient name, quantity, unit, category, and optionally a low stock threshold. Items appear as colour-coded tupperwares on the shelf (orange = meat, green = vegetables, blue = dairy, yellow = miscellaneous).

**Getting recipes** — go to the Recipes section, optionally set dietary goals or allergies, and chat naturally. Ask things like *"what can I make for a quick high protein breakfast?"*

**After cooking** — click **"I made this — update my pantry"** after a recipe is shown. The app extracts the ingredients used and automatically subtracts them from your pantry.

**Shopping list** — items that drop below their threshold or reach zero quantity appear here automatically. You can also add items manually and download the list as a text file.

---

## Notes

- First LLM response is slow (~60–120 seconds) while the model loads into memory. Subsequent responses are faster.
- The YouTube API has a free quota of 10,000 units/day (~100 searches). More than enough for personal use.
- This is a single-user app with no authentication — built as a personal tool and portfolio project.

---

## License

MIT — do whatever you want with it.
