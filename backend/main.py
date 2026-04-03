from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from config import settings
from database import engine, Base
from routes import auth, inventory, sales, alerts, forecast, export, chat

# Create all tables
Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    description="Production-ready inventory optimization API",
    version="1.0.0",
)

# CORS — allow all origins for development; restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(inventory.router)
app.include_router(sales.router)
app.include_router(alerts.router)
app.include_router(forecast.router)
app.include_router(export.router)
app.include_router(chat.router)


@app.get("/")
def root():
    return {"message": f"{settings.APP_NAME} API is running", "version": "1.0.0", "status": "healthy"}


@app.get("/health")
def health():
    return {"status": "healthy", "app": settings.APP_NAME}
