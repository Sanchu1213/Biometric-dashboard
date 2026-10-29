import shutil
import sys
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    from ..config import UPLOAD_DIR
    from ..models.attendance import AttendanceResponse, ReportMetadata
    from ..services.report_parser import parse_report_file
    from ..services.attendance_processor import clean_and_normalize_records
    from ..services.attendance_calculator import calculate_attendance_metrics
except (ImportError, ValueError):
    from config import UPLOAD_DIR
    from models.attendance import AttendanceResponse, ReportMetadata
    from services.report_parser import parse_report_file
    from services.attendance_processor import clean_and_normalize_records
    from services.attendance_calculator import calculate_attendance_metrics

router = APIRouter(prefix="/attendance", tags=["Attendance"])

SUPPORTED_EXTENSIONS = {".pdf", ".xls", ".xlsx"}

@router.post("/upload", response_model=AttendanceResponse)
async def upload_attendance_report(file: UploadFile = File(...)):
    """
    Upload and parse biometric attendance report (PDF, XLS, XLSX).
    Returns calculated attendance metrics, summary KPIs, employee lists, and records.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to Process Attendance Report: Missing file name."
        )

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to Process Attendance Report: Unsupported file type '{file_ext}'. Allowed formats: PDF, XLS, XLSX."
        )

    saved_file_path = UPLOAD_DIR / file.filename
    try:
        with open(saved_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to Process Attendance Report: Failed to save uploaded file. Error: {str(e)}"
        )
    finally:
        await file.close()

    try:
        raw_rows, report_date = parse_report_file(saved_file_path, file.filename)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unable to Process Attendance Report: {str(ve)}"
        )
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to Process Attendance Report: Parsing failed ({str(ex)})"
        )

    cleaned_rows = clean_and_normalize_records(raw_rows)
    if not cleaned_rows:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unable to Process Attendance Report: No valid attendance records could be extracted."
        )

    metrics = calculate_attendance_metrics(cleaned_rows)
    
    report_meta = ReportMetadata(
        date=report_date,
        fileName=file.filename,
        totalEmployees=len(metrics["records"])
    )

    return AttendanceResponse(
        report=report_meta,
        summary=metrics["summary"],
        presentees=metrics["presentees"],
        absentees=metrics["absentees"],
        lateLogins=metrics["lateLogins"],
        ncEmployees=metrics["ncEmployees"],
        earlyOutEmployees=metrics["earlyOutEmployees"],
        records=metrics["records"]
    )

@router.get("/sample", response_model=AttendanceResponse)
def get_sample_report():
    """
    Returns parsed attendance metrics for the reference sample report.
    """
    sample_file = UPLOAD_DIR / "sample_attendance_report.xlsx"
    if not sample_file.exists():
        # Generate on demand if missing
        try:
            from create_sample import create_sample_excel
            create_sample_excel()
        except Exception:
            pass

    if not sample_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sample report not found."
        )

    raw_rows, report_date = parse_report_file(sample_file, sample_file.name)
    cleaned_rows = clean_and_normalize_records(raw_rows)
    metrics = calculate_attendance_metrics(cleaned_rows)
    
    return AttendanceResponse(
        report=ReportMetadata(
            date=report_date,
            fileName="Daily_Attendance_Report_01-10-2026.xlsx",
            totalEmployees=len(metrics["records"])
        ),
        summary=metrics["summary"],
        presentees=metrics["presentees"],
        absentees=metrics["absentees"],
        lateLogins=metrics["lateLogins"],
        ncEmployees=metrics["ncEmployees"],
        earlyOutEmployees=metrics["earlyOutEmployees"],
        records=metrics["records"]
    )

@router.get("/sample-file")
def download_sample_file():
    """Download sample Excel report for testing uploads directly."""
    sample_file = UPLOAD_DIR / "sample_attendance_report.xlsx"
    if not sample_file.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=sample_file,
        filename="Daily_Attendance_Report_01-10-2026.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
