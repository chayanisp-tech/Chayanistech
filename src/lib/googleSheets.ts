import { Student, Exam, Submission, SystemSettings } from "../types";

export interface SyncDataResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

// 🛠️ ฟังก์ชันสำหรับแกะข้อมูล CSV คุณภาพสูง (รองรับข้อมูลที่เป็นข้อสอบ JSON ของครูได้อย่างปลอดภัย)
function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  const lines = text.split(/\r?\n/);
  let currentLine: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    if (inQuotes) {
      currentCell += '\n';
    }
    
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

// Search for the "ExamMaster_Database" spreadsheet in Google Drive
export async function searchDatabaseSpreadsheet(token: string): Promise<string | null> {
  const query = encodeURIComponent("name = 'ExamMaster_Database' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error?.message || "Failed to search for Google Sheet in Google Drive");
    }
    
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error("Error in searchDatabaseSpreadsheet:", error);
    throw error;
  }
}

// Create a new "ExamMaster_Database" spreadsheet with worksheets: Students, Scores, Exams, Settings
export async function createDatabaseSpreadsheet(token: string): Promise<SyncDataResult> {
  const url = "https://sheets.googleapis.com/v4/spreadsheets";
  
  const body = {
    properties: {
      title: "ExamMaster_Database",
    },
    sheets: [
      { properties: { title: "Students" } },
      { properties: { title: "Scores" } },
      { properties: { title: "Exams" } },
      { properties: { title: "Settings" } },
    ],
  };
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error?.message || "Failed to create Google Sheet database");
    }
    
    const data = await res.json();
    return {
      spreadsheetId: data.spreadsheetId,
      spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    };
  } catch (error) {
    console.error("Error in createDatabaseSpreadsheet:", error);
    throw error;
  }
}

// Clear a worksheet range
async function clearSheetRange(token: string, spreadsheetId: string, range: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = await res.json();
    console.warn("Failed to clear sheet range:", range, err);
  }
}

// Update a worksheet range with values
async function updateSheetRange(token: string, spreadsheetId: string, range: string, values: any[][]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || `Failed to update range ${range}`);
  }
}

