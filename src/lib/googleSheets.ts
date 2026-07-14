import { Student, Exam, Submission, SystemSettings } from "../types";

export interface SyncDataResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

// 1. ฟังก์ชันแปลงข้อมูล CSV คุณภาพสูง ปลอดภัยต่ออักขระภาษาจีนและเครื่องหมายคำพูด
function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  const lines = text.split(/\r?\n/);
  let currentLine: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    if (inQuotes && l > 0) currentCell += '\n';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentCell += '"'; 
          i++; 
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentLine.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    
    if (!inQuotes) {
      currentLine.push(currentCell.trim());
      if (currentLine.some(cell => cell !== '')) {
        result.push(currentLine);
      }
      currentLine = [];
      currentCell = '';
    }
  }
  return result;
}

// 2. ค้นหาไฟล์ตาราง ExamMaster_Database ใน Google Drive
export async function searchDatabaseSpreadsheet(token: string): Promise<string | null> {
  const query = encodeURIComponent("name = 'ExamMaster_Database' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  } catch (error) {
    console.error("Error searching database spreadsheet:", error);
    return null;
  }
}

// 3. สร้างตารางฐานข้อมูลใหม่ (กรณีหาไฟล์ไม่เจอ)
export async function createDatabaseSpreadsheet(token: string): Promise<SyncDataResult> {
  const url = "https://sheets.googleapis.com/v4/spreadsheets";
  const body = {
    properties: { title: "ExamMaster_Database" },
    sheets: [
      { properties: { title: "Students" } },
      { properties: { title: "Scores" } },
      { properties: { title: "Exams" } },
      { properties: { title: "Settings" } },
    ],
  };
  
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create Google Spreadsheet");
  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
}

async function clearSheetRange(token: string, spreadsheetId: string, range: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;
  await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
}

async function updateSheetRange(token: string, spreadsheetId: string, range: string, values: any[][]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
}

// 4. บันทึกข้อมูลและสำรองค่าจากเว็บแอปขึ้น Google Sheets (ระบบฝั่งครูสั่งอัปเดต)
export async function syncLocalToSheets(
  token: string,
  spreadsheetId: string,
  students: Student[],
  exams: Exam[],
  submissions: Submission[],
  settings: SystemSettings
): Promise<void> {
  try {
    // ซิงค์ข้อมูลนักเรียน
    await clearSheetRange(token, spreadsheetId, "Students!A:C");
    const studentValues = [
      ["รหัสนักเรียน", "ชื่อ-นามสกุล", "ชั้นเรียน"],
      ...students.map(s => [s.id, s.name, s.className]),
    ];
    await updateSheetRange(token, spreadsheetId, "Students!A1", studentValues);

    // ซิงค์ข้อสอบและคำถามทดสอบ
    await clearSheetRange(token, spreadsheetId, "Exams!A:G");
    const examValues = [
      ["รหัสข้อสอบ", "หัวข้อ", "รหัสวิชา", "คำอธิบาย", "คำถาม JSON", "เวลาสอบนาที", "สถานะเปิดสอบ"],
      ...exams.map(e => [
        e.id, e.title, e.courseCode, e.description,
        JSON.stringify(e.questions), e.timeLimitMinutes, e.isActive ? "TRUE" : "FALSE",
      ]),
    ];
    await updateSheetRange(token, spreadsheetId, "Exams!A1", examValues);

    // ซิงค์ผลคะแนนนักเรียน
    await clearSheetRange(token, spreadsheetId, "Scores!A:M");
    const scoreValues = [
      ["รหัสการส่ง", "รหัสนักเรียน", "ชื่อนักเรียน", "ชั้นเรียน", "รหัสข้อสอบ", "ชื่อข้อสอบ", "คะแนนที่ได้", "คะแนนเต็ม", "ทำไปทั้งหมด", "จำนวนข้อทั้งหมด", "เวลาที่ส่ง", "สถานะ", "คำตอบ JSON"],
      ...submissions.map(s => {
        // คลีนภาพวาดเขียนออกก่อนเขียนลงสเปรดชีตเพื่อเลี่ยงปัญหาเซลล์โดนตัดขาด (เกิน 50,000 ตัวอักษร)
        const cleanedAnswers = s.answers ? JSON.parse(JSON.stringify(s.answers)) : {};
        Object.keys(cleanedAnswers).forEach((qId) => {
          const ans = cleanedAnswers[qId];
          if (ans && typeof ans === "object" && ans.drawing) {
            cleanedAnswers[qId] = {
              ...ans,
              drawing: "__HAS_DRAWING__"
            };
          }
        });
        return [
          s.submissionId, s.studentId, s.studentName, s.studentClassName,
          s.examId, s.examTitle, s.score, s.totalPoints, s.answeredCount,
          s.totalQuestions, s.submittedAt, s.status, JSON.stringify(cleanedAnswers),
        ];
      }),
    ];
    await updateSheetRange(token, spreadsheetId, "Scores!A1", scoreValues);

    // ซิงค์การตั้งค่าระบบ
    await clearSheetRange(token, spreadsheetId, "Settings!A:B");
    const settingValues = [
      ["ชื่อการตั้งค่า", "ค่า"],
      ["teacherName", settings.teacherName],
      ["teacherEmail", settings.teacherEmail],
      ["role", settings.role],
      ["lockdown", settings.lockdown ? "TRUE" : "FALSE"],
      ["ipWhitelist", settings.ipWhitelist ? "TRUE" : "FALSE"],
      ["aiProctor", settings.aiProctor ? "TRUE" : "FALSE"],
      ["plagiarismCheck", settings.plagiarismCheck ? "TRUE" : "FALSE"],
      ["timezone", settings.timezone],
      ["startDuration", settings.startDuration.toString()],
    ];
    await updateSheetRange(token, spreadsheetId, "Settings!A1", settingValues);
    
  } catch (error) {
    console.error("Error syncing local data to sheets:", error);
    throw error;
  }
}

