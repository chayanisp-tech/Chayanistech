import React, { useState, useEffect } from "react";
import { Student, Exam, Submission, SystemSettings, SyncStatus } from "./types";
import {
  DEFAULT_STUDENTS,
  DEFAULT_EXAMS,
  DEFAULT_SETTINGS,
  DEFAULT_SUBMISSIONS,
} from "./lib/mockData";
import { initAuth, getAccessToken, logout, googleSignIn } from "./lib/firebase";
import {
  searchDatabaseSpreadsheet,
  createDatabaseSpreadsheet,
  syncLocalToSheets,
  fetchFromSheets,
  fetchPublicSheetsData,
} from "./lib/googleSheets";
import {
  saveSettingsToFirestore,
  syncStudentsToFirestore,
  syncExamsToFirestore,
  syncSubmissionsToFirestore,
  pushAllToFirestore,
  pullAllFromFirestore,
  testConnection
} from "./lib/firestoreSync";

// Components
import StudentWelcome from "./components/StudentWelcome";
import StudentExamRoom from "./components/StudentExamRoom";
import ExamSuccess from "./components/ExamSuccess";
import StudentScoreLookup from "./components/StudentScoreLookup";
import TeacherLogin from "./components/TeacherLogin";
import TeacherDashboard from "./components/TeacherDashboard";

type Screen =
  | "student_welcome"
  | "student_exam"
  | "student_success"
  | "student_score_lookup"
  | "teacher_login"
  | "teacher_dashboard";

