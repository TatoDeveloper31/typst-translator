from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import translation

app = FastAPI(title="Typst Translator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(translation.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