// Push local state completely to Google Sheets
export async function syncLocalToSheets(
  token: string,
  spreadsheetId: string,
  students: Student[],
  exams: Exam[],
  submissions: Submission[],
  settings: SystemSettings
): Promise<void> {
  try {
    // 1. Sync Students Roster
    await clearSheetRange(token, spreadsheetId, "Students!A:C");
    const studentValues = [
      ["รหัสนักเรียน (Student ID)", "ชื่อ-นามสกุล (Name)", "ชั้นเรียน (Class)"],
      ...students.map(s => [s.id, s.name, s.className]),
    ];
    await updateSheetRange(token, spreadsheetId, "Students!A1", studentValues);

    // 2. Sync Scores / Submissions
    await clearSheetRange(token, spreadsheetId, "Scores!A:M");
    const scoreValues = [
      [
        "รหัสการส่ง (Submission ID)",
        "รหัสนักเรียน (Student ID)",
        "ชื่อนักเรียน (Student Name)",
        "ชั้นเรียน (Class)",
        "รหัสข้อสอบ (Exam ID)",
        "ชื่อข้อสอบ (Exam Title)",
        "คะแนนที่ได้ (Score)",
        "คะแนนเต็ม (Total Points)",
        "ทำไปทั้งหมด (Answered Count)",
        "จำนวนข้อทั้งหมด (Total Questions)",
        "เวลาที่ส่ง (Submitted At)",
        "สถานะ (Status)",
        "คำตอบละเอียด JSON (Detailed Answers JSON)",
      ],
      ...submissions.map(s => [
        s.submissionId,
        s.studentId,
        s.studentName,
        s.studentClassName,
        s.examId,
        s.examTitle,
        s.score,
        s.totalPoints,
        s.answeredCount,
        s.totalQuestions,
        s.submittedAt,
        s.status,
        JSON.stringify(s.answers || {}),
      ]),
    ];
    await updateSheetRange(token, spreadsheetId, "Scores!A1", scoreValues);

    // 3. Sync Exams
    await clearSheetRange(token, spreadsheetId, "Exams!A:G");
    const examValues = [
      ["รหัสข้อสอบ (Exam ID)", "หัวข้อ (Title)", "รหัสวิชา (Course Code)", "คำอธิบาย (Description)", "คำถาม JSON (Questions JSON)", "เวลาสอบนาที (Time Limit Minutes)", "สถานะเปิดสอบ (Is Active)"],
      ...exams.map(e => [
        e.id,
        e.title,
        e.courseCode,
        e.description,
        JSON.stringify(e.questions),
        e.timeLimitMinutes,
        e.isActive ? "TRUE" : "FALSE",
      ]),
    ];
    await updateSheetRange(token, spreadsheetId, "Exams!A1", examValues);

    // 4. Sync Settings
    await clearSheetRange(token, spreadsheetId, "Settings!A:B");
    const settingValues = [
      ["ชื่อการตั้งค่า (Setting Name)", "ค่า (Value)"],
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
    console.error("Error in syncLocalToSheets:", error);
    throw error;
  }
}

// Pull sheets data from Google Spreadsheet down to local state
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
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.warn(`Failed to fetch sheet range: ${range}`);
        return null;
      }
      const data = await res.json();
      return data.values || null;
    };

    // 1. Fetch Students
    const studentRows = await fetchRange("Students!A:C");
    const students: Student[] = [];
    if (studentRows && studentRows.length > 1) {
      for (let i = 1; i < studentRows.length; i++) {
        const row = studentRows[i];
        if (row[0]) {
          students.push({
            id: row[0].toString().trim(),
            name: row[1]?.toString() || "",
            className: row[2]?.toString() || "",
            department: row[2]?.toString() || "",
          });
        }
      }
    }

    // 2. Fetch Exams
    const examRows = await fetchRange("Exams!A:G");
    const exams: Exam[] = [];
    if (examRows && examRows.length > 1) {
      for (let i = 1; i < examRows.length; i++) {
        const row = examRows[i];
        if (row[0]) {
          let questions = [];
          try {
            questions = JSON.parse(row[4]?.toString() || "[]");
          } catch (e) {
            console.error("Failed to parse questions JSON:", row[4]);
          }
          exams.push({
            id: row[0].toString().trim(),
            title: row[1]?.toString() || "",
            courseCode: row[2]?.toString() || "",
            description: row[3]?.toString() || "",
            questions: questions,
            timeLimitMinutes: parseInt(row[5]?.toString() || "60", 10),
            isActive: row[6]?.toString().toUpperCase() === "TRUE",
          });
        }
      }
    }

    // 3. Fetch Submissions / Scores
    const submissionRows = await fetchRange("Scores!A:M");
    const submissions: Submission[] = [];
    if (submissionRows && submissionRows.length > 1) {
      for (let i = 1; i < submissionRows.length; i++) {
        const row = submissionRows[i];
        if (row[0]) {
          let detailedAnswers = {};
          try {
            detailedAnswers = JSON.parse(row[12]?.toString() || "{}");
          } catch (e) {
            console.error("Failed to parse detailed answers JSON:", row[12]);
          }
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

    // 4. Fetch Settings
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
    console.error("Error in fetchFromSheets:", error);
    return null;
  }
}

// Fetch public sheets data (without OAuth token) - UPDATED DUAL MODE FOR PUBLIC/ORGANIZATION LINK
export async function fetchPublicSheetsData(spreadsheetId: string): Promise<{
  students: Student[];
  exams: Exam[];
  settings: Partial<SystemSettings>;
} | null> {
  const isPublishedToken = spreadsheetId.startsWith("2PACX-");

  const fetchTab = async (sheetName: string): Promise<any[][] | null> => {
    try {
      let url = "";
      if (isPublishedToken) {
        // Mode A: ลิงก์ระบบองค์กรโรงเรียนที่กดเผยแพร่เว็บ -> ดึงแบบ CSV ทะลุกำแพงล็อกอิน
        url = `https://docs.google.com/spreadsheets/d/e/${spreadsheetId}/pub?output=csv&sheet=${encodeURIComponent(sheetName)}`;
      } else {
        // Mode B: ลิงก์ตารางปกติ -> ดึงแบบ JSON Gviz
        url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Failed to fetch tab: ${sheetName}`);
        return null;
      }
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
        const table = json.table;
        if (!table || !table.rows) return null;
        return table.rows.map((r: any) => r.c ? r.c.map((cell: any) => cell?.v ?? "") : []);
      }
    } catch (e) {
      console.error(`Error in fetchTab [${sheetName}]:`, e);
      return null;
    }
  };

  try {
    // 1. Parse Students
    const studentRows = await fetchTab("Students");
    const students: Student[] = [];
    if (studentRows && studentRows.length > 0) {
      for (const row of studentRows) {
        if (row[0] !== undefined && row[0] !== null && row[0] !== "") {
          const idStr = row[0].toString().trim();
          if (idStr.toLowerCase().includes("id") || idStr.includes("รหัส") || idStr === "") {
            continue;
          }
          students.push({
            id: idStr,
            name: row[1]?.toString() || "",
            className: row[2]?.toString() || "",
            department: row[2]?.toString() || "",
          });
        }
      }
    }

    // 2. Parse Exams
    const examRows = await fetchTab("Exams");
    const exams: Exam[] = [];
    if (examRows && examRows.length > 0) {
      for (const row of examRows) {
        if (row[0]) {
          const idStr = row[0].toString().trim();
          if (idStr.toLowerCase().includes("id") || idStr.includes("รหัส")) {
            continue;
          }
          let questions = [];
          try {
            questions = JSON.parse(row[4]?.toString() || "[]");
          } catch (e) {
            console.error("Failed to parse questions JSON:", row[4]);
          }
          exams.push({
            id: idStr,
            title: row[1]?.toString() || "",
            courseCode: row[2]?.toString() || "",
            description: row[3]?.toString() || "",
            questions: questions,
            timeLimitMinutes: parseInt(row[5]?.toString() || "60", 10),
            isActive: row[6]?.toString().toUpperCase() === "TRUE" || row[6]?.toString() === "1",
          });
        }
      }
    }

    // 3. Parse Settings
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