// ฟังก์ชันพิเศษสำหรับแกะรหัส ID จาก URL ของ Google Sheets ทั้งแบบสั้นและแบบยาว
const extractSpreadsheetId = (urlOrId: string | null): string | null => {
  if (!urlOrId) return null;
  // ถ้ายื่นมาเป็น URL ยาว เช่น https://docs.google.com/spreadsheets/d/1XYZ.../edit
  const matches = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (matches && matches[1]) {
    return matches[1];
  }
  // ถ้าไม่ใช่ URL ยาว ให้มองว่าเป็น ID ตรงๆ ตัว
  return urlOrId.trim();
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("student_welcome");

  // Local State
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    spreadsheetId: null,
    spreadsheetUrl: null,
    lastSyncedAt: null,
    isSyncing: false,
    error: null,
  });

  // User sessions
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<Submission | null>(null);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [isOAuthConnected, setIsOAuthConnected] = useState(false);

  // Public sheets synchronization states for student interface
  const [isLoadingPublicData, setIsLoadingPublicData] = useState(false);
  const [publicDataError, setPublicDataError] = useState<string | null>(null);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);

  const loadPublicData = async (sheetId: string) => {
    const cleanSheetId = extractSpreadsheetId(sheetId);
    if (!cleanSheetId) return false;

    setIsLoadingPublicData(true);
    setPublicDataError(null);
    try {
      const fetched = await fetchPublicSheetsData(cleanSheetId);
      if (fetched) {
        if (fetched.students.length > 0) {
          setStudents(fetched.students);
          localStorage.setItem("exam_students", JSON.stringify(fetched.students));
        }
        if (fetched.exams.length > 0) {
          setExams(fetched.exams);
          localStorage.setItem("exam_exams", JSON.stringify(fetched.exams));
        }
        if (fetched.settings) {
          const mergedSettings = { ...DEFAULT_SETTINGS, ...fetched.settings };
          setSettings(mergedSettings);
          localStorage.setItem("exam_settings", JSON.stringify(mergedSettings));
        }
        // Update local sync status
        const updatedSync: SyncStatus = {
          spreadsheetId: cleanSheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanSheetId}/edit`,
          lastSyncedAt: new Date().toISOString(),
          isSyncing: false,
          error: null,
        };
        setSyncStatus(updatedSync);
        localStorage.setItem("exam_sync_status", JSON.stringify(updatedSync));
        setActiveSheetId(cleanSheetId);
        return true;
      } else {
        setPublicDataError(
          "ไม่สามารถโหลดข้อสอบจาก Google Sheets นี้ได้ เนื่องจากสิทธิ์เข้าถึงไม่ถูกต้อง หรือไฟล์ไม่ตรงตามรูปแบบของแอป " +
          "กรุณาตรวจสอบว่าไฟล์ถูกแชร์แบบ 'ทุกคนที่มีลิงก์มีสิทธิ์อ่าน (Anyone with the link can view)' เรียบร้อยแล้ว"
        );
        return false;
      }
    } catch (err) {
      console.error("Public fetch failed:", err);
      setPublicDataError("เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อดึงข้อสอบล่าสุด กรุณาลองใหม่อีกครั้ง");
      return false;
    } finally {
      setIsLoadingPublicData(false);
    }
  };

  const handleResetToDemo = () => {
    localStorage.removeItem("student_active_sheet_id");
    setActiveSheetId(null);
    setPublicDataError(null);
    
    // Clear custom data back to demo data
    setStudents(DEFAULT_STUDENTS);
    localStorage.setItem("exam_students", JSON.stringify(DEFAULT_STUDENTS));
    setExams(DEFAULT_EXAMS);
    localStorage.setItem("exam_exams", JSON.stringify(DEFAULT_EXAMS));
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem("exam_settings", JSON.stringify(DEFAULT_SETTINGS));
    
    const clearedSync: SyncStatus = {
      spreadsheetId: null,
      spreadsheetUrl: null,
      lastSyncedAt: null,
      isSyncing: false,
      error: null,
    };
    setSyncStatus(clearedSync);
    localStorage.setItem("exam_sync_status", JSON.stringify(clearedSync));
    
    // Clear URL query params
    if (typeof window !== "undefined" && window.history.pushState) {
      const newurl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.pushState({ path: newurl }, "", newurl);
    }
  };

  // 1. Initial State Load from LocalStorage
  useEffect(() => {
    const localStudents = localStorage.getItem("exam_students");
    const localExams = localStorage.getItem("exam_exams");
    const localSubmissions = localStorage.getItem("exam_submissions");
    const localSettings = localStorage.getItem("exam_settings");
    const localSync = localStorage.getItem("exam_sync_status");

    if (localStudents) {
      setStudents(JSON.parse(localStudents));
    } else {
      setStudents(DEFAULT_STUDENTS);
      localStorage.setItem("exam_students", JSON.stringify(DEFAULT_STUDENTS));
    }

    if (localExams) {
      setExams(JSON.parse(localExams));
    } else {
      setExams(DEFAULT_EXAMS);
      localStorage.setItem("exam_exams", JSON.stringify(DEFAULT_EXAMS));
    }

    if (localSubmissions) {
      setSubmissions(JSON.parse(localSubmissions));
    } else {
      setSubmissions(DEFAULT_SUBMISSIONS);
      localStorage.setItem("exam_submissions", JSON.stringify(DEFAULT_SUBMISSIONS));
    }

    if (localSettings) {
      setSettings(JSON.parse(localSettings));
    } else {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem("exam_settings", JSON.stringify(DEFAULT_SETTINGS));
    }

    if (localSync) {
      const parsedSync = JSON.parse(localSync);
      setSyncStatus(parsedSync);
      if (parsedSync.spreadsheetId) {
        setActiveSheetId(parsedSync.spreadsheetId);
      }
    }

    // แก้ไขจุดที่ 1: ดึงค่าจากพารามิเตอร์แล้วนำไปสกัดหาไอดีที่ถูกต้องทันที รองรับทั้งลิงก์สั้นและยาว
    const urlParams = new URLSearchParams(window.location.search);
    const sheetIdParam = urlParams.get("sheetId");
    
    if (sheetIdParam) {
      const cleanId = extractSpreadsheetId(sheetIdParam);
      if (cleanId) {
        localStorage.setItem("student_active_sheet_id", cleanId);
        loadPublicData(cleanId);
      }
    } else {
      const savedSheetId = localStorage.getItem("student_active_sheet_id");
      if (savedSheetId) {
        loadPublicData(savedSheetId);
      }
    }
  }, []);

  // Firestore Synchronizer on startup
  useEffect(() => {
    testConnection();
    
    const loadFirestoreData = async () => {
      try {
        const firestoreData = await pullAllFromFirestore();
        if (firestoreData) {
          const { students: fStudents, exams: fExams, submissions: fSubmissions, settings: fSettings } = firestoreData;
          
          if (fExams.length > 0) {
            setExams(fExams);
            localStorage.setItem("exam_exams", JSON.stringify(fExams));
            
            setStudents(fStudents);
            localStorage.setItem("exam_students", JSON.stringify(fStudents));
            
            setSubmissions(fSubmissions);
            localStorage.setItem("exam_submissions", JSON.stringify(fSubmissions));
            
            if (fSettings) {
              setSettings(fSettings);
              localStorage.setItem("exam_settings", JSON.stringify(fSettings));
            }
            console.log("Successfully synchronized and loaded all data from Firestore!");
          } else {
            console.log("Firestore database is empty. Seeding with default data...");
            const currentStudents = JSON.parse(localStorage.getItem("exam_students") || "[]");
            const currentExams = JSON.parse(localStorage.getItem("exam_exams") || "[]");
            const currentSubmissions = JSON.parse(localStorage.getItem("exam_submissions") || "[]");
            const currentSettings = JSON.parse(localStorage.getItem("exam_settings") || JSON.stringify(DEFAULT_SETTINGS));
            
            await pushAllToFirestore(
              currentStudents.length > 0 ? currentStudents : DEFAULT_STUDENTS,
              currentExams.length > 0 ? currentExams : DEFAULT_EXAMS,
              currentSubmissions.length > 0 ? currentSubmissions : DEFAULT_SUBMISSIONS,
              currentSettings
            );
            console.log("Successfully seeded Firestore with standard dataset.");
          }
        }
      } catch (e) {
        console.error("Failed to load initial data from Firestore:", e);
      }
    };
    
    loadFirestoreData();
  }, []);

  // 2. Local State Persister
  const saveStateToLocal = (
    updatedStudents?: Student[],
    updatedExams?: Exam[],
    updatedSubmissions?: Submission[],
    updatedSettings?: SystemSettings
  ) => {
    if (updatedStudents) {
      setStudents(updatedStudents);
      localStorage.setItem("exam_students", JSON.stringify(updatedStudents));
      syncStudentsToFirestore(updatedStudents).catch(err => console.error("Firestore student sync failed:", err));
    }
    if (updatedExams) {
      setExams(updatedExams);
      localStorage.setItem("exam_exams", JSON.stringify(updatedExams));
      syncExamsToFirestore(updatedExams).catch(err => console.error("Firestore exam sync failed:", err));
    }
    if (updatedSubmissions) {
      setSubmissions(updatedSubmissions);
      localStorage.setItem("exam_submissions", JSON.stringify(updatedSubmissions));
      syncSubmissionsToFirestore(updatedSubmissions).catch(err => console.error("Firestore submission sync failed:", err));
    }
    if (updatedSettings) {
      setSettings(updatedSettings);
      localStorage.setItem("exam_settings", JSON.stringify(updatedSettings));
      saveSettingsToFirestore(updatedSettings).catch(err => console.error("Firestore settings sync failed:", err));
    }
  };

  // 3. Google Drive / Sheets Synchronizer and State Pushing
const pushStateToSheets = async (
    updatedStudents?: Student[],
    updatedExams?: Exam[],
    updatedSubmissions?: Submission[],
    updatedSettings?: SystemSettings
  ) => {
    // บันทึกลงบราวเซอร์ทันที
    saveStateToLocal(updatedStudents, updatedExams, updatedSubmissions, updatedSettings);

    const targetSheetId = syncStatus.spreadsheetId || activeSheetId;
    const token = getAccessToken();

    if (token && targetSheetId) {
      try {
        // ดึงข้อมูลล่าสุดจาก Sheets มาเช็คก่อนที่จะส่ง เพื่อไม่ให้ไปเขียนทับสิ่งที่ครูลบในชีท
        const fetched = await fetchFromSheets(token, targetSheetId);
        
        let studentsToSync = updatedStudents !== undefined ? updatedStudents : (fetched?.students || JSON.parse(localStorage.getItem("exam_students") || "[]"));
        let examsToSync = updatedExams !== undefined ? updatedExams : (fetched?.exams || JSON.parse(localStorage.getItem("exam_exams") || "[]"));
        let submissionsToSync = updatedSubmissions !== undefined ? updatedSubmissions : (fetched?.submissions || JSON.parse(localStorage.getItem("exam_submissions") || "[]"));
        let settingsToSync = updatedSettings !== undefined ? updatedSettings : (fetched?.settings || JSON.parse(localStorage.getItem("exam_settings") || JSON.stringify(DEFAULT_SETTINGS)));

        // อัปเดตในเครื่องให้ตรงกับชีทด้วย
        setStudents(studentsToSync);
        setExams(examsToSync);
        setSubmissions(submissionsToSync);

        await syncLocalToSheets(
          token,
          targetSheetId,
          studentsToSync,
          examsToSync,
          submissionsToSync,
          settingsToSync
        );

        const nextSync: SyncStatus = {
          ...syncStatus,
          spreadsheetId: targetSheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSheetId}/edit`,
          lastSyncedAt: new Date().toISOString(),
          isSyncing: false,
          error: null,
        };
        setSyncStatus(nextSync);
        localStorage.setItem("exam_sync_status", JSON.stringify(nextSync));
      } catch (err: any) {
        console.error("Direct push to Google Sheets failed:", err);
      }
    }
  };

  const handleFullSync = async (forceToken?: string) => {
    const token = forceToken || getAccessToken();
    if (!token) {
      setSyncStatus((prev) => ({ ...prev, error: "ไม่มีความถูกต้องของผู้มีสิทธิ์" }));
      return;
    }

    setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      let sheetId = syncStatus.spreadsheetId;
      let sheetUrl = syncStatus.spreadsheetUrl;

      if (!sheetId) {
        sheetId = await searchDatabaseSpreadsheet(token);
      }

      if (!sheetId) {
        const createResult = await createDatabaseSpreadsheet(token);
        sheetId = createResult.spreadsheetId;
        sheetUrl = createResult.spreadsheetUrl;
      }

      if (!sheetId) {
        throw new Error("ล้มเหลวในการดึงข้อมูลหรือจัดสร้างสเปรดชีต");
      }

      const currentLocals = {
        students: JSON.parse(localStorage.getItem("exam_students") || "[]"),
        exams: JSON.parse(localStorage.getItem("exam_exams") || "[]"),
        submissions: JSON.parse(localStorage.getItem("exam_submissions") || "[]"),
        settings: JSON.parse(localStorage.getItem("exam_settings") || JSON.stringify(DEFAULT_SETTINGS)),
      };

      const fetched = await fetchFromSheets(token, sheetId);
      let mergedStudents = currentLocals.students;
      let mergedExams = currentLocals.exams;
      let mergedSubmissions = currentLocals.submissions;
      let mergedSettings = currentLocals.settings;

      if (fetched) {
        const isSheetEmpty = 
          fetched.students.length === 0 && 
          fetched.exams.length === 0 && 
          fetched.submissions.length === 0;

        if (isSheetEmpty) {
          // ถ้าสเปรดชีตว่างเปล่าจริงๆ (เช่นเพิ่งสร้างใหม่) ค่อยเอาจากในเว็บอัปโหลดขึ้นไป
          mergedStudents = currentLocals.students;
          mergedExams = currentLocals.exams;
          mergedSubmissions = currentLocals.submissions;
          mergedSettings = currentLocals.settings;
        } else {
          // ✨ ปรับโค้ดตรงนี้: ให้ถือเอา Google Sheets เป็น "ความจริงสูงสุด" 
          // ถ้าคุณครูลบแถวไหนใน Sheets ออกไป พอซิงค์ปุ๊บ ในเว็บจะถูกลบตามทันที!
          mergedStudents = fetched.students;
          mergedExams = fetched.exams;
          mergedSubmissions = fetched.submissions; // เปลี่ยนจากเดิมที่เอามาบวกกัน ให้เชื่อตาม Sheets 100%
          mergedSettings = { ...currentLocals.settings, ...fetched.settings };
        }
      }

      // บันทึกข้อมูลลงบราวเซอร์และ Firestore ตามที่ Sheets กำหนดมา
      saveStateToLocal(mergedStudents, mergedExams, mergedSubmissions, mergedSettings);

      // เขียนข้อมูลที่ตรงกันกลับไปที่ Sheets อีกครั้งเพื่อความชัวร์
      await syncLocalToSheets(
        token,
        sheetId,
        mergedStudents,
        mergedExams,
        mergedSubmissions,
        mergedSettings
      );

      const nextSync: SyncStatus = {
        spreadsheetId: sheetId,
        spreadsheetUrl: sheetUrl || `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
        lastSyncedAt: new Date().toISOString(),
        isSyncing: false,
        error: null,
      };

      setSyncStatus(nextSync);
      localStorage.setItem("exam_sync_status", JSON.stringify(nextSync));
    } catch (err: any) {
      console.error("Full Sync Error:", err);
      
      const isAuthError = err?.message?.includes("invalid authentication credentials") || 
                          err?.message?.includes("Expected OAuth 2") ||
                          err?.message?.includes("401");
      
      let userFriendlyError = err?.message || "เกิดข้อผิดพลาดในการซิงค์ข้อมูล";
      
      if (isAuthError) {
        userFriendlyError = "เซสชัน Google Sheets หมดอายุหรือไม่ได้เปิดสิทธิ์กรุณากดคลิกปุ่ม 'เชื่อมโยง Google Drive & Sheets' อีกครั้งเพื่อต่ออายุและยืนยันสิทธิ์";
        setIsOAuthConnected(false);
        logout();
      }

      const nextSync: SyncStatus = {
        ...syncStatus,
        isSyncing: false,
        error: userFriendlyError,
      };
      setSyncStatus(nextSync);
      localStorage.setItem("exam_sync_status", JSON.stringify(nextSync));
    }
  };

  // 4. Auth Auto-reconnect initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setIsOAuthConnected(true);
        setTeacherEmail(user.email || "");
        handleFullSync(token);
      },
      () => {
        setIsOAuthConnected(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Student Entering Exam Room
  const handleEnterExamRoom = (studentId: string) => {
    const studentObj = students.find((s) => s.id === studentId);
    if (studentObj) {
      setCurrentStudent(studentObj);
      setCurrentScreen("student_exam");
    }
  };

  // Student Submitting Exam
  const handleExamSubmitted = async (submission: Submission) => {
    const nextSubmissions = [submission, ...submissions];
    // เรียกใช้งานฟังก์ชันพุชข้อมูลขึ้น Google Sheets ที่อัปเดตใหม่
    await pushStateToSheets(undefined, undefined, nextSubmissions);
    setLatestSubmission(submission);
    setCurrentScreen("student_success");
  };

  // Manual Trigger Google Sheet authentication popup
  const handleConnectGoogle = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setIsOAuthConnected(true);
        setTeacherEmail(result.user.email || "");
        handleFullSync(result.accessToken);
      }
    } catch (err: any) {
      console.error("Google sync authorization cancelled:", err);
      let errMsg = err?.message || "การตรวจสอบสิทธิ์ล้มเหลว หรือ ป๊อปอัพถูกบล็อก";
      errMsg = errMsg.replace("IFRAME_POPUP_BLOCKED: ", "")
                     .replace("UNAUTHORIZED_DOMAIN: ", "")
                     .replace("POPUP_BLOCKED: ", "");
      setSyncStatus((prev) => ({
        ...prev,
        error: errMsg
      }));
    }
  };

  // Teacher Logging In
  const handleTeacherLoginSuccess = (email: string, oauthConnected: boolean) => {
    setTeacherEmail(email);
    setIsOAuthConnected(oauthConnected);
    setCurrentScreen("teacher_dashboard");
    if (oauthConnected) {
      handleFullSync();
    }
  };

  // Teacher Logging Out
  const handleTeacherLogout = async () => {
    if (window.confirm("คุณต้องการออกจากระบบหรือไม่?")) {
      await logout();
      setIsOAuthConnected(false);
      setTeacherEmail("");
      setCurrentScreen("student_welcome");
    }
  };

  // Default bulk roster data populator
  const handleBulkLoadDefaults = () => {
    if (window.confirm("คุณแน่ใจที่จะคืนค่ารายชื่อนักเรียนเริ่มต้นทั้งหมดหรือไม่?")) {
      pushStateToSheets(DEFAULT_STUDENTS);
    }
  };

  // Clear roster
  const handleClearRoster = () => {
    pushStateToSheets([]);
  };

  return (
    <div className="min-h-screen">
      {/* 1. STUDENT WELCOME SCREEN */}
      {currentScreen === "student_welcome" && (
        <StudentWelcome
          students={students}
          submissions={submissions}
          activeExams={exams}
          onEnterExamRoom={handleEnterExamRoom}
          onGoToTeacherLogin={() => setCurrentScreen("teacher_login")}
          onGoToScoreLookup={() => setCurrentScreen("student_score_lookup")}
          isLoadingPublicData={isLoadingPublicData}
          publicDataError={publicDataError}
          activeSheetId={activeSheetId}
          onResetToDemo={handleResetToDemo}
          onRetryLoadPublicData={() => activeSheetId && loadPublicData(activeSheetId)}
        />
      )}

      {/* 2. STUDENT ACTIVE EXAM CENTER */}
      {currentScreen === "student_exam" && currentStudent && (
        <StudentExamRoom
          student={currentStudent}
          activeExams={exams}
          submissions={submissions}
          onExamSubmitted={handleExamSubmitted}
          onGoBack={() => {
            setCurrentStudent(null);
            setCurrentScreen("student_welcome");
          }}
        />
      )}

      {/* 3. STUDENT EXAM SUBMISSION SUCCESS */}
      {currentScreen === "student_success" && latestSubmission && (
        <ExamSuccess
          submission={latestSubmission}
          exams={exams}
          onGoHome={() => {
            setCurrentStudent(null);
            setLatestSubmission(null);
            setCurrentScreen("student_welcome");
          }}
          onCheckStatus={() => {
            setCurrentScreen("student_score_lookup");
          }}
        />
      )}

      {/* 4. STUDENT INDIVIDUAL SCORE LOOKUP */}
      {currentScreen === "student_score_lookup" && (
        <StudentScoreLookup
          students={students}
          submissions={submissions}
          exams={exams}
          onGoBack={() => {
            setCurrentStudent(null);
            setLatestSubmission(null);
            setCurrentScreen("student_welcome");
          }}
        />
      )}

      {/* 5. TEACHER LOGIN CENTER */}
      {currentScreen === "teacher_login" && (
        <TeacherLogin
          onLoginSuccess={handleTeacherLoginSuccess}
          onGoBack={() => setCurrentScreen("student_welcome")}
        />
      )}

      {/* 6. TEACHER ADMINISTRATIVE DASHBOARD */}
      {currentScreen === "teacher_dashboard" && (
        <TeacherDashboard
          teacherEmail={teacherEmail}
          students={students}
          onAddStudent={(newStudent) => {
            const next = [newStudent, ...students];
            pushStateToSheets(next);
          }}
          onDeleteStudent={(id) => {
            const next = students.filter((s) => s.id !== id);
            pushStateToSheets(next);
          }}
          onBulkLoadDefaults={handleBulkLoadDefaults}
          onClearRoster={handleClearRoster}
          exams={exams}
          onAddExam={(newExam) => {
            const next = [newExam, ...exams];
            pushStateToSheets(undefined, next);
          }}
          onDeleteExam={(id) => {
            const next = exams.filter((e) => e.id !== id);
            pushStateToSheets(undefined, next);
          }}
          onToggleActive={(id) => {
            const next = exams.map((e) => (e.id === id ? { ...e, isActive: !e.isActive } : e));
            pushStateToSheets(undefined, next);
          }}
          onUpdateExam={(updatedExam) => {
            const next = exams.map((e) => (e.id === updatedExam.id ? updatedExam : e));
            pushStateToSheets(undefined, next);
          }}
          submissions={submissions}
          onDeleteSubmission={(id) => {
            const next = submissions.filter((s) => s.submissionId !== id);
            pushStateToSheets(undefined, undefined, next);
          }}
          onUpdateSubmission={(updatedSubmission) => {
            const next = submissions.map((s) =>
              s.submissionId === updatedSubmission.submissionId ? updatedSubmission : s
            );
            pushStateToSheets(undefined, undefined, next);
          }}
          settings={settings}
          onUpdateSettings={(newSettings) => {
            pushStateToSheets(undefined, undefined, undefined, newSettings);
          }}
          onDiscardSettings={() => {
            setSettings(JSON.parse(localStorage.getItem("exam_settings") || JSON.stringify(DEFAULT_SETTINGS)));
          }}
          syncStatus={syncStatus}
          onTriggerSync={() => handleFullSync()}
          onConnectGoogle={handleConnectGoogle}
          onLogout={handleTeacherLogout}
        />
      )}
    </div>
  );
}