// 5. ดึงข้อมูลแบบยืนยันสิทธิ์ครู (แผงควบคุมคุณครู)
export async function fetchFromSheets(
  token: string,
  spreadsheetId: string
): Promise<{
  students: Student[];
  exams: Exam[];
  submissions: Submission[];
  settings: Partial<SystemSettings>;
} | null> {
  try {
    const fetchRange = async (range: string): Promise<any[][] | null> => {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      const data = await res.json();
      return data.values || null;
    };

    // ดึงรายชื่อนักเรียน
    const studentRows = await fetchRange("Students!A:C");
    const students: Student[] = [];
    if (studentRows && studentRows.length > 1) {
      for (let i = 1; i < studentRows.length; i++) {
        const row = studentRows[i];
        if (row[0] && row[0].toString().trim() !== "" && !row[0].toString().includes("รหัส")) {
          students.push({
            id: row[0].toString().trim(),
            name: row[1]?.toString() || "",
            className: row[2]?.toString() || "",
            department: row[2]?.toString() || "",
          });
        }
      }
    }

    // ดึงข้อมูลข้อสอบ
    const examRows = await fetchRange("Exams!A:G");
    const exams: Exam[] = [];
    if (examRows && examRows.length > 1) {
      for (let i = 1; i < examRows.length; i++) {
        const row = examRows[i];
        if (!row[0] || row[0].toString().includes("รหัส") || row[0].toString().trim() === "") continue;
        
        const qStr = row[4]?.toString().trim() || "";
        let questions = [];
        try {
          const cleanQStr = qStr.substring(qStr.indexOf("["), qStr.lastIndexOf("]") + 1);
          questions = JSON.parse(cleanQStr);
        } catch (e) {
          continue; 
        }
        
        exams.push({
          id: row[0].toString().trim(),
          title: row[1]?.toString() || "ข้อสอบไม่มีชื่อ",
          courseCode: row[2]?.toString() || "",
          description: row[3]?.toString() || "",
          questions: questions,
          timeLimitMinutes: parseInt(row[5]?.toString() || "60", 10),
          isActive: row[6]?.toString().toUpperCase() === "TRUE",
        });
      }
    }

    // ดึงผลคะแนนการส่งข้อสอบ
    const submissionRows = await fetchRange("Scores!A:M");
    const submissions: Submission[] = [];
    if (submissionRows && submissionRows.length > 1) {
      for (let i = 1; i < submissionRows.length; i++) {
        const row = submissionRows[i];
        if (row[0] && !row[0].toString().includes("รหัส")) {
          let detailedAnswers = {};
          try { detailedAnswers = JSON.parse(row[12]?.toString() || "{}"); } catch (e) {}
          submissions.push({
            submissionId: row[0].toString().trim(),
            studentId: row[1]?.toString() || "",
            studentName: row[2]?.toString() || "",
            studentClassName: row[3]?.toString() || "",
            examId: row[4]?.toString() || "",
            examTitle: row[5]?.toString() || "",
            score: parseFloat(row[6]?.toString() || "0"),
            totalPoints: parseFloat(row[7]?.toString() || "0"),
            answeredCount: parseInt(row[8]?.toString() || "0", 10),
            totalQuestions: parseInt(row[9]?.toString() || "0", 10),
            submittedAt: row[10]?.toString() || new Date().toISOString(),
            status: (row[11]?.toString() || "สมบูรณ์") as any,
            answers: detailedAnswers,
          });
        }
      }
    }

    // ดึงการตั้งค่าระบบ
    const settingRows = await fetchRange("Settings!A:B");
    const settings: Partial<SystemSettings> = {};
    if (settingRows && settingRows.length > 1) {
      for (let i = 1; i < settingRows.length; i++) {
        const row = settingRows[i];
        if (row[0]) {
          const key = row[0].toString().trim();
          const val = row[1]?.toString() || "";
          if (key === "teacherName") settings.teacherName = val;
          if (key === "teacherEmail") settings.teacherEmail = val;
          if (key === "role") settings.role = val;
          if (key === "lockdown") settings.lockdown = val.toUpperCase() === "TRUE";
          if (key === "ipWhitelist") settings.ipWhitelist = val.toUpperCase() === "TRUE";
          if (key === "aiProctor") settings.aiProctor = val.toUpperCase() === "TRUE";
          if (key === "plagiarismCheck") settings.plagiarismCheck = val.toUpperCase() === "TRUE";
          if (key === "timezone") settings.timezone = val;
          if (key === "startDuration") settings.startDuration = parseInt(val || "120", 10);
        }
      }
    }

    return { students, exams, submissions, settings };
  } catch (error) {
    console.error("Error fetching data from sheets:", error);
    return null;
  }
}

