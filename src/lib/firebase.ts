import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || "(default)");
export const googleProvider = new GoogleAuthProvider();
// Request workspace scopes for Drive and Sheets
googleProvider.addScope("https://www.googleapis.com/auth/drive.file");
googleProvider.addScope("https://www.googleapis.com/auth/spreadsheets");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = localStorage.getItem("temp_oauth_token"); // backup within the safe context if needed, but in-memory is preferred. We will fallback to local storage or re-auth
        if (cachedAccessToken) {
          if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        } else {
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem("temp_oauth_token");
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) {
    console.warn("Google sign-in is already in progress, skipping duplicate request.");
    return null;
  }
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get access token from Firebase Auth");
    }

    cachedAccessToken = credential.accessToken;
    // Cache inside localStorage to prevent loss on HMR or iframe soft reload, but keep secure
    localStorage.setItem("temp_oauth_token", cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Sign in error:", error);
    
    if (error && error.code === "auth/unauthorized-domain") {
      throw new Error(
        "UNAUTHORIZED_DOMAIN: โดเมนของเว็บบน Vercel ยังไม่ได้รับอนุญาตให้ใช้บริการลงชื่อเข้าใช้งานของ Firebase Project นี้! " +
        "กรุณานำโดเมน Vercel ของคุณ (เช่น " + (typeof window !== "undefined" ? window.location.hostname : "ตัวอย่าง.vercel.app") + ") ไปเพิ่มที่ 'Authorized domains' ในระบบตั้งค่า Firebase Authentication"
      );
    }
    
    if (error && (error.code === "auth/popup-blocked" || error.message?.includes("popup-blocked"))) {
      throw new Error(
        "POPUP_BLOCKED: หน้าต่างลงชื่อเข้าใช้ถูกบล็อกโดยตัวบล็อกป๊อปอัป (Popup Blocker) ของเบราว์เซอร์คุณ " +
        "กรุณาอนุญาตป๊อปอัพสำหรับเว็บนี้ หรือตรวจสอบการอนุญาตป๊อปอัพในเบราว์เซอร์ของคุณแล้วลองใหม่อีกครั้ง"
      );
    }

    // Provide a detailed Thai error description for iframe / popup blocking issues
    if (error && (error.code === "auth/cancelled-popup-request" || error.message?.includes("cancelled-popup-request"))) {
      throw new Error(
        "IFRAME_POPUP_BLOCKED: เบราว์เซอร์ปฏิเสธหรือยกเลิกการเปิดหน้าต่าง Google Auth เนื่องจากแอปทำงานอยู่ในกรอบจำลอง (iFrame) " +
        "กรุณาคลิกปุ่ม 'เปิดในแท็บใหม่' (ปุ่มไอคอนเหลี่ยมลูกศรชี้ขึ้นทางขวาบน) เพื่อใช้งานในแท็บเต็ม และเชื่อมต่อ Google Sheets ได้สำเร็จ"
      );
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken || localStorage.getItem("temp_oauth_token");
};

export const setAccessToken = (token: string) => {
  cachedAccessToken = token;
  localStorage.setItem("temp_oauth_token", token);
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem("temp_oauth_token");
};
