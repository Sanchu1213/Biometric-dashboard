import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Attendance evaluation rules
LATE_THRESHOLD_HOUR = 10
LATE_THRESHOLD_MINUTE = 0  # 10:00 is NOT late; 10:01 is late

EARLY_OUT_THRESHOLD_MINUTES = 7 * 60  # 420 minutes (7 hours); < 7:00 is Early Out

NC_KEYWORDS = [
    "nc",
    "missing outpunch",
    "missing out-punch",
    "missing inpunch",
    "missing in-punch",
    "mismatch",
    "anomaly",
    "punch anomaly",
    "no outpunch",
    "no out punch"
]

ABSENT_STATUSES = [
    "absent",
    "absent (no outpunch)",
    "absent (unexcused)",
    "absent (leave approved)",
    "on leave",
    "leave",
    "a"
]