// 6. ดึงข้อมูลสาธารณะ (ฝั่งหน้าล็อกอินนักเรียน - ปลอดภัย เสถียรสูง 100%)
export async function fetchPublicSheetsData(spreadsheetId: string): Promise<{
  students: Student[];
  exams: Exam[];
  settings: Partial<SystemSettings>;
} | null> {
  const isPublishedToken = spreadsheetId.startsWith("2PACX-");

  const fetchTab = async (sheetName: string): Promise<any[][] | null> => {
    try {
      let url = isPublishedToken
        ? `https://docs.google.com/spreadsheets/d/e/${spreadsheetId}/pub?output=csv&sheet=${encodeURIComponent(sheetName)}`
        : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

      const res = await fetch(url);
      if (!res.ok) return null;
      const text = await res.text();

      if (isPublishedToken) {
        return parseCSV(text);
      } else {
        if (text.trim().startsWith("<!DOCTYPE html") || text.includes("google.com/accounts")) {
          throw new Error("ORGANIZATION_RESTRICTED");
        }
        const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);/);
        if (!match) return null;
        const json = JSON.parse(match[1]);
        return json.table?.rows ? json.table.rows.map((r: any) => r.c ? r.c.map((cell: any) => cell?.v ?? "") : []) : null;
      }
    } catch (e) {
      console.warn(`[Google Sheets] Quietly skipped tab [${sheetName}] fetching:`, e);
      return null;
    }
  };

  try {
    // ดูดข้อมูลนักเรียนกลับมาอย่างแม่นยำ
    const studentRows = await fetchTab("Students");
    const students: Student[] = [];
    if (studentRows && studentRows.length > 0) {
      for (const row of studentRows) {
        if (row[0] && row[0].toString().trim() !== "") {
          const idStr = row[0].toString().trim();
          if (idStr.toLowerCase().includes("id") || idStr.includes("รหัส")) continue;
          students.push({
            id: idStr,
            name: row[1]?.toString() || "",
            className: row[2]?.toString() || "",
            department: row[2]?.toString() || "",
          });
        }
      }
    }

    // ดูดข้อมูลระบบสอบและข้อสอบวิชาภาษาจีนกลับมาใช้งานได้ครบถ้วน
    const examRows = await fetchTab("Exams");
    const exams: Exam[] = [];
    if (examRows && examRows.length > 0) {
      for (const row of examRows) {
        if (row[0] && row[0].toString().trim() !== "") {
          const idStr = row[0].toString().trim();
          if (idStr.toLowerCase().includes("id") || idStr.includes("รหัส")) continue;
          
          const qStr = row[4] ? row[4].toString().trim() : "";
          let questions = [];
          try {
            const cleanQStr = qStr.substring(qStr.indexOf("["), qStr.lastIndexOf("]") + 1);
            questions = JSON.parse(cleanQStr);
          } catch (e) {
            continue; 
          }

          const rawActive = row[6] ? row[6].toString().trim().toUpperCase() : "";
          const isActiveStatus = rawActive === "TRUE" || rawActive === "1" || rawActive === "เปิดใช้งาน" || rawActive === "YES" || rawActive === "";
          
          exams.push({
            id: idStr,
            title: row[1]?.toString() || "ข้อสอบไม่มีชื่อ",
            courseCode: row[2]?.toString() || "",
            description: row[3]?.toString() || "",
            questions: questions,
            timeLimitMinutes: parseInt(row[5]?.toString() || "60", 10),
            isActive: isActiveStatus,
          });
        }
      }
    }

    // ดูดข้อมูลการตั้งค่าระบบ
    const settingRows = await fetchTab("Settings");
    const settings: Partial<SystemSettings> = {};
    if (settingRows && settingRows.length > 0) {
      for (const row of settingRows) {
        if (row[0]) {
          const key = row[0].toString().trim();
          const val = row[1]?.toString() || "";
          if (key === "teacherName") settings.teacherName = val;
          if (key === "teacherEmail") settings.teacherEmail = val;
          if (key === "role") settings.role = val;
          if (key === "lockdown") settings.lockdown = val.toUpperCase() === "TRUE" || val === "1";
          if (key === "ipWhitelist") settings.ipWhitelist = val.toUpperCase() === "TRUE" || val === "1";
          if (key === "aiProctor") settings.aiProctor = val.toUpperCase() === "TRUE" || val === "1";
          if (key === "plagiarismCheck") settings.plagiarismCheck = val.toUpperCase() === "TRUE" || val === "1";
          if (key === "timezone") settings.timezone = val;
          if (key === "startDuration") settings.startDuration = parseInt(val || "120", 10);
        }
      }
    }

    return { students, exams, settings };
  } catch (error) {
    console.error("Error in fetchPublicSheetsData:", error);
    return null;
  }
}

