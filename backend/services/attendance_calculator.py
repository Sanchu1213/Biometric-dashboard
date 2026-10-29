import re
import sys
from pathlib import Path
from datetime import datetime, time
from typing import Dict, Any, List, Optional

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    from ..config import (
        LATE_THRESHOLD_HOUR,
        LATE_THRESHOLD_MINUTE,
        EARLY_OUT_THRESHOLD_MINUTES,
        NC_KEYWORDS,
        ABSENT_STATUSES
    )
    from ..models.attendance import AttendanceRecord, AttendanceSummary
except (ImportError, ValueError):
    from config import (
        LATE_THRESHOLD_HOUR,
        LATE_THRESHOLD_MINUTE,
        EARLY_OUT_THRESHOLD_MINUTES,
        NC_KEYWORDS,
        ABSENT_STATUSES
    )
    from models.attendance import AttendanceRecord, AttendanceSummary

def parse_time_object(time_str: Optional[str]) -> Optional[time]:
    """
    Parses a time string into a datetime.time object.
    Supports formats:
      - 09:02 AM, 9:02 AM, 09:02:15 AM
      - 10:00 AM, 10:01 AM, 12:30 PM
      - 24-hour formats: 09:02, 10:01, 14:15, 14:15:00
    Returns None if invalid or absent placeholder (e.g., '--:--', '00:00', '').
    """
    if not time_str:
        return None
    cleaned = str(time_str).strip().upper()
    if cleaned in {"--:--", "-", "N/A", "00:00", "0:00", "00:00:00"}:
        return None

    # Common time formats
    formats = [
        "%I:%M %p",
        "%I:%M:%S %p",
        "%I:%M%p",
        "%I:%M:%S%p",
        "%H:%M",
        "%H:%M:%S"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt).time()
        except ValueError:
            continue
            
    # Regex fallback for loose formats e.g. "9.02 am" or "10:01"
    match = re.search(r"(\d{1,2})[:.](\d{2})(?::(\d{2}))?\s*(AM|PM)?", cleaned)
    if match:
        h, m = int(match.group(1)), int(match.group(2))
        s = int(match.group(3)) if match.group(3) else 0
        meridiem = match.group(4)
        if meridiem == "PM" and h < 12:
            h += 12
        elif meridiem == "AM" and h == 12:
            h = 0
        if 0 <= h < 24 and 0 <= m < 60 and 0 <= s < 60:
            return time(h, m, s)

    return None

def parse_duration_to_minutes(dur_str: Optional[str]) -> int:
    """
    Parses duration strings like '08:13', '6:59', '07:00:00', '6.5' into total minutes.
    Returns 0 if absent, empty, or unparseable.
    """
    if not dur_str:
        return 0
    cleaned = str(dur_str).strip()
    if cleaned in {"--:--", "-", "00:00", "0:00", "00:00:00", "0"}:
        return 0

    # HH:MM or HH:MM:SS
    match = re.search(r"(\d{1,2})[:.](\d{2})", cleaned)
    if match:
        hours = int(match.group(1))
        minutes = int(match.group(2))
        return (hours * 60) + minutes

    try:
        val = float(cleaned)
        return int(val * 60)
    except ValueError:
        return 0

def is_employee_absent(raw_status: str, raw_remarks: str = "") -> bool:
    """
    Determines if employee is absent according to rules:
    Statuses such as 'Absent', 'Absent (No OutPunch)' should be treated as absent.
    """
    status_lower = (raw_status or "").strip().lower()
    remarks_lower = (raw_remarks or "").strip().lower()

    for pattern in ABSENT_STATUSES:
        if pattern == "a":
            if status_lower in {"a", "ab", "abs"}:
                return True
        elif pattern in status_lower:
            return True

    return False

def is_non_compliant(raw_status: str, raw_remarks: str) -> bool:
    """
    Determines NC from Status/Remarks according to configurable keywords.
    """
    status_lower = (raw_status or "").strip().lower()
    remarks_lower = (raw_remarks or "").strip().lower()
    combined = f"{status_lower} {remarks_lower}"

    for kw in NC_KEYWORDS:
        if kw in combined:
            return True

    if status_lower in {"nc", "non compliant", "non-compliant"}:
        return True

    return False

