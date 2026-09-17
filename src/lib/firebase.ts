import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";

import { initializeFirestore } from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
} from "firebase/storage";

import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId || "(default)"
);

export const storage = getStorage(app);

/**
 * ==========================================================
 * 1. Provider สำหรับ LOGIN ครูเท่านั้น
 * ไม่ขอสิทธิ์ Google Drive / Sheets
 * ==========================================================
 */
const teacherProvider = new GoogleAuthProvider();

teacherProvider.setCustomParameters({
  prompt: "select_account",
});

/**
 * ==========================================================
 * 2. Provider สำหรับเชื่อม Google Sheets / Drive
 * จะเรียกเฉพาะตอนครูกดเชื่อมต่อเอง
 * ==========================================================
 */
const workspaceProvider = new GoogleAuthProvider();

workspaceProvider.addScope(
  "https://www.googleapis.com/auth/drive.file"
);

workspaceProvider.addScope(
  "https://www.googleapis.com/auth/spreadsheets"
);

workspaceProvider.setCustomParameters({
  prompt: "consent",
});

let cachedAccessToken: string | null = null;

/**
 * ติดตามสถานะ Firebase Authentication
 */
export const initAuth = (
  onAuthSuccess?: (user: User) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      onAuthSuccess?.(user);
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
};

/**
 * Login ครูด้วย Google
 *
 * remember = true
 * ปิด browser แล้วกลับมายังจำบัญชีไว้
 */
export const teacherGoogleSignIn = async (
  remember: boolean = true
): Promise<User> => {
  await setPersistence(
    auth,
    remember
      ? browserLocalPersistence
      : browserSessionPersistence
  );

  const result = await signInWithPopup(
    auth,
    teacherProvider
  );

  return result.user;
};

/**
 * เชื่อม Google Workspace
 *
 * ใช้เฉพาะเวลาครูต้องการ
 * Import / Export Google Sheets
 */
export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  const result = await signInWithPopup(
    auth,
    workspaceProvider
  );

  const credential =
    GoogleAuthProvider.credentialFromResult(result);

  if (!credential?.accessToken) {
    throw new Error(
      "ไม่สามารถรับ Google access token ได้"
    );
  }

  /**
   * ไม่เก็บ OAuth token ลง localStorage
   * เพราะเป็นข้อมูลสำคัญ
   */
  cachedAccessToken = credential.accessToken;

  return {
    user: result.user,
    accessToken: credential.accessToken,
  };
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessToken = (
  token: string | null
) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  cachedAccessToken = null;
  await signOut(auth);
};

/**
 * อัปโหลดภาพคำตอบแบบวาด
 * ไปยัง Firebase Storage
 */
export const uploadDrawingToStorage = async (
  base64String: string,
  studentId: string,
  questionId: string
): Promise<string> => {
  const fileName =
    `exam_drawings/${studentId}_` +
    `${questionId}_${Date.now()}.png`;

  const storageRef = ref(
    storage,
    fileName
  );

  await uploadString(
    storageRef,
    base64String,
    "data_url"
  );

  return await getDownloadURL(storageRef);
};
