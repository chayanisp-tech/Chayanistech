import { db, auth } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc, 
  deleteDoc, 
  writeBatch,
  getDocFromServer
} from "firebase/firestore";
import { Student, Exam, Submission, SystemSettings } from "../types";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorMsg,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  const isOfflineOrPermission = 
    errorMsg.toLowerCase().includes("offline") || 
    errorMsg.toLowerCase().includes("network") ||
    errorMsg.toLowerCase().includes("unreachable") ||
    errorMsg.toLowerCase().includes("failed-precondition") ||
    errorMsg.toLowerCase().includes("permission-denied") ||
    errorMsg.toLowerCase().includes("insufficient permissions");

  if (isOfflineOrPermission) {
    console.warn(`[Firestore Safe-Fallback] ${operationType} on ${path}: ${errorMsg}`);
    // Do NOT throw for offline or permission errors so the calling functions can fallback to localStorage or state gracefully.
  } else {
    console.error("Firestore Error: ", JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }
}

// 1. Connection check
export async function testConnection() {
  const path = "test/connection";
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore client appears offline or misconfigured:", error.message);
    }
  }
}

// 2. Exams sync
export async function saveExamToFirestore(exam: Exam): Promise<void> {
  const path = `exams/${exam.id}`;
  try {
    await setDoc(doc(db, "exams", exam.id), exam);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteExamFromFirestore(examId: string): Promise<void> {
  const path = `exams/${examId}`;
  try {
    await deleteDoc(doc(db, "exams", examId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncExamsToFirestore(updatedExams: Exam[]): Promise<void> {
  const path = "exams";
  try {
    const existing = await fetchExamsFromFirestore();
    const currentIds = new Set(updatedExams.map(e => e.id));
    
    // Delete removed exams
    for (const exam of existing) {
      if (!currentIds.has(exam.id)) {
        await deleteExamFromFirestore(exam.id);
      }
    }
    
    // Write/update current exams
    for (const exam of updatedExams) {
      await saveExamToFirestore(exam);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchExamsFromFirestore(): Promise<Exam[]> {
  const path = "exams";
  try {
    const querySnapshot = await getDocs(collection(db, "exams"));
    const list: Exam[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Exam);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// 3. Students sync
export async function saveStudentsToFirestore(students: Student[]): Promise<void> {
  const path = "students";
  try {
    const batch = writeBatch(db);
    // Delete existing students if needed? To keep it simpler and batch-friendly, 
    // we can save each student in the list.
    for (const student of students) {
      const studentRef = doc(db, "students", student.id);
      batch.set(studentRef, student);
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncStudentsToFirestore(updatedStudents: Student[]): Promise<void> {
  const path = "students";
  try {
    const existing = await fetchStudentsFromFirestore();
    const currentIds = new Set(updatedStudents.map(s => s.id));
    
    // Delete removed students
    for (const student of existing) {
      if (!currentIds.has(student.id)) {
        await deleteDoc(doc(db, "students", student.id));
      }
    }
    
    // Write current students
    const batch = writeBatch(db);
    for (const student of updatedStudents) {
      const ref = doc(db, "students", student.id);
      batch.set(ref, student);
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchStudentsFromFirestore(): Promise<Student[]> {
  const path = "students";
  try {
    const querySnapshot = await getDocs(collection(db, "students"));
    const list: Student[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Student);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// 4. Settings sync
export async function saveSettingsToFirestore(settings: SystemSettings): Promise<void> {
  const path = "settings/global";
  try {
    await setDoc(doc(db, "settings", "global"), settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchSettingsFromFirestore(): Promise<SystemSettings | null> {
  const path = "settings/global";
  try {
    const docSnap = await getDoc(doc(db, "settings", "global"));
    if (docSnap.exists()) {
      return docSnap.data() as SystemSettings;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// 5. Submissions sync
export async function saveSubmissionToFirestore(submission: Submission): Promise<void> {
  const path = `submissions/${submission.submissionId}`;
  try {
    await setDoc(doc(db, "submissions", submission.submissionId), submission);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchSubmissionsFromFirestore(): Promise<Submission[]> {
  const path = "submissions";
  try {
    const querySnapshot = await getDocs(collection(db, "submissions"));
    const list: Submission[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Submission);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function syncSubmissionsToFirestore(updatedSubmissions: Submission[]): Promise<void> {
  const path = "submissions";
  try {
    // 1. Write/update current submissions first
    for (const sub of updatedSubmissions) {
      try {
        await saveSubmissionToFirestore(sub);
      } catch (writeErr) {
        console.warn(`[Firestore Resilient] Failed to write submission ${sub.submissionId}:`, writeErr);
      }
    }
    
    // 2. Only attempt to delete removed submissions if authenticated (teachers/admins)
    if (auth.currentUser) {
      try {
        const existing = await fetchSubmissionsFromFirestore();
        const currentIds = new Set(updatedSubmissions.map(s => s.submissionId));
        
        for (const sub of existing) {
          if (!currentIds.has(sub.submissionId)) {
            await deleteDoc(doc(db, "submissions", sub.submissionId));
          }
        }
      } catch (deleteErr) {
        console.warn("[Firestore Resilient] Failed to delete removed submissions (likely permission restricted):", deleteErr);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 6. Complete Batch Sync function
export async function pushAllToFirestore(
  students: Student[],
  exams: Exam[],
  submissions: Submission[],
  settings: SystemSettings
): Promise<void> {
  try {
    // 1. Save Settings
    await saveSettingsToFirestore(settings);
    
    // 2. Save Students (Batch write)
    await saveStudentsToFirestore(students);
    
    // 3. Save Exams
    for (const exam of exams) {
      await saveExamToFirestore(exam);
    }
    
    // 4. Save Submissions
    for (const submission of submissions) {
      await saveSubmissionToFirestore(submission);
    }
  } catch (error) {
    console.error("Batch push to Firestore failed:", error);
    throw error;
  }
}

// 7. Full Fetch from Firestore function
export async function pullAllFromFirestore(): Promise<{
  students: Student[];
  exams: Exam[];
  submissions: Submission[];
  settings: SystemSettings | null;
} | null> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      console.warn("Navigator is offline. Skipping Firestore pull.");
      return null;
    }

    const [students, exams, submissions, settings] = await Promise.all([
      fetchStudentsFromFirestore(),
      fetchExamsFromFirestore(),
      fetchSubmissionsFromFirestore(),
      fetchSettingsFromFirestore(),
    ]);

    // If we are offline or unauthorized and all return empty values due to caught error warnings
    if (students.length === 0 && exams.length === 0 && submissions.length === 0 && settings === null) {
      console.log("No data retrieved from Firestore (either database is empty or offline fallback was triggered).");
      return null;
    }

    return { students, exams, submissions, settings };
  } catch (error) {
    console.warn("Batch pull from Firestore failed:", error);
    return null;
  }
}