def calculate_attendance_metrics(raw_records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Applies the full attendance calculation rules:
    - Presentee: determined primarily from Status field and valid attendance.
    - Absentee: 'Absent', 'Absent (No OutPunch)', etc.
    - Attendance Percentage: Presentees / Total * 100.
    - Late Login: InTime > 10:00 AM (10:00 = NOT late, 10:01 = late).
    - Early Out: Work Dur. < 7:00 hours (06:59 = Early Out, 07:00 = NOT Early Out).
      IMPORTANT: An absent employee with Work Dur. = 00:00 must NOT be classified as Early Out.
    - NC: Determined from Status/Remarks.
    - NC Percentage: NC Count / Total * 100.
    """
    total_employees = len(raw_records)
    
    presentees_list: List[str] = []
    absentees_list: List[str] = []
    late_logins_list: List[str] = []
    nc_list: List[str] = []
    early_out_list: List[str] = []
    
    processed_records: List[AttendanceRecord] = []
    
    late_threshold = time(LATE_THRESHOLD_HOUR, LATE_THRESHOLD_MINUTE, 0)
    
    for idx, rec in enumerate(raw_records, start=1):
        name = str(rec.get("name", "")).strip() or f"Employee {idx}"
        code = str(rec.get("code", "")).strip() or f"EMP{1000 + idx}"
        shift = str(rec.get("shift", "")).strip() or "GS (09:00 - 17:00)"
        in_time_str = str(rec.get("inTime", "")).strip() or "--:--"
        out_time_str = str(rec.get("outTime", "")).strip() or "--:--"
        work_dur_str = str(rec.get("workDur", "")).strip() or "00:00"
        ot_str = str(rec.get("ot", "")).strip() or "00:00"
        tot_dur_str = str(rec.get("totDur", "")).strip() or work_dur_str
        raw_status = str(rec.get("status", "")).strip()
        raw_remarks = str(rec.get("remarks", "")).strip()
        
        # 1. Absence Evaluation
        absent = is_employee_absent(raw_status, raw_remarks)
        
        # 2. Time & Duration Parsing
        t_in = parse_time_object(in_time_str)
        dur_mins = parse_duration_to_minutes(work_dur_str)
        
        # 3. Late Login Evaluation (ONLY when InTime > 10:00 AM, absent cannot be late)
        is_late = False
        if not absent and t_in is not None:
            if t_in > late_threshold:
                is_late = True
                
        # 4. Early Out Evaluation (Work Dur. < 7:00 hours = 420 mins. Absent or 00:00 is NOT early out)
        is_early_out = False
        if not absent and dur_mins > 0 and dur_mins < EARLY_OUT_THRESHOLD_MINUTES:
            is_early_out = True
            
        # 5. Non-Compliance (NC)
        is_nc = is_non_compliant(raw_status, raw_remarks)
        
        # 6. Final Status & Remarks Normalization
        if absent:
            computed_status = "Absent"
            if not raw_remarks:
                raw_remarks = "Absent"
            absentees_list.append(name)
        else:
            presentees_list.append(name)
            if is_late:
                computed_status = "Late"
                late_logins_list.append(name)
                if not raw_remarks or raw_remarks.lower() == "present":
                    raw_remarks = f"Late Login (In: {in_time_str})"
            elif is_early_out:
                computed_status = "Early Out"
                early_out_list.append(name)
                if not raw_remarks or raw_remarks.lower() == "present":
                    raw_remarks = f"Early Out ({work_dur_str} < 7:00 hrs)"
            elif is_nc:
                computed_status = "NC"
                if not raw_remarks:
                    raw_remarks = "Non-Compliance flagged"
            else:
                computed_status = "Present"
                if not raw_remarks:
                    raw_remarks = "On Time"

        if is_nc:
            nc_list.append(name)

        processed_records.append(
            AttendanceRecord(
                sno=idx,
                code=code,
                name=name,
                shift=shift,
                inTime=in_time_str,
                outTime=out_time_str,
                workDur=work_dur_str,
                ot=ot_str,
                totDur=tot_dur_str,
                status=computed_status,
                remarks=raw_remarks
            )
        )
        
    present_count = len(presentees_list)
    absent_count = len(absentees_list)
    att_pct = round((present_count / total_employees * 100), 2) if total_employees > 0 else 0.0
    nc_count = len(nc_list)
    nc_pct = round((nc_count / total_employees * 100), 2) if total_employees > 0 else 0.0
    late_count = len(late_logins_list)
    early_out_count = len(early_out_list)
    
    summary = AttendanceSummary(
        presentees=present_count,
        absentees=absent_count,
        attendancePercentage=att_pct,
        lateLogins=late_count,
        ncCount=nc_count,
        ncPercentage=nc_pct,
        earlyOutCount=early_out_count
    )
    
    return {
        "summary": summary,
        "presentees": presentees_list,
        "absentees": absentees_list,
        "lateLogins": late_logins_list,
        "ncEmployees": nc_list,
        "earlyOutEmployees": early_out_list,
        "records": processed_records
    }
