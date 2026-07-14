import React, { useState, useEffect, useRef } from "react";
import { Student, Exam, Submission, SystemSettings, SyncStatus } from "./types";
import {
  DEFAULT_STUDENTS,
  DEFAULT_EXAMS,
  DEFAULT_SETTINGS,
  DEFAULT_SUBMISSIONS,
} from "./lib/mockData";
import { initAuth, getAccessToken, logout, googleSignIn, db } from "./lib/firebase";
import { collection, getDocs } from "firebase/firestore";
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

// -------------------------------------------------------------
// 1. ใส่รหัส Google Sheets ID หรือ ลิงก์เผยแพร่เว็บ (2PACX-...) ของคุณครูที่นี่
// -------------------------------------------------------------
const MY_MASTER_SHEET_ID = "2PACX-1vSzmn3y4fHvfUMB7S3owYx4SkNG4kcYoBlwSzNv0yCD0a6dvcFhMk4VsKItz25GWvHcOzJ4HN9oM1Tt";

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

  // 🛠️ ปรับปรุงฟังก์ชันโหลดข้อมูลให้เรียกผ่าน Dual-Mode Parser จาก googleSheets.ts โดยตรง ไม่ทำงานซ้อนกัน
  const loadPublicData = async (sheetId: string) => {
    const cleanSheetId = extractSpreadsheetId(sheetId);
    if (!cleanSheetId) return false;

    setIsLoadingPublicData(true);
    setPublicDataError(null);
    try {
      // เรียกใช้ฟังก์ชันหลักที่เราอัปเดตระบบ CSV ทะลุกำแพงไว้แล้ว
      const fetched = await fetchPublicSheetsData(cleanSheetId);
      
      if (fetched) {
        if (fetched.students && fetched.students.length > 0) {
          setStudents(fetched.students);
          localStorage.setItem("exam_students", JSON.stringify(fetched.students));
        }
        if (fetched.exams && fetched.exams.length > 0) {
          setExams(fetched.exams);
          localStorage.setItem("exam_exams", JSON.stringify(fetched.exams));
        }
        if (fetched.settings) {
          const mergedSettings = { ...DEFAULT_SETTINGS, ...fetched.settings };
          setSettings(mergedSettings);
          localStorage.setItem("exam_settings", JSON.stringify(mergedSettings));
        }
        
        const isPublishedToken = cleanSheetId.startsWith("2PACX-");
        const updatedSync: SyncStatus = {
          spreadsheetId: cleanSheetId,
          spreadsheetUrl: isPublishedToken 
            ? `https://docs.google.com/spreadsheets/d/e/${cleanSheetId}/pubhtml`
            : `https://docs.google.com/spreadsheets/d/${cleanSheetId}/edit`,
          lastSyncedAt: new Date().toISOString(),
          isSyncing: false,
          error: null,
        };
        setSyncStatus(updatedSync);
        localStorage.setItem("exam_sync_status", JSON.stringify(updatedSync));
        setActiveSheetId(cleanSheetId);

        alert(`📢 เชื่อมต่อ Google Sheets สำเร็จ!\n• ดึงรายชื่อนักเรียนได้ทั้งหมด: ${fetched.students?.length || 0} คน\n• ดึงข้อสอบได้ทั้งหมด: ${fetched.exams?.length || 0} ชุด`);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("Public fetch failed:", err);
      
      const isFailedToFetch = err instanceof TypeError || err.message?.includes("Failed to fetch") || err.message?.includes("fetch");
      
      if (err.message === "ORGANIZATION_RESTRICTED" || isFailedToFetch) {
        const errorMsg = "❌ บัญชีโรงเรียนบล็อกการเข้าถึงแบบสาธารณะ";
        setPublicDataError(errorMsg);
        
        alert(
          "⚠️ ตรวจพบข้อจำกัดความปลอดภัยของโรงเรียน! (Google Workspace Restriction)\n\n" +
          "เนื่องจากชีตนี้อยู่ภายใต้บัญชีโรงเรียน แม้คุณครูจะเปิดแชร์แล้ว แต่ระบบ Google จะบังคับให้เข้าสู่ระบบและบล็อกการดึงข้อมูลในโหมดไม่ระบุตัวตน (Incognito)\n\n" +
          "💡 วิธีการแก้ไขให้ผ่านทันที:\n" +
          "1. เปิดหน้า Google Sheets ของคุณครูขึ้นมา\n" +
          "2. ไปที่เมนู [ไฟล์] (File) > [แชร์] (Share) > [เผยแพร่ไปยังเว็บ] (Publish to the web)\n" +
          "3. คลิกปุ่ม [เผยแพร่] (Publish) และกดตกลง\n" +
          "4. ลองเปิดหน้าระบบสอบนี้ใหม่อีกครั้ง ระบบจะผ่านและสามารถดึงรายชื่อกับข้อสอบได้สำเร็จ 100% ครับ!"
        );
      } else {
        setPublicDataError("เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อดึงข้อสอบล่าสุด กรุณาตรวจสอบลิงก์ของท่าน");
      }
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

  // ⚡ ระบบเปิดตัวแอปพลิเคชัน: ดึงข้อมูลด่วนจากคลาวด์ Firebase Firestore แทน Google Sheets
  useEffect(() => {
    testConnection(); // ทดสอบการเชื่อมต่อฐานข้อมูลเบื้องต้น

    const initializeApp = async () => {
      setIsLoadingPublicData(true);
      setPublicDataError(null);
      
      // 1. ดึงข้อมูลจากความจำเครื่อง (LocalStorage) ขึ้นมาแสดงผลก่อนทันที เพื่อไม่ให้นักเรียนต้องรอนาน
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

      // 2. ดึงข้อมูลชุดล่าสุดแบบ เร็วแรง จาก Firebase Firestore
      try {
        console.log("🔥 กำลังอัปเดตรายชื่อและข้อสอบล่าสุดจากระบบคลาวด์ Firebase...");
        
        let fStudents: Student[] = [];
        try {
          // ดึงเฉพาะคอลเลกชันนักเรียน
          const studentsSnapshot = await getDocs(collection(db, "students"));
          fStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[];
          console.log(`✅ ดึงรายชื่อนักเรียนสำเร็จ (${fStudents.length} คน)`);
        } catch (studentErr) {
          console.error("❌ ดึงข้อมูลรายชื่อนักเรียนจาก Firestore ล้มเหลว:", studentErr);
        }

        let fExams: Exam[] = [];
        try {
          // ดึงเฉพาะคอลเลกชันข้อสอบ
          const examsSnapshot = await getDocs(collection(db, "exams"));
          fExams = examsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Exam[];
          console.log(`✅ ดึงข้อมูลข้อสอบสำเร็จ (${fExams.length} ชุด)`);
        } catch (examErr) {
          console.error("❌ ดึงข้อมูลข้อสอบจาก Firestore ล้มเหลว:", examErr);
        }

        // ประวัติ submissions และ settings ให้ใช้ตามความจำเครื่องไปก่อน เพื่อตัดปัญหาความหน่วงสะสม
        const fSubmissions = localSubmissions ? JSON.parse(localSubmissions) : [];
        const fSettings = localSettings ? JSON.parse(localSettings) : null;
          
        if (fStudents && fStudents.length > 0) {
          setStudents(fStudents);
          localStorage.setItem("exam_students", JSON.stringify(fStudents));
        } else if (localStudents) {
          try {
            const parsedLocalStudents = JSON.parse(localStudents);
            if (parsedLocalStudents.length > 0) {
              console.log("☁️ ระบบตรวจพบข้อมูลนักเรียนในเครื่องครู แต่คลาวด์ว่างเปล่า -> กำลังอัปโหลดขึ้น Firebase...");
              syncStudentsToFirestore(parsedLocalStudents).catch(err => console.error(err));
            }
          } catch (pErr) {
            console.error("Error parsing local students:", pErr);
          }
        }

        if (fExams && fExams.length > 0) {
          setExams(fExams);
          localStorage.setItem("exam_exams", JSON.stringify(fExams));
        } else if (localExams) {
          try {
            const parsedLocalExams = JSON.parse(localExams);
            if (parsedLocalExams.length > 0) {
              console.log("☁️ ระบบตรวจพบข้อสอบในเครื่องครู แต่คลาวด์ว่างเปล่า -> กำลังอัปโหลดขึ้น Firebase...");
              syncExamsToFirestore(parsedLocalExams).catch(err => console.error(err));
            }
          } catch (pErr) {
            console.error("Error parsing local exams:", pErr);
          }
        }

        if (fSubmissions && fSubmissions.length > 0) {
          setSubmissions(fSubmissions);
          localStorage.setItem("exam_submissions", JSON.stringify(fSubmissions));
        } else if (localSubmissions) {
          try {
            const parsedLocalSubmissions = JSON.parse(localSubmissions);
            if (parsedLocalSubmissions.length > 0) {
              console.log("☁️ ระบบตรวจพบประวัติส่งข้อสอบในเครื่องครู แต่คลาวด์ว่างเปล่า -> กำลังอัปโหลดขึ้น Firebase...");
              syncSubmissionsToFirestore(parsedLocalSubmissions).catch(err => console.error(err));
            }
          } catch (pErr) {
            console.error("Error parsing local submissions:", pErr);
          }
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

      // 3. ดึงรายชื่อนักเรียนและข้อสอบล่าสุดจากตาราง Google Sheets เสมอ (กรณีผู้ใช้เปิดจากเครื่องใหม่)
      if (MY_MASTER_SHEET_ID) {
        try {
          const cleanSheetId = extractSpreadsheetId(MY_MASTER_SHEET_ID);
          if (cleanSheetId) {
            console.log("📋 กำลังดึงรายชื่อและข้อสอบล่าสุดจากตารางหลัก Google Sheets เสนอคุณครู:", cleanSheetId);
            const fetched = await fetchPublicSheetsData(cleanSheetId);
            if (fetched) {
              if (fetched.students && fetched.students.length > 0) {
                setStudents(fetched.students);
                localStorage.setItem("exam_students", JSON.stringify(fetched.students));
              }
              if (fetched.exams && fetched.exams.length > 0) {
                setExams(fetched.exams);
                localStorage.setItem("exam_exams", JSON.stringify(fetched.exams));
              }
              if (fetched.settings) {
                const mergedSettings = { ...DEFAULT_SETTINGS, ...fetched.settings };
                setSettings(mergedSettings);
                localStorage.setItem("exam_settings", JSON.stringify(mergedSettings));
              }

              const isPublishedToken = cleanSheetId.startsWith("2PACX-");
              const updatedSync: SyncStatus = {
                spreadsheetId: cleanSheetId,
                spreadsheetUrl: isPublishedToken 
                  ? `https://docs.google.com/spreadsheets/d/e/${cleanSheetId}/pubhtml`
                  : `https://docs.google.com/spreadsheets/d/${cleanSheetId}/edit`,
                lastSyncedAt: new Date().toISOString(),
                isSyncing: false,
                error: null,
              };
              setSyncStatus(updatedSync);
              localStorage.setItem("exam_sync_status", JSON.stringify(updatedSync));
              setActiveSheetId(cleanSheetId);
              console.log("⚡ ซิงค์ตารางเรียน Google Sheets อัตโนมัติสำเร็จ!");
            }
          }
        } catch (sheetError) {
          console.error("Silent startup Google Sheets pull failed:", sheetError);
        }
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

    if (token && targetSheetId && !targetSheetId.startsWith("2PACX-")) {
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
      let mergedSubmissions = fetched && fetched.submissions && fetched.submissions.length > 0 ? fetched.submissions : currentLocals.submissions;
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

  const handleExamSubmitted = async (submission: Submission) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      const nextSubmissions = [submission, ...submissions];
      saveStateToLocal(undefined, undefined, nextSubmissions);
      
      setLatestSubmission(submission);
      setCurrentScreen("student_success");

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
