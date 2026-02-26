import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import apis, assets, auth, health
from utils.config import settings

logging.getLogger("uvicorn").propagate = True
logging.getLogger("uvicorn.error").propagate = True
logging.getLogger("uvicorn.access").propagate = True

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS, 
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
)

app.include_router(auth.router)
app.include_router(apis.router)
app.include_router(assets.router)
app.include_router(health.router)

