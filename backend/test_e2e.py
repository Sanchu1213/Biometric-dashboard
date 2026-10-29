import urllib.request
import json
import uuid
from pathlib import Path

# 1. Test frontend
res = urllib.request.urlopen("http://127.0.0.1:5173/")
content = res.read().decode("utf-8")
assert "Navkis College of Engineering" in content
print("Frontend check: PASSED (Status 200, served index.html with Navkis title)")

# 2. Test upload API
boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
file_path = Path("backend/uploads/sample_attendance_report.xlsx")
file_bytes = file_path.read_bytes()

body_parts = [
    f"--{boundary}".encode("utf-8"),
    b'Content-Disposition: form-data; name="file"; filename="sample_attendance_report.xlsx"',
    b"Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    b"",
    file_bytes,
    f"--{boundary}--".encode("utf-8"),
    b""
]
body = b"\r\n".join(body_parts)

req = urllib.request.Request(
    "http://127.0.0.1:8000/api/attendance/upload",
    data=body,
    headers={
        "Content-Type": f"multipart/form-data; boundary={boundary}"
    }
)

upload_res = urllib.request.urlopen(req)
data = json.loads(upload_res.read().decode("utf-8"))

print("Upload API check: PASSED (Status 200)")
print("Report metadata:", data["report"])
print("Summary metrics:", data["summary"])
print("Presentees count:", len(data["presentees"]))
print("Absentees count:", len(data["absentees"]))
print("Late logins count:", len(data["lateLogins"]))
print("NC count:", len(data["ncEmployees"]))
print("Early out count:", len(data["earlyOutEmployees"]))
print("Records count:", len(data["records"]))
print("First record:", data["records"][0]["name"], "-", data["records"][0]["status"])
print("ALL CHECKS PASSED SUCCESSFULLY!")
