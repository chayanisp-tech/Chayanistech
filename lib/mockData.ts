import { Student, Exam, SystemSettings, Submission } from "../types";

export const DEFAULT_STUDENTS: Student[] = [
  { id: "10001", name: "นายกิตติภพ แซ่ตั้ง", className: "ม.5/1" },
  { id: "10002", name: "นางสาวจิราภรณ์ แซ่ลิ้ม", className: "ม.5/1" },
  { id: "10003", name: "นายณัฐวุฒิ สมจิตต์", className: "ม.5/2" },
  { id: "10004", name: "นางสาวพัชราภรณ์ ยิ่งดี", className: "ม.5/2" },
  { id: "10005", name: "เด็กชายธนภัทร รักษ์สุข", className: "ม.4/1" },
  { id: "20001", name: "นางสาวชญานิษฐ์ พรพนา", className: "ม.6/2" },
  { id: "20002", name: "นายวีรยุทธ เลิศปัญญา", className: "ม.6/2" },
];

export const DEFAULT_EXAMS: Exam[] = [
  {
    id: "EX-CHN001",
    title: "วิชาภาษาจีน 1",
    courseCode: "CHN101",
    description: "แบบทดสอบวัดความรู้พื้นฐานภาษาจีนกลาง คำศัพท์เบื้องต้นและพินอิน",
    timeLimitMinutes: 40,
    isActive: true,
    questions: [
      {
        id: "Q1",
        text: "คำศัพท์คำว่า '你好' (nǐ hǎo) มีความหมายตรงกับคำใดในภาษาไทย?",
        options: ["สวัสดี", "ขอบคุณ", "ขอโทษ", "ลาก่อน"],
        answerIndex: 0,
        points: 10,
      },
      {
        id: "Q2",
        text: "คำศัพท์คำว่า '谢谢' (xièxie) มีความหมายตรงกับคำใดในภาษาไทย?",
        options: ["ยินดีต้อนรับ", "ไม่เป็นไร", "สวัสดี", "ขอบคุณ"],
        answerIndex: 3,
        points: 10,
      },
      {
        id: "Q3",
        text: "พยัญชนะพินอิน 'b' ออกเสียงตรงกับเสียงพยัญชนะไทยในข้อใด?",
        options: ["พ / พาน", "ม / ม้า", "บ / ใบไม้", "ฟ / ฟัน"],
        answerIndex: 2,
        points: 10,
      },
      {
        id: "Q4",
        text: "คำว่า '再见' (zàijiàn) มีความหมายตรงกับคำใดในภาษาไทย?",
        options: ["ขอโทษ", "ลาก่อน / พบกันใหม่", "ไม่เป็นไร", "สบายดีไหม"],
        answerIndex: 1,
        points: 10,
      },
    ],
  },
  {
    id: "EX-CHN002",
    title: "ไวยากรณ์ภาษาจีนเบื้องต้น",
    courseCode: "CHN102",
    description: "การจัดเรียงประโยคเบื้องต้น (S + V + O) และลักษณะนาม",
    timeLimitMinutes: 60,
    isActive: true,
    questions: [
      {
        id: "Q2-1",
        text: "ประโยคในข้อใดเรียงลำดับถูกต้องตามไวยากรณ์ภาษาจีน 'ฉันกินข้าว'?",
        options: [
          "我吃饭 (Wǒ chī fàn)",
          "饭我吃 (Fàn wǒ chī)",
          "我饭吃 (Wǒ fàn chī)",
          "吃我饭 (Chī wǒ fàn)"
        ],
        answerIndex: 0,
        points: 10,
      },
      {
        id: "Q2-2",
        text: "คำว่า '这' (zhè) หมายถึงข้อใด?",
        options: ["นั่น", "นี่", "ไหน", "ใคร"],
        answerIndex: 1,
        points: 10,
      },
      {
        id: "Q2-3",
        text: "คำลักษณนาม '个' (gè) ใช้กับสิ่งใดบ่อยที่สุด?",
        options: ["คนหรือสิ่งของทั่วไป", "หนังสือ", "ปากกา", "รถยนต์"],
        answerIndex: 0,
        points: 10,
      },
    ],
  },
];

export const DEFAULT_SETTINGS: SystemSettings = {
  teacherName: "ครูชญานิศ พรหมจันทร์",
  teacherEmail: "chayanisp@banmuang.ac.th",
  role: "อาจารย์ผู้สอนวิชาภาษาจีน",
  lockdown: true,
  ipWhitelist: false,
  aiProctor: true,
  plagiarismCheck: true,
  timezone: "กรุงเทพฯ (UTC+07:00)",
  startDuration: 120,
};

export const DEFAULT_SUBMISSIONS: Submission[] = [
  {
    submissionId: "EX-998241",
    studentId: "10001",
    studentName: "นายกิตติภพ แซ่ตั้ง",
    studentClassName: "ม.5/1",
    examId: "EX-CHN001",
    examTitle: "วิชาภาษาจีน 1",
    score: 40,
    totalPoints: 40,
    answeredCount: 4,
    totalQuestions: 4,
    submittedAt: "2026-07-09T00:21:19.000Z",
    status: "สมบูรณ์",
  },
  {
    submissionId: "EX-998242",
    studentId: "10002",
    studentName: "นางสาวจิราภรณ์ แซ่ลิ้ม",
    studentClassName: "ม.5/1",
    examId: "EX-CHN001",
    examTitle: "วิชาภาษาจีน 1",
    score: 30,
    totalPoints: 40,
    answeredCount: 4,
    totalQuestions: 4,
    submittedAt: "2026-07-09T00:32:00.000Z",
    status: "สมบูรณ์",
  },
];
