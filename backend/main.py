import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    from .config import ALLOWED_ORIGINS
    from .routes.attendance import router as attendance_router
except (ImportError, ValueError):
    from config import ALLOWED_ORIGINS
    from routes.attendance import router as attendance_router

app = FastAPI(
    title="Navkis College Biometric Attendance API",
    description="Backend API for parsing biometric logs and calculating attendance metrics",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(attendance_router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "Biometric Attendance API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
