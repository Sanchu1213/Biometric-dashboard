import React, { useState, useEffect, useMemo } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('Processing Attendance Report...');
  const [errorMessage, setErrorMessage] = useState(null);

  // Dashboard Data from Backend
  const [dashboardData, setDashboardData] = useState(null);

  // Table filtering and pagination
  const [currentFilter, setCurrentFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Selected list modal to inspect names
  const [activeListModal, setActiveListModal] = useState(null); // 'presentees' | 'absentees' | 'lateLogins' | 'ncEmployees' | 'earlyOutEmployees'

  // Drag & drop handlers
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    const validExts = ['.pdf', '.xls', '.xlsx'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExts.some(ext => lowerName.endsWith(ext));
    if (!isValid) {
      setErrorMessage("Unable to Process Attendance Report: Invalid file type. Please select a .pdf, .xls, or .xlsx file.");
      setSelectedFile(null);
      return;
    }
    setErrorMessage(null);
    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setErrorMessage(null);
  };

  const uploadFileToBackend = async (fileToUpload) => {
    if (!fileToUpload) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setProgress(15);
    setProgressText("Uploading attendance report to server...");

    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      // Step simulated progress
      const timer = setInterval(() => {
        setProgress(prev => (prev < 80 ? prev + 20 : prev));
      }, 250);

      const response = await fetch(`${API_BASE_URL}/api/attendance/upload`, {
        method: "POST",
        body: formData,
      });

      clearInterval(timer);

      if (!response.ok) {
        let errDetail = "Unable to Process Attendance Report";
        try {
          const errJson = await response.json();
          if (errJson && errJson.detail) {
            errDetail = errJson.detail;
          }
        } catch {
          errDetail = `Server returned status ${response.status}: ${response.statusText}`;
        }
        throw new Error(errDetail);
      }

      const data = await response.json();
      setProgress(100);
      setProgressText("Finalizing dashboard calculation...");

      setTimeout(() => {
        setDashboardData(data);
        setIsProcessing(false);
        setActiveTab('dashboard');
        setCurrentFilter('All');
        setSearchQuery('');
        setCurrentPage(1);
        window.scrollTo(0, 0);
      }, 400);

    } catch (err) {
      setIsProcessing(false);
      setProgress(0);
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setErrorMessage("Unable to Process Attendance Report: Backend unavailable. Make sure the FastAPI backend is running at " + API_BASE_URL);
      } else {
        setErrorMessage(err.message || "Unable to Process Attendance Report");
      }
    }
  };

  const handleGenerateDashboard = () => {
    if (!selectedFile || isProcessing) return;
    uploadFileToBackend(selectedFile);
  };

  const loadSampleReport = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setProgress(20);
    setProgressText("Retrieving reference sample report (216 Records)...");

    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance/sample`);
      if (!response.ok) {
        throw new Error("Unable to load sample report from backend.");
      }
      const data = await response.json();
      setProgress(100);
      setProgressText("Loading dashboard...");
      setTimeout(() => {
        setDashboardData(data);
        setSelectedFile({
          name: data.report.fileName,
          size: 1468006,
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
        setIsProcessing(false);
        setActiveTab('dashboard');
        setCurrentFilter('All');
        setSearchQuery('');
        setCurrentPage(1);
        window.scrollTo(0, 0);
      }, 400);
    } catch (err) {
      setIsProcessing(false);
      setProgress(0);
      setErrorMessage("Unable to Process Attendance Report: Backend unavailable. Please start the backend service at " + API_BASE_URL);
    }
  };

  // Filter and search logic
  const filteredRecords = useMemo(() => {
    if (!dashboardData || !dashboardData.records) return [];
    return dashboardData.records.filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            r.code.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (currentFilter === 'All') return true;
      if (currentFilter === 'Present') return r.status === 'Present';
      if (currentFilter === 'Absent') return r.status === 'Absent';
      if (currentFilter === 'Late') return r.status === 'Late';
      if (currentFilter === 'NC') return r.status === 'NC';
      if (currentFilter === 'Early Out') return r.status === 'Early Out';
      return true;
    });
  }, [dashboardData, currentFilter, searchQuery]);

  // Paginated records
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage]);

  // Compute hourly arrival distribution dynamically from records
  const hourlyBuckets = useMemo(() => {
    const buckets = {
      '08:00': 0,
      '08:30': 0,
      '09:00': 0,
      '09:30': 0,
      '10:00+': 0,
    };
    if (!dashboardData || !dashboardData.records) return buckets;

    dashboardData.records.forEach(r => {
      if (r.status === 'Absent' || !r.inTime || r.inTime === '--:--') return;
      const match = r.inTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const meridiem = (match[3] || '').toUpperCase();
        if (meridiem === 'PM' && h < 12) h += 12;
        if (meridiem === 'AM' && h === 12) h = 0;

        const totalMinutes = h * 60 + m;
        if (totalMinutes < 8 * 60 + 30) {
          buckets['08:00']++;
        } else if (totalMinutes < 9 * 60) {
          buckets['08:30']++;
        } else if (totalMinutes < 9 * 60 + 30) {
          buckets['09:00']++;
        } else if (totalMinutes <= 10 * 60) {
          buckets['09:30']++;
        } else {
          buckets['10:00+']++;
        }
      }
    });
    return buckets;
  }, [dashboardData]);

  // Donut SVG dash calculation
  const attendanceRate = dashboardData?.summary?.attendancePercentage || 0;
  const donutDashArray = `${attendanceRate}, 100`;

  return (
    <div className="h-full flex flex-col bg-background text-on-surface antialiased selection:bg-secondary-container selection:text-on-secondary-container">
      {/* TopAppBar */}
      <header className="bg-surface dark:bg-inverse-surface shadow-sm sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-8 h-16 max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-headline-sm shadow-sm">
              NC
            </div>
            <div>
              <h1 className="text-headline-sm font-headline-sm font-bold text-primary dark:text-inverse-primary tracking-tight">
                Navkis College of Engineering
              </h1>
              <p className="text-label-sm text-on-surface-variant">
                Biometric Attendance & HR Analytics Portal
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <button
              id="nav-upload"
              onClick={() => setActiveTab('upload')}
              className={`${
                activeTab === 'upload'
                  ? 'text-primary font-semibold border-b-2 border-primary pb-1'
                  : 'text-on-surface-variant hover:text-on-surface'
              } transition-colors text-body-md flex items-center gap-1.5`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                cloud_upload
              </span>
              Upload Report
            </button>
            <button
              id="nav-dashboard"
              onClick={() => {
                if (dashboardData) setActiveTab('dashboard');
                else setActiveTab('upload');
              }}
              className={`${
                activeTab === 'dashboard'
                  ? 'text-primary font-semibold border-b-2 border-primary pb-1'
                  : 'text-on-surface-variant hover:text-on-surface'
              } transition-colors text-body-md flex items-center gap-1.5`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                dashboard
              </span>
              Attendance Dashboard
            </button>
            <button
              id="nav-analytics"
              onClick={() => setActiveTab('analytics')}
              className={`${
                activeTab === 'analytics'
                  ? 'text-primary font-semibold border-b-2 border-primary pb-1'
                  : 'text-on-surface-variant hover:text-on-surface'
              } transition-colors text-body-md flex items-center gap-1.5`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                analytics
              </span>
              Analytics
            </button>
            <button
              id="nav-api"
              onClick={() => setActiveTab('api')}
              className={`${
                activeTab === 'api'
                  ? 'text-primary font-semibold border-b-2 border-primary pb-1'
                  : 'text-on-surface-variant hover:text-on-surface'
              } transition-colors text-body-md flex items-center gap-1.5`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                api
              </span>
              API Handoff
            </button>
          </nav>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span className="text-label-md text-on-surface font-medium">Biometric Sync: Active</span>
            </div>
            <button
              className="flex items-center gap-1.5 text-body-md font-medium text-error hover:bg-error-container/30 px-3 py-1.5 rounded-lg transition-colors"
              onClick={() => alert('Logged out successfully.')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                logout
              </span>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* VIEW 1: UPLOAD & WELCOME */}
        {activeTab === 'upload' && (
          <section className="space-y-8 animate-fadeIn" id="view-upload">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-md font-semibold bg-secondary-fixed text-on-secondary-fixed">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  verified
                </span>{' '}
                Institutional Biometric Engine v4.2
              </span>
              <h2 className="text-headline-xl text-on-background">Attendance Report Ingestion</h2>
              <p className="text-body-lg text-on-surface-variant">
                Upload biometric machine log exports (.pdf, .xls, .xlsx) to instantly calculate attendance metrics, late entries, and generate verified institutional reports.
              </p>
            </div>

            {/* Error Notification Banner */}
            {errorMessage && (
              <div className="max-w-2xl mx-auto bg-error-container text-on-error-container p-4 rounded-xl border border-error/30 flex items-start justify-between space-x-3 shadow-sm">
                <div className="flex items-start space-x-3">
                  <span className="material-symbols-outlined text-error mt-0.5">error</span>
                  <div>
                    <h4 className="font-semibold text-body-md">Unable to Process Attendance Report</h4>
                    <p className="text-body-sm opacity-90 mt-0.5">{errorMessage}</p>
                    <p className="text-body-sm mt-1 font-medium underline cursor-pointer" onClick={() => removeFile()}>
                      Upload another file
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-on-error-container hover:opacity-75 p-1"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                </button>
              </div>
            )}

            {/* Upload Card */}
            <div className="max-w-2xl mx-auto bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm space-y-6">
              <div
                id="drop-zone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed ${
                  isDragging ? 'border-primary bg-primary-fixed/20' : 'border-outline-variant hover:border-primary'
                } rounded-xl p-10 text-center cursor-pointer transition-all bg-surface-container-low/50 flex flex-col items-center justify-center space-y-4`}
              >
                <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
                  <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                    upload_file
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-body-lg font-semibold text-on-background">Drag & drop your attendance file here</p>
                  <p className="text-body-sm text-on-surface-variant">Supports PDF, XLS, XLSX up to 50MB</p>
                </div>
                <label className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-on-primary text-body-md font-medium hover:opacity-90 cursor-pointer shadow-sm">
                  <span>Browse Files</span>
                  <input
                    accept=".pdf,.xls,.xlsx"
                    className="hidden"
                    id="file-input"
                    type="file"
                    onChange={handleFileChange}
                    disabled={isProcessing}
                  />
                </label>
              </div>

              {/* File Details Box */}
              {selectedFile && (
                <div
                  className="border border-outline-variant rounded-lg p-4 bg-surface-container-low flex items-center justify-between"
                  id="file-details-container"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <span className="material-symbols-outlined">description</span>
                    </div>
                    <div>
                      <p className="text-body-md font-semibold text-on-background" id="file-name">
                        {selectedFile.name}
                      </p>
                      <p className="text-body-sm text-on-surface-variant" id="file-meta">
                        {selectedFile.type || 'Attendance Document'} • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for parsing
                      </p>
                    </div>
                  </div>
                  <button
                    className="text-on-surface-variant hover:text-error p-2 rounded-lg transition-colors"
                    onClick={removeFile}
                    title="Remove file"
                    disabled={isProcessing}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-outline-variant">
                <button
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-outline-variant text-on-surface text-body-md font-medium hover:bg-surface-container transition-colors"
                  onClick={loadSampleReport}
                  disabled={isProcessing}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    bolt
                  </span>
                  Load Sample Report (216 Records)
                </button>
                <button
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-on-primary text-body-md font-medium transition-all shadow-sm ${
                    !selectedFile || isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                  }`}
                  disabled={!selectedFile || isProcessing}
                  id="generate-btn"
                  onClick={handleGenerateDashboard}
                >
                  <span>{isProcessing ? 'Processing Attendance Report...' : 'Generate Dashboard'}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>

            {/* Processing State Overlay Modal */}
            {isProcessing && (
              <div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                id="processing-modal"
              >
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 max-w-md w-full text-center space-y-6 shadow-xl animate-scaleUp">
                  <div className="w-20 h-20 mx-auto rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed animate-spin-custom">
                    <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>
                      sync
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-headline-md text-on-background">Parsing Biometric Logs</h3>
                    <p className="text-body-md text-on-surface-variant" id="progress-text">
                      {progressText}
                    </p>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all duration-300"
                      id="progress-bar"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* VIEW 2: BIOMETRIC ATTENDANCE DASHBOARD */}
        {activeTab === 'dashboard' && dashboardData && (
          <section className="space-y-8 animate-fadeIn" id="view-dashboard">
            {/* Metadata Header Bar */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-label-sm font-semibold bg-tertiary-fixed text-on-tertiary-fixed">
                    Verified Report
                  </span>
                  <span className="text-body-sm text-on-surface-variant">
                    Report File: {dashboardData.report.fileName}
                  </span>
                </div>
                <h2 className="text-headline-lg font-bold text-on-background">Daily Attendance Report</h2>
                <p className="text-body-md text-on-surface-variant">
                  Attendance Date:{' '}
                  <span className="font-semibold text-on-background">
                    {dashboardData.report.date}
                  </span>{' '}
                  • Total Employees Registered:{' '}
                  <span className="font-semibold text-on-background">
                    {dashboardData.report.totalEmployees}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-outline-variant text-on-surface text-body-md font-medium hover:bg-surface-container transition-colors"
                  onClick={() => setActiveTab('upload')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    upload_file
                  </span>
                  Upload New File
                </button>
                <button
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-body-md font-medium hover:opacity-90 transition-colors shadow-sm"
                  onClick={() => window.print()}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    download
                  </span>
                  Export PDF Report
                </button>
              </div>
            </div>

            {/* Seven Major KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Presentees */}
              <div
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm cursor-pointer hover:border-primary transition-all"
                onClick={() => {
                  setCurrentFilter('Present');
                  setActiveListModal('presentees');
                }}
                title="Click to view Presentees list"
              >
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-medium text-on-surface-variant">Presentees</span>
                  <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                    <span className="material-symbols-outlined">how_to_reg</span>
                  </span>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <h3 className="text-headline-lg font-bold text-on-background">
                    {dashboardData.summary.presentees}
                  </h3>
                  <span className="text-label-sm font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {dashboardData.summary.attendancePercentage}% Rate
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-body-sm text-on-surface-variant">
                  <span>On-time & verified punch-ins</span>
                  <span className="text-label-sm text-secondary font-medium">View List →</span>
                </div>
              </div>

              {/* Absentees */}
              <div
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm cursor-pointer hover:border-primary transition-all"
                onClick={() => {
                  setCurrentFilter('Absent');
                  setActiveListModal('absentees');
                }}
                title="Click to view Absentees list"
              >
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-medium text-on-surface-variant">Absentees</span>
                  <span className="p-2 rounded-lg bg-rose-50 text-rose-700">
                    <span className="material-symbols-outlined">person_off</span>
                  </span>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <h3 className="text-headline-lg font-bold text-on-background">
                    {dashboardData.summary.absentees}
                  </h3>
                  <span className="text-label-sm font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                    {(dashboardData.report.totalEmployees > 0
                      ? ((dashboardData.summary.absentees / dashboardData.report.totalEmployees) * 100).toFixed(2)
                      : 0)}% Rate
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-body-sm text-on-surface-variant">
                  <span>Unexcused & leave absences</span>
                  <span className="text-label-sm text-secondary font-medium">View List →</span>
                </div>
              </div>

              {/* Attendance % */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-medium text-on-surface-variant">Attendance %</span>
                  <span className="p-2 rounded-lg bg-blue-50 text-blue-700">
                    <span className="material-symbols-outlined">pie_chart</span>
                  </span>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <h3 className="text-headline-lg font-bold text-on-background">
                    {dashboardData.summary.attendancePercentage}%
                  </h3>
                  <span className="text-label-sm font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    Verified
                  </span>
                </div>
                <p className="mt-1 text-body-sm text-on-surface-variant">Institutional benchmark</p>
              </div>

              {/* Late Logins */}
              <div
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm cursor-pointer hover:border-primary transition-all"
                onClick={() => {
                  setCurrentFilter('Late');
                  setActiveListModal('lateLogins');
                }}
                title="Click to view Late Logins list"
              >
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-medium text-on-surface-variant">Late Logins (&gt;10:00)</span>
                  <span className="p-2 rounded-lg bg-amber-50 text-amber-700">
                    <span className="material-symbols-outlined">schedule</span>
                  </span>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <h3 className="text-headline-lg font-bold text-on-background">
                    {dashboardData.summary.lateLogins}
                  </h3>
                  <span className="text-label-sm font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    Warning
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-body-sm text-on-surface-variant">
                  <span>Arrived after 10:00 AM threshold</span>
                  <span className="text-label-sm text-secondary font-medium">View List →</span>
                </div>
              </div>
            </div>

            {/* Second Row KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* NC Count */}
              <div
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm cursor-pointer hover:border-primary transition-all"
                onClick={() => {
                  setCurrentFilter('NC');
                  setActiveListModal('ncEmployees');
                }}
                title="Click to view Non-Compliance list"
              >
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-medium text-on-surface-variant">
                    NC Count (Non-Compliance)
                  </span>
                  <span className="p-2 rounded-lg bg-purple-50 text-purple-700">
                    <span className="material-symbols-outlined">warning</span>
                  </span>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <h3 className="text-headline-lg font-bold text-on-background">
                    {dashboardData.summary.ncCount}
                  </h3>
                  <span className="text-label-sm font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                    Action Req.
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-body-sm text-on-surface-variant">
                  <span>Missing punch / punch anomaly</span>
                  <span className="text-label-sm text-secondary font-medium">View List →</span>
                </div>
              </div>

              {/* NC % */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-medium text-on-surface-variant">NC Percentage</span>
                  <span className="p-2 rounded-lg bg-purple-50 text-purple-700">
                    <span className="material-symbols-outlined">analytics</span>
                  </span>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <h3 className="text-headline-lg font-bold text-on-background">
                    {dashboardData.summary.ncPercentage}%
                  </h3>
                  <span className="text-label-sm font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Within limit
                  </span>
                </div>
                <p className="mt-1 text-body-sm text-on-surface-variant">Ratio of non-compliant logs</p>
              </div>

              {/* Early Out Count */}
              <div
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm cursor-pointer hover:border-primary transition-all"
                onClick={() => {
                  setCurrentFilter('Early Out');
                  setActiveListModal('earlyOutEmployees');
                }}
                title="Click to view Early Out list"
              >
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-medium text-on-surface-variant">
                    Early Out Count (&lt;7:00 hrs)
                  </span>
                  <span className="p-2 rounded-lg bg-amber-50 text-amber-700">
                    <span className="material-symbols-outlined">alarm_off</span>
                  </span>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <h3 className="text-headline-lg font-bold text-on-background">
                    {dashboardData.summary.earlyOutCount}
                  </h3>
                  <span className="text-label-sm font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    Excl. Absents
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-body-sm text-on-surface-variant">
                  <span>Exiting before shift completion</span>
                  <span className="text-label-sm text-secondary font-medium">View List →</span>
                </div>
              </div>
            </div>

            {/* Visual Charts Section (Bento Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Attendance Overview Donut Chart Card */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-headline-sm font-semibold text-on-background">Attendance Overview</h3>
                  <span className="text-body-sm text-on-surface-variant">Present vs Absent</span>
                </div>
                <div className="flex items-center justify-center my-6">
                  {/* SVG Donut Chart */}
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-surface-container-high"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></path>
                      <path
                        className="text-primary"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray={donutDashArray}
                        strokeLinecap="round"
                        strokeWidth="4"
                      ></path>
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-headline-lg font-bold text-on-background">
                        {dashboardData.summary.attendancePercentage}%
                      </span>
                      <span className="block text-label-sm text-on-surface-variant">Present Rate</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant text-center">
                  <div>
                    <span className="block text-body-sm text-on-surface-variant">Presentees</span>
                    <span className="text-headline-md font-bold text-emerald-700">
                      {dashboardData.summary.presentees}
                    </span>
                  </div>
                  <div>
                    <span className="block text-body-sm text-on-surface-variant">Absentees</span>
                    <span className="text-headline-md font-bold text-rose-700">
                      {dashboardData.summary.absentees}
                    </span>
                  </div>
                </div>
              </div>

              {/* End-of-Day Activity Bar Chart Card */}
              <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-headline-sm font-semibold text-on-background">Hourly In-Punch Distribution</h3>
                  <span className="text-body-sm text-on-surface-variant">
                    {hourlyBuckets['09:00'] >= hourlyBuckets['08:30'] ? 'Peak arrival: 09:00 - 09:30 AM' : 'Peak arrival: 08:30 - 09:00 AM'}
                  </span>
                </div>
                {/* Dynamically Scaled Bar Chart */}
                <div className="h-56 flex items-end justify-between gap-2 pt-6 px-2 border-b border-outline-variant">
                  {Object.entries(hourlyBuckets).map(([bucket, count]) => {
                    const maxVal = Math.max(...Object.values(hourlyBuckets), 1);
                    const heightPercent = Math.max(Math.round((count / maxVal) * 85), 8);
                    const isLateBucket = bucket === '10:00+';
                    return (
                      <div key={bucket} className="w-full flex flex-col items-center gap-2">
                        <span className="text-label-sm font-medium text-on-surface-variant">{count}</span>
                        <div
                          className={`w-full rounded-t transition-all duration-500 ${
                            isLateBucket ? 'bg-amber-600' : bucket === '08:00' ? 'bg-primary-fixed' : 'bg-primary'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        ></div>
                        <span className="text-label-sm text-on-surface-variant">{bucket}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between pt-4 text-body-sm text-on-surface-variant">
                  <span>Total Logged In-Time Entries: {dashboardData.summary.presentees}</span>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-amber-600 inline-block"></span> Late Threshold (&gt;10:00 AM)
                  </span>
                </div>
              </div>
            </div>

            {/* Employee Category Filter Pills & Search */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className={`px-4 py-2 rounded-lg text-body-md transition-all ${
                      currentFilter === 'All'
                        ? 'font-semibold bg-primary text-on-primary'
                        : 'font-medium bg-surface-container hover:bg-surface-container-high text-on-surface'
                    }`}
                    id="pill-All"
                    onClick={() => {
                      setCurrentFilter('All');
                      setCurrentPage(1);
                    }}
                  >
                    All Records ({dashboardData.records.length})
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg text-body-md transition-all ${
                      currentFilter === 'Present'
                        ? 'font-semibold bg-primary text-on-primary'
                        : 'font-medium bg-surface-container hover:bg-surface-container-high text-on-surface'
                    }`}
                    id="pill-Present"
                    onClick={() => {
                      setCurrentFilter('Present');
                      setCurrentPage(1);
                    }}
                  >
                    Present ({dashboardData.summary.presentees})
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg text-body-md transition-all ${
                      currentFilter === 'Absent'
                        ? 'font-semibold bg-primary text-on-primary'
                        : 'font-medium bg-surface-container hover:bg-surface-container-high text-on-surface'
                    }`}
                    id="pill-Absent"
                    onClick={() => {
                      setCurrentFilter('Absent');
                      setCurrentPage(1);
                    }}
                  >
                    Absent ({dashboardData.summary.absentees})
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg text-body-md transition-all ${
                      currentFilter === 'Late'
                        ? 'font-semibold bg-primary text-on-primary'
                        : 'font-medium bg-surface-container hover:bg-surface-container-high text-on-surface'
                    }`}
                    id="pill-Late"
                    onClick={() => {
                      setCurrentFilter('Late');
                      setCurrentPage(1);
                    }}
                  >
                    Late Logins ({dashboardData.summary.lateLogins})
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg text-body-md transition-all ${
                      currentFilter === 'NC'
                        ? 'font-semibold bg-primary text-on-primary'
                        : 'font-medium bg-surface-container hover:bg-surface-container-high text-on-surface'
                    }`}
                    id="pill-NC"
                    onClick={() => {
                      setCurrentFilter('NC');
                      setCurrentPage(1);
                    }}
                  >
                    NC Employees ({dashboardData.summary.ncCount})
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg text-body-md transition-all ${
                      currentFilter === 'Early Out'
                        ? 'font-semibold bg-primary text-on-primary'
                        : 'font-medium bg-surface-container hover:bg-surface-container-high text-on-surface'
                    }`}
                    id="pill-Early Out"
                    onClick={() => {
                      setCurrentFilter('Early Out');
                      setCurrentPage(1);
                    }}
                  >
                    Early Out ({dashboardData.summary.earlyOutCount})
                  </button>
                </div>
                <div className="relative w-full md:w-72">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      search
                    </span>
                  </span>
                  <input
                    className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md text-on-surface focus:outline-none focus:border-primary"
                    id="table-search"
                    placeholder="Search by name or code..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Complete Attendance Records Table */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
                <h3 className="text-headline-sm font-semibold text-on-background">
                  Complete Attendance Records ({filteredRecords.length} Employees)
                </h3>
                <span className="text-body-sm text-on-surface-variant">
                  Showing {currentFilter} filter results
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant text-label-md border-b border-outline-variant">
                      <th className="p-4 font-semibold">S.No</th>
                      <th className="p-4 font-semibold">Emp Code</th>
                      <th className="p-4 font-semibold">Employee Name</th>
                      <th className="p-4 font-semibold">Shift</th>
                      <th className="p-4 font-semibold">In Time</th>
                      <th className="p-4 font-semibold">Out Time</th>
                      <th className="p-4 font-semibold">Work Dur.</th>
                      <th className="p-4 font-semibold">OT</th>
                      <th className="p-4 font-semibold">Tot. Dur.</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant text-body-md text-on-surface" id="attendance-tbody">
                    {paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-on-surface-variant">
                          No matching employee records found.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((r) => {
                        let statusBadge = (
                          <span className="px-2.5 py-1 rounded-full text-label-sm font-semibold bg-emerald-50 text-emerald-700">
                            Present
                          </span>
                        );
                        if (r.status === 'Absent') {
                          statusBadge = (
                            <span className="px-2.5 py-1 rounded-full text-label-sm font-semibold bg-rose-50 text-rose-700">
                              Absent
                            </span>
                          );
                        } else if (r.status === 'Late') {
                          statusBadge = (
                            <span className="px-2.5 py-1 rounded-full text-label-sm font-semibold bg-amber-50 text-amber-700">
                              Late Login
                            </span>
                          );
                        } else if (r.status === 'NC') {
                          statusBadge = (
                            <span className="px-2.5 py-1 rounded-full text-label-sm font-semibold bg-purple-50 text-purple-700">
                              NC
                            </span>
                          );
                        } else if (r.status === 'Early Out') {
                          statusBadge = (
                            <span className="px-2.5 py-1 rounded-full text-label-sm font-semibold bg-amber-50 text-amber-700">
                              Early Out
                            </span>
                          );
                        }

                        return (
                          <tr
                            key={r.sno + '-' + r.code}
                            className="hover:bg-surface-container-low transition-colors border-b border-outline-variant"
                          >
                            <td className="p-4 text-body-sm text-on-surface-variant">{r.sno}</td>
                            <td className="p-4 font-mono text-body-sm text-on-background">{r.code}</td>
                            <td className="p-4 font-medium text-on-background">{r.name}</td>
                            <td className="p-4 text-body-sm text-on-surface-variant">{r.shift}</td>
                            <td className="p-4 font-mono text-body-sm">{r.inTime}</td>
                            <td className="p-4 font-mono text-body-sm">{r.outTime}</td>
                            <td className="p-4 font-mono text-body-sm">{r.workDur}</td>
                            <td className="p-4 font-mono text-body-sm">{r.ot}</td>
                            <td className="p-4 font-mono text-body-sm">{r.totDur}</td>
                            <td className="p-4">{statusBadge}</td>
                            <td className="p-4 text-body-sm text-on-surface-variant">{r.remarks}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4 text-body-sm text-on-surface-variant">
                <span>
                  Showing{' '}
                  {filteredRecords.length > 0
                    ? `${(currentPage - 1) * pageSize + 1} to ${Math.min(
                        currentPage * pageSize,
                        filteredRecords.length
                      )} of ${filteredRecords.length}`
                    : '0'}{' '}
                  entries
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    className={`px-3 py-1 rounded border border-outline-variant ${
                      currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-container'
                    }`}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        className={`px-3 py-1 rounded ${
                          currentPage === pageNum
                            ? 'bg-primary text-on-primary font-medium'
                            : 'border border-outline-variant hover:bg-surface-container'
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && <span className="px-1">...</span>}
                  <button
                    className={`px-3 py-1 rounded border border-outline-variant ${
                      currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-container'
                    }`}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* End-of-Day Summary Table */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-headline-sm font-semibold text-on-background">End-of-Day Institutional Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant">
                  <span className="text-body-sm text-on-surface-variant">Total Registered Faculty & Staff</span>
                  <p className="text-headline-md font-bold text-on-background mt-1">
                    {dashboardData.report.totalEmployees}
                  </p>
                </div>
                <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant">
                  <span className="text-body-sm text-on-surface-variant">Total Present (Verified)</span>
                  <p className="text-headline-md font-bold text-emerald-700 mt-1">
                    {dashboardData.summary.presentees} ({dashboardData.summary.attendancePercentage}%)
                  </p>
                </div>
                <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant">
                  <span className="text-body-sm text-on-surface-variant">Total Absent (Unexcused + Leave)</span>
                  <p className="text-headline-md font-bold text-rose-700 mt-1">
                    {dashboardData.summary.absentees} (
                    {(dashboardData.report.totalEmployees > 0
                      ? ((dashboardData.summary.absentees / dashboardData.report.totalEmployees) * 100).toFixed(2)
                      : 0)}%)
                  </p>
                </div>
                <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant">
                  <span className="text-body-sm text-on-surface-variant">Non-Compliance & Late Flagged</span>
                  <p className="text-headline-md font-bold text-amber-700 mt-1">
                    {dashboardData.summary.lateLogins + dashboardData.summary.ncCount} Total
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* EMPLOYEE NAMES LIST MODAL */}
        {activeListModal && dashboardData && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-scaleUp">
              <div className="flex items-center justify-between border-b border-outline-variant pb-3">
                <h3 className="text-headline-sm font-bold text-on-background capitalize">
                  {activeListModal === 'presentees' && `Presentees List (${dashboardData.presentees.length})`}
                  {activeListModal === 'absentees' && `Absentees List (${dashboardData.absentees.length})`}
                  {activeListModal === 'lateLogins' && `Late Logins List (${dashboardData.lateLogins.length})`}
                  {activeListModal === 'ncEmployees' && `NC Employees List (${dashboardData.ncEmployees.length})`}
                  {activeListModal === 'earlyOutEmployees' && `Early Out List (${dashboardData.earlyOutEmployees.length})`}
                </h3>
                <button
                  onClick={() => setActiveListModal(null)}
                  className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 pr-1 divide-y divide-outline-variant/50">
                {((dashboardData[activeListModal] || [])).length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant py-4 text-center">No employees in this list.</p>
                ) : (
                  (dashboardData[activeListModal] || []).map((name, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 text-body-md text-on-background">
                      <span className="flex items-center gap-2">
                        <span className="text-body-sm text-on-surface-variant font-mono w-6">{idx + 1}.</span>
                        <span className="font-medium">{name}</span>
                      </span>
                      <span className="text-label-sm font-medium px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                        Verified
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-outline-variant flex justify-end">
                <button
                  onClick={() => setActiveListModal(null)}
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary text-body-sm font-medium hover:opacity-90"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: ANALYTICS */}
        {activeTab === 'analytics' && (
          <section className="space-y-8 animate-fadeIn" id="view-analytics">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-headline-lg font-bold text-on-background">Institutional Biometric Analytics</h2>
              <p className="text-body-md text-on-surface-variant">
                Weekly and monthly aggregate punctuality trends across departments.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant space-y-2">
                  <span className="text-body-sm text-on-surface-variant font-medium">Computer Science Dept.</span>
                  <h3 className="text-headline-md font-bold text-on-background">98.2% Punctuality</h3>
                  <p className="text-body-sm text-emerald-700 font-medium">↑ +2.1% from last week</p>
                </div>
                <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant space-y-2">
                  <span className="text-body-sm text-on-surface-variant font-medium">Mechanical Engineering Dept.</span>
                  <h3 className="text-headline-md font-bold text-on-background">93.5% Punctuality</h3>
                  <p className="text-body-sm text-amber-700 font-medium">→ Stable</p>
                </div>
                <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant space-y-2">
                  <span className="text-body-sm text-on-surface-variant font-medium">Administrative Staff</span>
                  <h3 className="text-headline-md font-bold text-on-background">91.0% Punctuality</h3>
                  <p className="text-body-sm text-rose-700 font-medium">↓ -1.4% from last week</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* VIEW 4: API HANDOFF & DOCUMENTATION */}
        {activeTab === 'api' && (
          <section className="space-y-8 animate-fadeIn" id="view-api">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-6">
              <div>
                <span className="px-2.5 py-0.5 rounded text-label-sm font-semibold bg-primary-fixed text-on-primary-fixed">
                  Antigravity Backend Integration
                </span>
                <h2 className="text-headline-lg font-bold text-on-background mt-2">API Handoff & Documentation</h2>
                <p className="text-body-md text-on-surface-variant">
                  Endpoints and payload structures for automated biometric report synchronization.
                </p>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-primary-container text-on-primary-container font-mono text-body-sm">
                  <span className="text-emerald-400 font-bold">POST</span> {API_BASE_URL}/api/attendance/upload
                </div>
                <div className="space-y-2">
                  <h3 className="text-headline-sm font-semibold text-on-background">Multipart Request Headers</h3>
                  <ul className="list-disc list-inside text-body-md text-on-surface-variant space-y-1">
                    <li>
                      <code className="text-on-background font-mono">Content-Type: multipart/form-data</code> (field:{' '}
                      <code className="text-on-background font-mono">file</code>)
                    </li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="text-headline-sm font-semibold text-on-background">Sample JSON Response Structure</h3>
                  <pre className="bg-surface-container-low p-4 rounded-lg border border-outline-variant font-mono text-body-sm text-on-background overflow-x-auto">
{`{
  "report": {
    "date": "01 October 2026",
    "fileName": "Daily_Attendance_Report_01-10-2026.xlsx",
    "totalEmployees": 216
  },
  "summary": {
    "presentees": 204,
    "absentees": 12,
    "attendancePercentage": 94.44,
    "lateLogins": 18,
    "ncCount": 8,
    "ncPercentage": 3.70,
    "earlyOutCount": 14
  },
  "presentees": ["Aarav Sharma", "..."],
  "absentees": ["..."],
  "lateLogins": ["..."],
  "ncEmployees": ["..."],
  "earlyOutEmployees": ["..."],
  "records": [
    {
      "sno": 1,
      "code": "NCENG1001",
      "name": "Aarav Sharma",
      "shift": "GS (09:00 - 17:00)",
      "inTime": "09:02 AM",
      "outTime": "05:15 PM",
      "workDur": "08:13",
      "ot": "00:13",
      "totDur": "08:13",
      "status": "Present",
      "remarks": "On Time"
    }
  ]
}`}
                  </pre>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
