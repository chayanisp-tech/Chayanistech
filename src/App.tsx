import React, { useState, useEffect, useRef } from "react";
import { Student, Exam, Submission, SystemSettings, SyncStatus } from "./types";
import {
  DEFAULT_STUDENTS,
  DEFAULT_EXAMS,
  DEFAULT_SETTINGS,
  DEFAULT_SUBMISSIONS,
} from "./lib/mockData";
import { initAuth, getAccessToken, logout, googleSignIn, db } from "./lib/firebase"; // ดึง db (Firestore) ออกมาใช้
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"; // นำเข้าโมดูล Firestore สำหรับ Real-time
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

const extractSpreadsheetId = (urlOrId: string | null): string | null => {
  if (!urlOrId) return null;
  const matches = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (matches && matches[1]) {
    return matches[1];
  }
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

  const isSubmittingRef = useRef(false);

  // 📡 ระบบดักฟังคะแนนสอบแบบ Real-time บนหน้าแดชบอร์ดครู
  useEffect(() => {
    if (currentScreen !== "teacher_dashboard" || !db) return;

    console.log("📡 ระบบ Real-time เฝ้าฟังคะแนนสอบจาก Firestore เริ่มทำงาน...");
    
    // ดักฟังห้อง "submissions" ในคลาวด์ เรียงลำดับตามเวลาส่งล่าสุด
    const q = query(collection(db, "submissions"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const realTimeSubmissions: Submission[] = [];
      snapshot.forEach((doc) => {
        realTimeSubmissions.push(doc.data() as Submission);
      });
      
      // อัปเดตข้อมูลขึ้นหน้าจอแดชบอร์ดคุณครูทันทีที่ตรวจพบว่ามีการส่งคะแนนเข้ามาใหม่!
      setSubmissions(realTimeSubmissions);
      localStorage.setItem("exam_submissions", JSON.stringify(realTimeSubmissions));
      console.log(`🔔 ตารางคุณครูได้รับการอัปเดตคะแนนแบบ Real-time แล้ว! ทั้งหมด ${realTimeSubmissions.length} รายการ`);
    }, (error) => {
      console.error("Firestore Real-time error:", error);
    });

    return () => {
      console.log("🔌 ปิดระบบดักฟัง Real-time เมื่อออกจากหน้าแดชบอร์ด");
      unsubscribe();
    };
  }, [currentScreen]);

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
        setPublicDataError("ไม่สามารถโหลดข้อสอบได้ กรุณาแชร์สิทธิ์เป็นทุกคนที่มีลิงก์มีสิทธิ์อ่าน");
        return false;
      }
    } catch (err) {
      console.error("Public fetch failed:", err);
      setPublicDataError("เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อดึงข้อสอบล่าสุด");
      return false;
    } finally {
      setIsLoadingPublicData(false);
    }
  };

  const handleResetToDemo = () => {
    localStorage.removeItem("student_active_sheet_id");
    setActiveSheetId(null);
    setPublicDataError(null);
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
  };

  useEffect(() => {
    const localStudents = localStorage.getItem("exam_students");
    const localExams = localStorage.getItem("exam_exams");
    const localSubmissions = localStorage.getItem("exam_submissions");
    const localSettings = localStorage.getItem("exam_settings");
    const localSync = localStorage.getItem("exam_sync_status");

    if (localStudents) setStudents(JSON.parse(localStudents));
    else setStudents(DEFAULT_STUDENTS);

    if (localExams) setExams(JSON.parse(localExams));
    else setExams(DEFAULT_EXAMS);

    if (localSubmissions) setSubmissions(JSON.parse(localSubmissions));
    else setSubmissions(DEFAULT_SUBMISSIONS);

    if (localSettings) setSettings(JSON.parse(localSettings));
    else setSettings(DEFAULT_SETTINGS);

    if (localSync) {
      const parsedSync = JSON.parse(localSync);
      setSyncStatus(parsedSync);
      if (parsedSync.spreadsheetId) setActiveSheetId(parsedSync.spreadsheetId);
    }

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
      if (savedSheetId) loadPublicData(savedSheetId);
    }
  }, []);

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
          }
        }
      } catch (e) {
        console.error("Failed to load initial data from Firestore:", e);
      }
    };
    loadFirestoreData();
  }, []);

  const saveStateToLocal = (
    updatedStudents?: Student[],
    updatedExams?: Exam[],
    updatedSubmissions?: Submission[],
    updatedSettings?: SystemSettings
  ) => {
    if (updatedStudents) {
      setStudents(updatedStudents);
      localStorage.setItem("exam_students", JSON.stringify(updatedStudents));
      syncStudentsToFirestore(updatedStudents).catch(err => console.error(err));
    }
    if (updatedExams) {
      setExams(updatedExams);
      localStorage.setItem("exam_exams", JSON.stringify(updatedExams));
      syncExamsToFirestore(updatedExams).catch(err => console.error(err));
    }
    if (updatedSubmissions) {
      setSubmissions(updatedSubmissions);
      localStorage.setItem("exam_submissions", JSON.stringify(updatedSubmissions));
      syncSubmissionsToFirestore(updatedSubmissions).catch(err => console.error(err));
    }
    if (updatedSettings) {
      setSettings(updatedSettings);
      localStorage.setItem("exam_settings", JSON.stringify(updatedSettings));
      saveSettingsToFirestore(updatedSettings).catch(err => console.error(err));
    }
  };

  const pushStateToSheets = async (
    updatedStudents?: Student[],
    updatedExams?: Exam[],
    updatedSubmissions?: Submission[],
    updatedSettings?: SystemSettings
  ) => {
    saveStateToLocal(updatedStudents, updatedExams, updatedSubmissions, updatedSettings);
    const targetSheetId = syncStatus.spreadsheetId || activeSheetId;
    const token = getAccessToken();

    if (token && targetSheetId) {
      try {
        const fetched = await fetchFromSheets(token, targetSheetId);
        let studentsToSync = updatedStudents !== undefined ? updatedStudents : (fetched?.students || JSON.parse(localStorage.getItem("exam_students") || "[]"));
        let examsToSync = updatedExams !== undefined ? updatedExams : (fetched?.exams || JSON.parse(localStorage.getItem("exam_exams") || "[]"));
        let submissionsToSync = updatedSubmissions !== undefined ? updatedSubmissions : (fetched?.submissions || JSON.parse(localStorage.getItem("exam_submissions") || "[]"));
        let settingsToSync = updatedSettings !== undefined ? updatedSettings : (fetched?.settings || JSON.parse(localStorage.getItem("exam_settings") || JSON.stringify(DEFAULT_SETTINGS)));

        setStudents(studentsToSync);
        setExams(examsToSync);
        setSubmissions(submissionsToSync);

        await syncLocalToSheets(token, targetSheetId, studentsToSync, examsToSync, submissionsToSync, settingsToSync);

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
        console.error("Direct push to Sheets failed:", err);
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

      if (!sheetId) sheetId = await searchDatabaseSpreadsheet(token);
      if (!sheetId) {
        const createResult = await createDatabaseSpreadsheet(token);
        sheetId = createResult.spreadsheetId;
        sheetUrl = createResult.spreadsheetUrl;
      }

      if (!sheetId) throw new Error("ล้มเหลวในการดึงข้อมูลหรือจัดสร้างสเปรดชีต");

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
        const isSheetEmpty = fetched.students.length === 0 && fetched.exams.length === 0 && fetched.submissions.length === 0;
        if (!isSheetEmpty) {
          mergedStudents = fetched.students;
          mergedExams = fetched.exams;
          mergedSubmissions = fetched.submissions;
          mergedSettings = { ...currentLocals.settings, ...fetched.settings };
        }
      }

      saveStateToLocal(mergedStudents, mergedExams, mergedSubmissions, mergedSettings);
      await syncLocalToSheets(token, sheetId, mergedStudents, mergedExams, mergedSubmissions, mergedSettings);

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
      let userFriendlyError = err?.message || "เกิดข้อผิดพลาดในการซิงค์ข้อมูล";
      setSyncStatus((prev) => ({ ...prev, isSyncing: false, error: userFriendlyError }));
    }
  };

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

  const handleEnterExamRoom = (studentId: string) => {
    const studentObj = students.find((s) => s.id === studentId);
    if (studentObj) {
      setCurrentStudent(studentObj);
      setCurrentScreen("student_exam");
    }
  };

  // 🚀 ฟังก์ชันส่งคำตอบนักเรียน: ยิงหา Cloud Firestore (เพื่อเด้งขึ้นเว็บครูทันที) และ Google Sheets แยกจากกันอัตโนมัติ
  const handleExamSubmitted = async (submission: Submission) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      // 1. อัปเดตข้อมูลเซฟลงบราวเซอร์เครื่องนักเรียน
      const nextSubmissions = [submission, ...submissions];
      setLatestSubmission(submission);
      setCurrentScreen("student_success");

      // 2. 📡 ยิงขึ้น Cloud Firestore ทันที (จะไปเด้งสะกิดหน้าจอแดชบอร์ดครูให้โชว์อัตโนมัติเรียลไทม์)
      await syncSubmissionsToFirestore(nextSubmissions);

      // 3. 📊 ยิงเข้า Google Sheets ของคุณครูโดยตรงแยกต่างหากผ่าน Web App อัตโนมัติ
      const webAppUrl = "https://script.google.com/macros/s/AKfycbxPc9UKoEkXe6GmhX4bjYlxNBdgYWfGV3ACJVkdobj3IgOIgbWRBRmTJyz3KlspfCCubg/exec"; 

      if (webAppUrl) {
        fetch(webAppUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submission: submission }),
        })
        .then(() => console.log("✅ คะแนนถูกส่งเข้า Google Sheets เรียบร้อย!"))
        .catch((err) => console.error("Sheets push error:", err));
      }

    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      isSubmittingRef.current = false;
    }
  };

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
    }
  };

  const handleTeacherLoginSuccess = async (email: string, oauthConnected: boolean) => {
    setTeacherEmail(email);
    setIsOAuthConnected(oauthConnected);
    setCurrentScreen("teacher_dashboard");
    
    // ดึงคะแนนจากคลาวด์มารอไว้เลยตั้งแต่ตอนล็อกอิน
    try {
      const firestoreData = await pullAllFromFirestore();
      if (firestoreData) {
        setStudents(firestoreData.students);
        setExams(firestoreData.exams);
        setSubmissions(firestoreData.submissions);
        if (firestoreData.settings) setSettings(firestoreData.settings);
      }
    } catch (err) {
      console.error(err);
    }

    if (oauthConnected) {
      handleFullSync();
    }
  };

  const handleTeacherLogout = async () => {
    if (window.confirm("คุณต้องการออกจากระบบหรือไม่?")) {
      await logout();
      setIsOAuthConnected(false);
      setTeacherEmail("");
      setCurrentScreen("student_welcome");
    }
  };

  const handleBulkLoadDefaults = () => {
    if (window.confirm("คุณแน่ใจที่จะคืนค่ารายชื่อนักเรียนเริ่มต้นหรือไม่?")) {
      pushStateToSheets(DEFAULT_STUDENTS);
    }
  };

  const handleClearRoster = () => {
    pushStateToSheets([]);
  };

  return (
    <div className="min-h-screen">
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

      {currentScreen === "student_success" && latestSubmission && (
        <ExamSuccess
          submission={latestSubmission}
          exams={exams}
          onGoHome={() => {
            setCurrentStudent(null);
            setLatestSubmission(null);
            setCurrentScreen("student_welcome");
          }}
          onCheckStatus={() => setCurrentScreen("student_score_lookup")}
        />
      )}

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

      {currentScreen === "teacher_login" && (
        <TeacherLogin
          onLoginSuccess={handleTeacherLoginSuccess}
          onGoBack={() => setCurrentScreen("student_welcome")}
        />
      )}

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
