import React, { useState, useEffect, useRef } from "react";
import { Student, Exam, Submission, SystemSettings, SyncStatus } from "./types";
import {
  DEFAULT_STUDENTS,
  DEFAULT_EXAMS,
  DEFAULT_SETTINGS,
} from "./lib/mockData";
import { initAuth, getAccessToken, logout, googleSignIn, db } from "./lib/firebase";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import {
  searchDatabaseSpreadsheet,
  createDatabaseSpreadsheet,
  syncLocalToSheets,
  fetchFromSheets,
  mergeSubmissionsPreservingDrawings,
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

// -------------------------------------------------------------
// 1. ใส่รหัส Google Sheets ID หรือ ลิงก์เผยแพร่เว็บ (2PACX-...) ของคุณครูที่นี่
// -------------------------------------------------------------
const MY_MASTER_SHEET_ID = "2PACX-1vSzmn3y4fHvfUMB7S3owYx4SkNG4kcYoBlwSzNv0yCD0a6dvcFhMk4VsKItz25GWvHcOzJ4HN9oM1Tt";

const withoutAnswerKeys = (source: Exam[]): Exam[] => source.map((exam) => ({
  ...exam,
  questions: exam.questions.map(({ answerIndex: _answerIndex, ...question }) => question),
}));

// 🛠️ แก้ไขฟังก์ชันให้รองรับการแกะ ID จาก URL ทั่วไป และ ลิงก์เผยแพร่องค์กร (/d/e/) อย่างถูกต้อง ไม่หลุดเป็นคำว่า "e"
const extractSpreadsheetId = (urlOrId: string | null): string | null => {
  if (!urlOrId) return null;
  
  // เช็คแพทเทิร์น /d/e/ ก่อน (สำหรับลิงก์เผยแพร่เว็บ)
  const eMatches = urlOrId.match(/\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (eMatches && eMatches[1]) {
    return eMatches[1];
  }
  
  // เช็คแพทเทิร์น /d/ ปกติ
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
  const [publicExams, setPublicExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const savedData = localStorage.getItem("savedTeacherSettings");
    return savedData ? JSON.parse(savedData) : DEFAULT_SETTINGS;
  });

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

  // 📡 ระบบดึงข้อมูลเรียลไทม์ฝั่งคุณครูแบบปลอดภัย
  useEffect(() => {
    if (currentScreen !== "teacher_dashboard") return;

    console.log("📡 เริ่มต้นระบบการดึงข้อมูลแดชบอร์ดคุณครูให้เป็นปัจจุบันแบบอัตโนมัติ...");
    
    const fetchLatestData = async () => {
      try {
        const firestoreData = await pullAllFromFirestore();
        if (firestoreData && firestoreData.submissions) {
          setSubmissions(firestoreData.submissions);
          localStorage.setItem("exam_submissions", JSON.stringify(firestoreData.submissions));
          console.log("🔄 อัปเดตข้อมูลคะแนนสอบล่าสุดจากคลาวด์เรียบร้อย");
        }
      } catch (err) {
        console.error("Failed to auto-pull data:", err);
      }
    };

    fetchLatestData();
    const intervalId = setInterval(fetchLatestData, 5000);

    return () => {
      clearInterval(intervalId);
      console.log("🔌 ปิดระบบดึงข้อมูลแดชบอร์ดคุณครูอัตโนมัติ");
    };
  }, [currentScreen]);

  const loadPublicData = async () => {
    setIsLoadingPublicData(true);
    setPublicDataError(null);
    try {
      const snapshot = await getDocs(collection(db, "exams_public"));
      const safeExams = snapshot.docs.map((examDoc) => ({
        id: examDoc.id,
        ...examDoc.data(),
      })) as Exam[];
      setPublicExams(safeExams);
      localStorage.setItem("exam_public_exams", JSON.stringify(safeExams));
      return true;
    } catch (err: any) {
      console.error("Public exam fetch failed:", err);
      setPublicDataError("ไม่สามารถโหลดข้อสอบสำหรับนักเรียนได้ กรุณาลองใหม่อีกครั้ง");
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
    const safeDemoExams = withoutAnswerKeys(DEFAULT_EXAMS);
    setPublicExams(safeDemoExams);
    localStorage.setItem("exam_public_exams", JSON.stringify(safeDemoExams));
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

  // ⚡ ระบบเปิดตัวแอปพลิเคชัน: ดึงข้อมูลด่วนจากคลาวด์ Firebase Firestore แทน Google Sheets
  useEffect(() => {
    testConnection(); // ทดสอบการเชื่อมต่อฐานข้อมูลเบื้องต้น

    const initializeApp = async () => {
      setIsLoadingPublicData(true);
      setPublicDataError(null);
      
      // 1. ดึงข้อมูลจากความจำเครื่อง (LocalStorage) ขึ้นมาแสดงผลก่อนทันที เพื่อไม่ให้นักเรียนต้องรอนาน
      const localStudents = localStorage.getItem("exam_students");
      const localPublicExams = localStorage.getItem("exam_public_exams");
      const localSettings = localStorage.getItem("exam_settings");
      const localSync = localStorage.getItem("exam_sync_status");

      if (localStudents) setStudents(JSON.parse(localStudents));
      else setStudents(DEFAULT_STUDENTS);

      if (localPublicExams) setPublicExams(JSON.parse(localPublicExams));
      else setPublicExams([]);

      // Never hydrate answer keys into an unauthenticated student session.
      localStorage.removeItem("exam_exams");

      // Submission answers are teacher-only data. Never hydrate a previous
      // teacher session into an unauthenticated student page.
      setSubmissions([]);
      localStorage.removeItem("exam_submissions");

      if (localSettings) setSettings(JSON.parse(localSettings));
      else setSettings(DEFAULT_SETTINGS);

      if (localSync) {
        const parsedSync = JSON.parse(localSync);
        setSyncStatus(parsedSync);
        if (parsedSync.spreadsheetId) setActiveSheetId(parsedSync.spreadsheetId);
      }

      // 2. ดึงข้อมูลชุดล่าสุดแบบ เร็วแรง จาก Firebase Firestore
      try {
        console.log("🔥 กำลังอัปเดตรายชื่อและข้อสอบล่าสุดจากระบบคลาวด์ Firebase...");
        

        let fExams: Exam[] = [];
        try {
          // Student browsers only receive the public collection.
          const examsSnapshot = await getDocs(collection(db, "exams_public"));
          fExams = examsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Exam[];
          console.log(`✅ ดึงข้อมูลข้อสอบสำเร็จ (${fExams.length} ชุด)`);
        } catch (examErr) {
          console.error("❌ ดึงข้อมูลข้อสอบจาก Firestore ล้มเหลว:", examErr);
        }

        const fSettings = localSettings ? JSON.parse(localSettings) : null;
          
      

        if (fExams && fExams.length > 0) {
          setPublicExams(fExams);
          localStorage.setItem("exam_public_exams", JSON.stringify(fExams));
        }

  

        if (fSettings) {
          setSettings(fSettings);
          localStorage.setItem("exam_settings", JSON.stringify(fSettings));
        } else if (localSettings) {
          try {
            const parsedLocalSettings = JSON.parse(localSettings);
            if (parsedLocalSettings) {
              console.log("☁️ ระบบตรวจพบการตั้งค่าในเครื่องครู แต่คลาวด์ว่างเปล่า -> กำลังอัปโหลดขึ้น Firebase...");
              saveSettingsToFirestore(parsedLocalSettings).catch(err => console.error(err));
            }
          } catch (pErr) {
            console.error("Error parsing local settings:", pErr);
          }
        }
        console.log("⚡ อัปเดตข้อมูลห้องเรียนผ่าน Firebase เสร็จสิ้น");
      } catch (e) {
        console.error("Firebase Initialization Failed:", e);
      }



      setIsLoadingPublicData(false);
    };

    initializeApp();
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
      const safeExams = withoutAnswerKeys(updatedExams);
      setPublicExams(safeExams);
      localStorage.setItem("exam_exams", JSON.stringify(updatedExams));
      localStorage.setItem("exam_public_exams", JSON.stringify(safeExams));
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

    if (token && targetSheetId && !targetSheetId.startsWith("2PACX-")) {
      try {
        const fetched = await fetchFromSheets(token, targetSheetId);
        let studentsToSync = updatedStudents !== undefined ? updatedStudents : (fetched?.students || JSON.parse(localStorage.getItem("exam_students") || "[]"));
        let examsToSync = updatedExams !== undefined ? updatedExams : (fetched?.exams || JSON.parse(localStorage.getItem("exam_exams") || "[]"));
        let submissionsToSync = updatedSubmissions !== undefined 
          ? updatedSubmissions 
          : (fetched?.submissions 
              ? mergeSubmissionsPreservingDrawings(fetched.submissions, JSON.parse(localStorage.getItem("exam_submissions") || "[]"))
              : JSON.parse(localStorage.getItem("exam_submissions") || "[]"));
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

      if (!sheetId || sheetId.startsWith("2PACX-")) {
        sheetId = await searchDatabaseSpreadsheet(token);
      }
      
      if (!sheetId) {
        const createResult = await createDatabaseSpreadsheet(token);
        sheetId = createResult.spreadsheetId;
        sheetUrl = createResult.spreadsheetUrl;
      }

      if (!sheetId) throw new Error("ล้มเหลวในการดึงข้อมูลหรือจัดสร้างสเปรดชีต");

      const fetched = await fetchFromSheets(token, sheetId);
      
      const currentLocals = {
        students: JSON.parse(localStorage.getItem("exam_students") || "[]"),
        exams: JSON.parse(localStorage.getItem("exam_exams") || "[]"),
        submissions: JSON.parse(localStorage.getItem("exam_submissions") || "[]"),
        settings: JSON.parse(localStorage.getItem("exam_settings") || JSON.stringify(DEFAULT_SETTINGS)),
      };

      let mergedStudents = fetched && fetched.students && fetched.students.length > 0 ? fetched.students : currentLocals.students;
      let mergedExams = fetched && fetched.exams && fetched.exams.length > 0 ? fetched.exams : currentLocals.exams;
      let mergedSubmissions = fetched && fetched.submissions && fetched.submissions.length > 0 
        ? mergeSubmissionsPreservingDrawings(fetched.submissions, currentLocals.submissions) 
        : currentLocals.submissions;
      let mergedSettings = fetched && fetched.settings ? { ...currentLocals.settings, ...fetched.settings } : currentLocals.settings;

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
      
      console.log("✅ ซิงค์ข้อมูลฉลาดเรียบร้อย: ดึงรายชื่อนักเรียนจาก Sheets เข้าสู่แดชบอร์ดสำเร็จ!");
    } catch (err: any) {
      console.error("Full Sync Error:", err);
      let userFriendlyError = err?.message || "เกิดข้อผิดพลาดในการซิงค์ข้อมูล";
      setSyncStatus((prev) => ({ ...prev, isSyncing: false, error: userFriendlyError }));
    }
  };

  useEffect(() => {
  const unsubscribe = initAuth(
    (user) => {
      /**
       * Firebase Authentication
       * มีหน้าที่แค่บอกว่าใคร login อยู่
       *
       * ห้าม Google Sheets sync อัตโนมัติ
       */
      setTeacherEmail(
        user.email || ""
      );
    },
    () => {
      setTeacherEmail("");
      setIsOAuthConnected(false);
    }
  );

  return () => unsubscribe();
}, []);

  const handleEnterExamRoom = async (
  studentId: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetch("/api/student-access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId,
        examIds: publicExams.map((exam) => exam.id),
      }),
    });

    if (response.status === 404) {
      return {
        success: false,
        message:
          "ไม่พบรหัสนักเรียนนี้ในฐานข้อมูล กรุณาตรวจสอบอีกครั้ง",
      };
    }
    if (!response.ok) throw new Error("Student access request failed");

    const access = await response.json() as {
      student: Student;
      submissions: Submission[];
    };
    const studentObj = access.student;
    const studentSubmissions = access.submissions;

    // ตรวจเฉพาะข้อสอบที่เปิดอยู่
    const activeExams = publicExams.filter(
      (exam) => exam.isActive
    );

    const completedExamIds = new Set(
      studentSubmissions
        .filter(
          (submission) =>
            submission.status === "สมบูรณ์"
        )
        .map(
          (submission) => submission.examId
        )
    );

    const hasAvailableExam =
      activeExams.some(
        (exam) =>
          !completedExamIds.has(exam.id)
      );

    if (
      activeExams.length > 0 &&
      !hasAvailableExam
    ) {
      return {
        success: false,
        message:
          "คุณได้ส่งคำตอบของข้อสอบที่เปิดอยู่ครบแล้ว",
      };
    }

    setCurrentStudent(studentObj);

    // เก็บเฉพาะ submission ของนักเรียนคนนี้
    setSubmissions(studentSubmissions);

    setCurrentScreen("student_exam");

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "Student lookup failed:",
      error
    );

    return {
      success: false,
      message:
        "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
    };
  }
};

 const handleExamSubmitted = async (submission: Submission) => {
  if (isSubmittingRef.current) return;

  isSubmittingRef.current = true;

  try {
    /**
     * StudentExamRoom บันทึก submission
     * ลง Firestore เรียบร้อยแล้ว
     *
     * App.tsx มีหน้าที่เพียงอัปเดต UI
     * ห้าม sync submissions ทั้งหมดซ้ำ
     * และไม่ส่ง Google Sheets ระหว่างสอบ
     */

    setSubmissions((prev) => {
      const withoutDuplicate = prev.filter(
        (item) =>
          item.submissionId !== submission.submissionId
      );

      return [
        submission,
        ...withoutDuplicate,
      ];
    });

    setLatestSubmission(submission);

    setCurrentScreen("student_success");
  } catch (error) {
    console.error(
      "Unable to update submission UI:",
      error
    );
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
    
    try {
      const firestoreData = await pullAllFromFirestore();
      if (firestoreData) {
        setStudents(firestoreData.students);
        setExams(firestoreData.exams);
        setPublicExams(withoutAnswerKeys(firestoreData.exams));
        setSubmissions(firestoreData.submissions);
        if (firestoreData.settings) setSettings(firestoreData.settings);

        // บันทึกลงในเครื่องเพื่อรักษาภาพวาดเขียน (Drawing) และข้อมูลที่ซิงค์แบบเต็มรูปแบบจาก Firestore
        localStorage.setItem("exam_students", JSON.stringify(firestoreData.students));
        localStorage.setItem("exam_exams", JSON.stringify(firestoreData.exams));
        localStorage.setItem("exam_submissions", JSON.stringify(firestoreData.submissions));
        if (firestoreData.settings) {
          localStorage.setItem("exam_settings", JSON.stringify(firestoreData.settings));
        }
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
      setExams([]);
      setSubmissions([]);
      localStorage.removeItem("exam_exams");
      localStorage.removeItem("exam_submissions");
      setCurrentScreen("student_welcome");
    }
  };

  const handleBulkLoadDefaults = () => {
    const newDefaults = DEFAULT_STUDENTS.filter(
      (defaultStudent) => !students.some((existingStudent) => existingStudent.id === defaultStudent.id)
    );

    if (newDefaults.length === 0) {
      alert("รายชื่อตัวอย่างถูกเพิ่มเข้าระบบหมดแล้วครับ ไม่มีรายชื่อใหม่ให้เพิ่มเพิ่มเติม");
      return;
    }

    const combinedStudents = [...students, ...newDefaults];
    pushStateToSheets(combinedStudents);
    alert("เพิ่มรายชื่อนักเรียนตัวอย่างต่อท้ายระบบเรียบร้อยแล้วครับ! 🎉");
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
          activeExams={publicExams}
          onEnterExamRoom={handleEnterExamRoom}
          onGoToTeacherLogin={() => setCurrentScreen("teacher_login")}
          onGoToScoreLookup={() => setCurrentScreen("student_score_lookup")}
          isLoadingPublicData={isLoadingPublicData}
          publicDataError={publicDataError}
          activeSheetId={activeSheetId}
          onResetToDemo={handleResetToDemo}
          onRetryLoadPublicData={() => loadPublicData()}
        />
      )}

      {currentScreen === "student_exam" && currentStudent && (
        <StudentExamRoom
          student={currentStudent}
          activeExams={publicExams}
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
          exams={publicExams}
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
          exams={publicExams}
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
