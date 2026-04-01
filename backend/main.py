from fastapi import FastAPI
from database import Base, engine
from fastapi.middleware.cors import CORSMiddleware

import models
from routers import pantry, recipes

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)

app.include_router(pantry.router)
app.include_router(recipes.router)

@app.get("/")
def root():
    return {"message": "It runs"}