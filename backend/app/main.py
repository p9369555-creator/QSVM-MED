# File: backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.core.config import settings
from app.services.qsvm_engine import QSVMEngine


@asynccontextmanager
async def lifespan(app: FastAPI):
    engine = QSVMEngine()
    engine.load_models()
    app.state.engine = engine
    yield
    engine.unload_models()
    app.state.engine = None


app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "HEAD"],
    allow_headers=["*"],
)

app.include_router(api_router)