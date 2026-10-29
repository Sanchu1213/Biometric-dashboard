import openpyxl
from pathlib import Path

def create_sample_excel():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Daily Attendance"
    
    # Title & Date header
    ws.append(["Navkis College of Engineering"])
    ws.append(["Biometric Attendance Daily Log Report"])
    ws.append(["Attendance Date:", "01 October 2026", "", "Total Staff:", "216"])
    ws.append([]) # empty row
    
    # Header row
    headers = [
        "SNo", "E. Code", "Name", "Shift", "InTime", "OutTime", 
        "Work Dur.", "OT", "Tot. Dur.", "Status", "Remarks"
    ]
    ws.append(headers)
    
    first_names = ['Aarav', 'Ananya', 'Aditya', 'Diya', 'Rohan', 'Priya', 'Kiran', 'Neha', 'Rahul', 'Sneha', 'Vikram', 'Pooja', 'Amit', 'Divya', 'Manish', 'Kavita', 'Suresh', 'Meera', 'Alok', 'Swati']
    last_names = ['Sharma', 'Verma', 'Gupta', 'Patel', 'Reddy', 'Iyer', 'Nair', 'Kumar', 'Singh', 'Joshi', 'Mehta', 'Rao', 'Deshmukh', 'Choudhury', 'Pillai', 'Menon']

    for i in range(1, 217):
        fName = first_names[(i * 7) % len(first_names)]
        lName = last_names[(i * 13) % len(last_names)]
        name = f"{fName} {lName}"
        code = f"NCENG{1000 + i}"
        shift = "GS (09:00 - 17:00)"
        
        status = "Present"
        in_time = "09:02 AM"
        out_time = "05:15 PM"
        work_dur = "08:13"
        ot = "00:13"
        tot_dur = "08:13"
        remarks = "On Time"
        
        if i > 204:
            status = "Absent"
            in_time = "--:--"
            out_time = "--:--"
            work_dur = "00:00"
            ot = "00:00"
            tot_dur = "00:00"
            remarks = "Absent (Leave Approved)" if i % 2 == 0 else "Absent (Unexcused)"
        elif i % 12 == 0:
            status = "Present"
            in_time = "10:22 AM" # Late (>10:00 AM)
            out_time = "05:00 PM"
            work_dur = "06:38"
            ot = "00:00"
            tot_dur = "06:38"
            remarks = "22 mins late"
        elif i % 27 == 0:
            status = "Present"
            in_time = "09:15 AM"
            out_time = "--:--"
            work_dur = "00:00"
            ot = "00:00"
            tot_dur = "00:00"
            remarks = "NC (Missing Out-Punch)"
        elif i % 15 == 0:
            status = "Present"
            in_time = "09:00 AM"
            out_time = "03:30 PM"
            work_dur = "06:30" # Early Out (<7 hrs)
            ot = "00:00"
            tot_dur = "06:30"
            remarks = "Early Out (<7 hrs)"
            
        ws.append([
            i, code, name, shift, in_time, out_time, work_dur, ot, tot_dur, status, remarks
        ])
        
    out_dir = Path("backend/uploads")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "sample_attendance_report.xlsx"
    wb.save(out_file)
    print(f"Sample report generated at {out_file}")

if __name__ == "__main__":
    create_sample_excel()
