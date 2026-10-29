from typing import List, Dict, Any

def clean_and_normalize_records(raw_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Cleans and validates parsed table records:
    - Removes empty rows or header echoes
    - Strips spaces and normalizes column keys
    - Discards summary / total footer rows
    """
    cleaned: List[Dict[str, Any]] = []
    
    for row in raw_rows:
        # Check if the row has any substantial data
        name = str(row.get("name", "")).strip()
        code = str(row.get("code", "")).strip()
        status = str(row.get("status", "")).strip()
        
        # If neither name nor code is present, skip
        if not name and not code:
            continue
            
        # Skip header duplicates that might have leaked in from multi-page PDFs
        lower_name = name.lower()
        lower_code = code.lower()
        if lower_name in {"name", "employee name", "emp name"} or lower_code in {"e. code", "ecode", "emp code"}:
            continue
            
        # Skip summary rows (e.g., "Total Present: 204", "Total: 216")
        if "total" in lower_name or "summary" in lower_name or "grand total" in lower_code:
            continue
            
        cleaned.append({
            "name": name,
            "code": code,
            "shift": str(row.get("shift", "GS")).strip() or "GS (09:00 - 17:00)",
            "inTime": str(row.get("inTime", "--:--")).strip(),
            "outTime": str(row.get("outTime", "--:--")).strip(),
            "workDur": str(row.get("workDur", "00:00")).strip(),
            "ot": str(row.get("ot", "00:00")).strip(),
            "totDur": str(row.get("totDur", "00:00")).strip(),
            "status": status,
            "remarks": str(row.get("remarks", "")).strip()
        })
        
    return cleaned
