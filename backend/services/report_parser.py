import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
import openpyxl
import xlrd
from pypdf import PdfReader

# Flexible column keyword mappings
COLUMN_PATTERNS = {
    "sno": [r"^s\.?\s*no\.?", r"^sl\.?\s*no\.?", r"^sr\.?\s*no\.?", r"^serial"],
    "code": [r"^e\.?\s*code", r"^emp\.?\s*code", r"^employee\s*code", r"^ecode", r"^emp_code", r"^id$"],
    "name": [r"^name$", r"^employee\s*name", r"^emp\s*name", r"^faculty\s*name", r"^staff\s*name"],
    "shift": [r"^shift", r"^shift\s*name", r"^shift\s*details"],
    "inTime": [r"^in\s*time", r"^intime", r"^in-time", r"^punch\s*in", r"^first\s*in"],
    "outTime": [r"^out\s*time", r"^outtime", r"^out-time", r"^punch\s*out", r"^last\s*out"],
    "workDur": [r"^work\s*dur\.?", r"^work\s*duration", r"^workdur", r"^work\s*hrs"],
    "ot": [r"^ot$", r"^o\.t\.?", r"^over\s*time", r"^overtime"],
    "totDur": [r"^tot\.?\s*dur\.?", r"^total\s*dur\.?", r"^total\s*duration", r"^totdur"],
    "status": [r"^status", r"^att\.?\s*status", r"^attendance\s*status"],
    "remarks": [r"^remarks?", r"^comments?", r"^notes?"]
}

def identify_column(header_cell: str) -> Optional[str]:
    """Identifies which field a column header cell corresponds to."""
    clean_val = str(header_cell).strip().lower()
    clean_val = re.sub(r"\s+", " ", clean_val)
    for field, patterns in COLUMN_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, clean_val, re.IGNORECASE):
                return field
    return None

def extract_date_from_text(text: str, filename: str) -> str:
    """Extracts attendance date from text or filename, with fallback to today's date."""
    date_patterns = [
        r"(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})",
        r"(?:Date|Attendance Date|Report Date)[\s:]+([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4})",
        r"(\d{4}[-/.]\d{2}[-/.]\d{2})",
        r"(\d{2}[-/.]\d{2}[-/.]\d{4})"
    ]
    
    # Search within text content first
    for pat in date_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            raw_date = m.group(1).strip()
            # Try formatting cleanly if digits
            try:
                for fmt in ["%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%d.%m.%Y", "%d %B %Y"]:
                    try:
                        dt = datetime.strptime(raw_date, fmt)
                        return dt.strftime("%d %B %Y")
                    except ValueError:
                        pass
            except Exception:
                pass
            return raw_date

    # Search within filename
    for pat in date_patterns:
        m = re.search(pat, filename, re.IGNORECASE)
        if m:
            raw_date = m.group(1).strip()
            return raw_date

    # Default fallback
    return datetime.now().strftime("%d %B %Y")

def parse_xlsx(file_path: Path) -> Tuple[List[Dict[str, Any]], str]:
    wb = openpyxl.load_workbook(file_path, data_only=True)
    sheet = wb.active
    
    header_col_map: Dict[int, str] = {}
    header_row_idx = None
    all_text_for_date = ""
    raw_records = []
    
    for row_idx, row in enumerate(sheet.iter_rows(values_only=True), start=1):
        row_str = " ".join([str(c) for c in row if c is not None])
        all_text_for_date += " " + row_str
        
        # Try finding header row if not found yet
        if header_row_idx is None:
            temp_map = {}
            for col_idx, cell in enumerate(row):
                if cell is not None:
                    field = identify_column(str(cell))
                    if field:
                        temp_map[col_idx] = field
            # If at least 3 recognizable headers (e.g. name, status/code, intime) are found
            if ("name" in temp_map.values() or "code" in temp_map.values()) and len(temp_map) >= 3:
                header_col_map = temp_map
                header_row_idx = row_idx
                continue
        else:
            # Parse row data
            if not any(row):
                continue
            rec: Dict[str, Any] = {}
            for col_idx, field in header_col_map.items():
                if col_idx < len(row):
                    val = row[col_idx]
                    if val is not None:
                        # Format datetime or time if Excel returns python time/datetime
                        if hasattr(val, "strftime"):
                            val = val.strftime("%I:%M %p" if hasattr(val, "hour") else "%Y-%m-%d")
                        rec[field] = str(val).strip()
                    else:
                        rec[field] = ""
            if rec.get("name") or rec.get("code"):
                raw_records.append(rec)

    extracted_date = extract_date_from_text(all_text_for_date, file_path.name)
    return raw_records, extracted_date

