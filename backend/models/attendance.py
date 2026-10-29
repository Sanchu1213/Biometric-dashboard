from typing import List, Optional
from pydantic import BaseModel, Field

class AttendanceRecord(BaseModel):
    sno: int = Field(..., description="Serial Number")
    code: str = Field(..., description="Employee Code")
    name: str = Field(..., description="Employee Name")
    shift: str = Field(default="GS", description="Shift Details")
    inTime: str = Field(default="--:--", description="Punch In Time")
    outTime: str = Field(default="--:--", description="Punch Out Time")
    workDur: str = Field(default="00:00", description="Work Duration HH:MM")
    ot: str = Field(default="00:00", description="Overtime Duration HH:MM")
    totDur: str = Field(default="00:00", description="Total Duration HH:MM")
    status: str = Field(..., description="Calculated Attendance Status")
    remarks: str = Field(default="", description="Remarks or Anomaly Notes")

class ReportMetadata(BaseModel):
    date: str = Field(..., description="Attendance Date")
    fileName: str = Field(..., description="Name of the uploaded file")
    totalEmployees: int = Field(..., description="Total employees count")

class AttendanceSummary(BaseModel):
    presentees: int = Field(default=0, description="Total present employees")
    absentees: int = Field(default=0, description="Total absent employees")
    attendancePercentage: float = Field(default=0.0, description="Attendance % rate")
    lateLogins: int = Field(default=0, description="Total late logins (>10:00 AM)")
    ncCount: int = Field(default=0, description="Total Non-Compliance count")
    ncPercentage: float = Field(default=0.0, description="NC % rate")
    earlyOutCount: int = Field(default=0, description="Early Out count (<7:00 hrs)")

class AttendanceResponse(BaseModel):
    report: ReportMetadata
    summary: AttendanceSummary
    presentees: List[str] = Field(default_factory=list, description="List of Presentee employee names")
    absentees: List[str] = Field(default_factory=list, description="List of Absentee employee names")
    lateLogins: List[str] = Field(default_factory=list, description="List of Late login employee names")
    ncEmployees: List[str] = Field(default_factory=list, description="List of NC employee names")
    earlyOutEmployees: List[str] = Field(default_factory=list, description="List of Early out employee names")
    records: List[AttendanceRecord] = Field(default_factory=list, description="Complete attendance table records")
