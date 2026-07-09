export interface Student {
  id: string; // 5-digit ID (e.g., "10001")
  name: string;
  className: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  answerIndex: number; // 0-based index
  points: number;
  type?: "choice" | "subjective";
}

export interface Exam {
  id: string;
  title: string;
  courseCode: string; // e.g. "CHN101"
  description: string;
  questions: Question[];
  timeLimitMinutes: number;
  isActive: boolean;
}

export interface Submission {
  submissionId: string; // e.g., "EX-998241"
  studentId: string;
  studentName: string;
  studentClassName: string;
  examId: string;
  examTitle: string;
  score: number;
  totalPoints: number;
  answeredCount: number;
  totalQuestions: number;
  submittedAt: string; // ISO string
  status: "สมบูรณ์" | "ไม่สมบูรณ์" | "ทุจริต";
  answers?: Record<string, any>;
}

export interface SystemSettings {
  teacherName: string;
  teacherEmail: string;
  role: string;
  lockdown: boolean;
  ipWhitelist: boolean;
  aiProctor: boolean;
  plagiarismCheck: boolean;
  timezone: string;
  startDuration: number; // in minutes (slider)
}

export interface SyncStatus {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  error: string | null;
}
