@echo off
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd;%PATH%"
echo ====================================================
echo Pushing Biometric Attendance Dashboard to GitHub
echo Repository: https://github.com/Sanchu1213/Biometric-dashboard.git
echo ====================================================
git push -u origin main
echo ====================================================
pause