def parse_xls(file_path: Path) -> Tuple[List[Dict[str, Any]], str]:
    wb = xlrd.open_workbook(file_path)
    sheet = wb.sheet_by_index(0)
    
    header_col_map: Dict[int, str] = {}
    header_row_idx = None
    all_text_for_date = ""
    raw_records = []
    
    for row_idx in range(sheet.nrows):
        row = sheet.row_values(row_idx)
        row_str = " ".join([str(c) for c in row if c is not None])
        all_text_for_date += " " + row_str
        
        if header_row_idx is None:
            temp_map = {}
            for col_idx, cell in enumerate(row):
                if cell:
                    field = identify_column(str(cell))
                    if field:
                        temp_map[col_idx] = field
            if ("name" in temp_map.values() or "code" in temp_map.values()) and len(temp_map) >= 3:
                header_col_map = temp_map
                header_row_idx = row_idx
                continue
        else:
            if not any(row):
                continue
            rec: Dict[str, Any] = {}
            for col_idx, field in header_col_map.items():
                if col_idx < len(row):
                    val = row[col_idx]
                    rec[field] = str(val).strip() if val is not None else ""
            if rec.get("name") or rec.get("code"):
                raw_records.append(rec)
                
    extracted_date = extract_date_from_text(all_text_for_date, file_path.name)
    return raw_records, extracted_date

def parse_pdf(file_path: Path) -> Tuple[List[Dict[str, Any]], str]:
    reader = PdfReader(file_path)
    full_text = ""
    for page in reader.pages:
        txt = page.extract_text()
        if txt:
            full_text += "\n" + txt

    extracted_date = extract_date_from_text(full_text, file_path.name)
    lines = [line.strip() for line in full_text.splitlines() if line.strip()]
    
    header_idx = None
    raw_records: List[Dict[str, Any]] = []

    # First attempt: scan lines for table header row
    for idx, line in enumerate(lines):
        line_lower = line.lower()
        if ("e. code" in line_lower or "ecode" in line_lower or "emp code" in line_lower) and "name" in line_lower:
            header_idx = idx
            break

    # Look for tabular employee entries in PDF text
    # Sample format: 1 NCENG1001 Aarav Sharma GS (09:00 - 17:00) 09:02 AM 05:15 PM 08:13 00:13 08:13 Present On Time
    emp_pattern = re.compile(
        r"^(\d+)\s+([A-Za-z0-9_-]+)\s+([A-Za-z\s.'-]+?)\s+(GS[^\d]*|\w+)\s+"
        r"(\d{1,2}:\d{2}\s*(?:AM|PM)?|--:--)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?|--:--)\s+"
        r"(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+"
        r"([A-Za-z\s()]+?)(?:\s{2,}|\s+)([A-Za-z0-9\s()<>.,:-]+)?$",
        re.IGNORECASE
    )

    for line in lines:
        match = emp_pattern.match(line)
        if match:
            sno, code, name, shift, in_time, out_time, work_dur, ot, tot_dur, status, remarks = match.groups()
            raw_records.append({
                "sno": sno.strip(),
                "code": code.strip(),
                "name": name.strip(),
                "shift": shift.strip(),
                "inTime": in_time.strip(),
                "outTime": out_time.strip(),
                "workDur": work_dur.strip(),
                "ot": ot.strip(),
                "totDur": tot_dur.strip(),
                "status": status.strip(),
                "remarks": (remarks or "").strip()
            })
            continue

        # Flexible fallback regex if spacing varies
        # Matches: [SNo] [Code] [Name] ... [InTime] [OutTime] [WorkDur] [Status]
        tokens = line.split()
        if len(tokens) >= 5:
            # Check if line begins with serial number and employee code
            if tokens[0].isdigit() and re.match(r"^[A-Za-z0-9_-]{3,}$", tokens[1]):
                sno = tokens[0]
                code = tokens[1]
                # Find time token indices
                time_indices = [i for i, t in enumerate(tokens) if re.search(r"(\d{1,2}:\d{2}|--:--)", t)]
                if len(time_indices) >= 2:
                    first_time_idx = time_indices[0]
                    name_tokens = tokens[2:first_time_idx]
                    # Filter out shift token if last in name_tokens
                    shift_val = "GS (09:00 - 17:00)"
                    if name_tokens and name_tokens[-1].upper() in {"GS", "NS", "MS"}:
                        shift_val = name_tokens.pop()
                    name = " ".join(name_tokens)
                    in_time = tokens[first_time_idx]
                    out_time = tokens[time_indices[1]] if len(time_indices) > 1 else "--:--"
                    work_dur = tokens[time_indices[2]] if len(time_indices) > 2 else "00:00"
                    
                    status = "Present"
                    remarks = ""
                    # Remaining tokens after durations
                    remaining = tokens[time_indices[-1] + 1:]
                    if remaining:
                        status = remaining[0]
                        remarks = " ".join(remaining[1:])
                        
                    raw_records.append({
                        "sno": sno,
                        "code": code,
                        "name": name,
                        "shift": shift_val,
                        "inTime": in_time,
                        "outTime": out_time,
                        "workDur": work_dur,
                        "ot": "00:00",
                        "totDur": work_dur,
                        "status": status,
                        "remarks": remarks
                    })

    return raw_records, extracted_date

def parse_report_file(file_path: Path, filename: str) -> Tuple[List[Dict[str, Any]], str]:
    """
    Main parser entrypoint.
    Dispatches to appropriate parser based on file extension.
    Validates required columns and records.
    """
    ext = file_path.suffix.lower()
    
    if ext == ".xlsx":
        records, date_str = parse_xlsx(file_path)
    elif ext == ".xls":
        records, date_str = parse_xls(file_path)
    elif ext == ".pdf":
        records, date_str = parse_pdf(file_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}. Only PDF, XLS, and XLSX are supported.")

    if not records:
        raise ValueError("No valid attendance records found in the uploaded report.")

    return records, date_str
