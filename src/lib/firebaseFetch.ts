import { db } from "./firebase"; // ดึง db มาจากไฟล์ firebase.ts ที่ครูส่งมา
import { collection, getDocs, query, where } from "firebase/firestore";
import { Student, Submission, Exam } from "../types";

// ฟังก์ชันสำหรับดึงข้อมูลให้นักเรียนเข้าสอบ (ยิงตรงเข้า Firebase ไม่ผ่าน Sheets)
export const fetchStudentExamDataFromFirebase = async () => {
  try {
    // 1. ดึงรายชื่อนักเรียนทั้งหมดจากคอลเลกชัน 'students'
    const studentsSnapshot = await getDocs(collection(db, "students"));
    const studentsList = studentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Student[];

    // 2. ดึงข้อมูลการส่งข้อสอบทั้งหมดจากคอลเลกชัน 'submissions'
    const submissionsSnapshot = await getDocs(collection(db, "submissions"));
    const submissionsList = submissionsSnapshot.docs.map((doc) => ({
      submissionId: doc.id,
      ...doc.data(),
    })) as unknown as Submission[];

    // 3. ดึงเฉพาะข้อสอบที่ "เปิดใช้งานอยู่" (isActive: true) จากคอลเลกชัน 'exams'
    const examsQuery = query(collection(db, "exams"), where("isActive", "==", true));
    const examsSnapshot = await getDocs(examsQuery);
    const activeExamsList = examsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Exam[];

    // ส่งข้อมูลทั้ง 3 มัดกลับไปให้หน้าจอนักเรียนใช้งาน
    return {
      students: studentsList,
      submissions: submissionsList,
      activeExams: activeExamsList,
    };
  } catch (error) {
    console.error("Firebase fetch error:", error);
    throw new Error("ไม่สามารถดึงข้อมูลข้อสอบจากระบบคลาวด์ของเว็บได้");
  }
};
