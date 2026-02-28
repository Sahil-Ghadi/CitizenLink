from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import asyncio
import os

load_dotenv()

# Import routers (Firebase is initialized inside firebase_admin_init)
from routers import auth as auth_router
from routers import tickets as tickets_router
from routers import agents as agents_router
from routers import chat as chat_router
from routers import escalation as escalation_router


async def _escalation_scan_loop():
    """Background task: scan tickets for SLA breaches every 15 minutes."""
    from escalation import scan_and_escalate_all
    while True:
        try:
            scan_and_escalate_all()
        except Exception:
            pass  # Don't crash the server on scan errors
        await asyncio.sleep(15 * 60)  # 15 minutes


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_escalation_scan_loop())
    yield
    task.cancel()


app = FastAPI(
    title="CitizenLink API",
    description="Backend API for CitizenLink — Smart Government Complaint Portal",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the Next.js frontend
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router.router)
app.include_router(tickets_router.router)
app.include_router(agents_router.router)
app.include_router(chat_router.router)
app.include_router(escalation_router.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "CitizenLink API"}


@app.get("/")
async def root():
    return {"message": "CitizenLink API is running. See /docs for API documentation."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