// 🛠️ ผสานข้อคำตอบของนักเรียนที่ดึงมาจากสเปรดชีตกับข้อมูลในเครื่อง / Firestore เพื่อดึงภาพวาดเขียนกลับคืนมา
export function mergeSubmissionsPreservingDrawings(
  sheetSubs: Submission[],
  localSubs: Submission[]
): Submission[] {
  return sheetSubs.map((sheetSub) => {
    const localSub = localSubs.find((l) => l.submissionId === sheetSub.submissionId);
    if (!localSub) return sheetSub;

    const mergedAnswers = sheetSub.answers ? { ...sheetSub.answers } : {};
    if (localSub.answers) {
      Object.keys(localSub.answers).forEach((qId) => {
        const localAns = localSub.answers[qId];
        const sheetAns = mergedAnswers[qId];

        if (localAns && typeof localAns === "object") {
          if (!sheetAns) {
            mergedAnswers[qId] = localAns;
          } else if (typeof sheetAns === "object") {
            const hasPlaceholder = sheetAns.drawing === "__HAS_DRAWING__" || !sheetAns.drawing;
            mergedAnswers[qId] = {
              ...sheetAns,
              drawing: hasPlaceholder && localAns.drawing ? localAns.drawing : sheetAns.drawing
            };
          }
        }
      });
    }

    return {
      ...sheetSub,
      answers: mergedAnswers
    };
  });
}

