import React, { useState } from "react";

import {
  teacherGoogleSignIn,
  logout,
} from "../lib/firebase";

interface TeacherLoginProps {
  onLoginSuccess: (
    email: string,
    isOAuthConnected: boolean
  ) => void;

  onGoBack: () => void;
}

/**
 * บัญชีที่ได้รับอนุญาตให้เป็นครู
 *
 * อีเมลไม่ใช่ secret
 * Security จริงจะถูกบังคับซ้ำใน
 * Firestore Rules ในขั้นถัดไป
 */
const ALLOWED_TEACHER_EMAILS = new Set([
  "chayanisp@banmuang.ac.th",
]);

export default function TeacherLogin({
  onLoginSuccess,
  onGoBack,
}: TeacherLoginProps) {
  const [rememberMe, setRememberMe] =
    useState(true);

  const [isLoggingIn, setIsLoggingIn] =
    useState(false);

  const [errorText, setErrorText] =
    useState("");

  const handleGoogleLogin = async () => {
    if (isLoggingIn) return;

    setIsLoggingIn(true);
    setErrorText("");

    try {
      const user =
        await teacherGoogleSignIn(
          rememberMe
        );

      const email = (
        user.email || ""
      )
        .trim()
        .toLowerCase();

      /**
       * ตรวจว่าเป็นบัญชีครูที่อนุญาต
       */
      if (
        !email ||
        !ALLOWED_TEACHER_EMAILS.has(email)
      ) {
        await logout();

        setErrorText(
          "บัญชี Google นี้ไม่ได้รับสิทธิ์เข้าถึงระบบสำหรับครู"
        );

        return;
      }

      /**
       * false =
       * Login แล้ว แต่ยังไม่ได้อนุญาต
       * Google Drive / Sheets
       */
      onLoginSuccess(
        email,
        false
      );
    } catch (error: any) {
      console.error(
        "Teacher login failed:",
        error
      );

      if (
        error?.code ===
        "auth/popup-closed-by-user"
      ) {
        setErrorText(
          "ยกเลิกการเข้าสู่ระบบ"
        );
      } else if (
        error?.code ===
        "auth/popup-blocked"
      ) {
        setErrorText(
          "เบราว์เซอร์บล็อกหน้าต่าง Google กรุณาอนุญาต Popup แล้วลองใหม่"
        );
      } else if (
        error?.code ===
        "auth/unauthorized-domain"
      ) {
        setErrorText(
          "โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Authentication"
        );
      } else {
        setErrorText(
          "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองอีกครั้ง"
        );
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff8f7] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[460px]">

        <button
          type="button"
          onClick={onGoBack}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#8f4a46] hover:text-[#8e171c]"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>

          กลับหน้าหลักนักเรียน
        </button>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2">
            <span
              className="material-symbols-outlined text-[#8e171c] text-4xl"
            >
              school
            </span>

            <span className="text-3xl font-black text-[#8e171c]">
              ExamMaster Pro
            </span>
          </div>

          <p className="mt-2 text-sm text-[#8c706e]">
            ระบบจัดการข้อสอบสำหรับครู
          </p>
        </div>

        <div className="bg-white border border-[#e0bfbc]/60 rounded-3xl p-8 shadow-sm">

          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold text-[#251817]">
              เข้าสู่ระบบสำหรับครู
            </h1>

            <p className="text-sm text-[#59413f] mt-2">
              ใช้บัญชี Google ของครูเพื่อยืนยันตัวตน
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="
              w-full
              bg-[#8e171c]
              hover:bg-[#791318]
              text-white
              font-bold
              py-3.5
              rounded-full
              transition
              flex
              items-center
              justify-center
              gap-3
              disabled:opacity-60
            "
          >
            {isLoggingIn ? (
              <>
                <span className="material-symbols-outlined animate-spin">
                  progress_activity
                </span>

                กำลังเข้าสู่ระบบ...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">
                  login
                </span>

                เข้าสู่ระบบด้วย Google
              </>
            )}
          </button>

          <label className="mt-5 flex items-center justify-center gap-2 text-sm text-[#59413f] cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) =>
                setRememberMe(
                  e.target.checked
                )
              }
              className="h-4 w-4"
            />

            จดจำการเข้าสู่ระบบบนอุปกรณ์นี้
          </label>

          {errorText && (
            <div className="mt-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center font-semibold">
              {errorText}
            </div>
          )}

          <div className="mt-7 p-4 rounded-2xl bg-[#fff3f2] text-xs text-[#704844] leading-relaxed">
            ระบบจะขอเพียงข้อมูลสำหรับยืนยันตัวตนในขั้นตอนนี้
            การเชื่อม Google Sheets หรือ Google Drive
            จะเกิดขึ้นเฉพาะเมื่อครูกดเชื่อมต่อจากหน้าจัดการข้อมูล
          </div>

        </div>
      </div>
    </div>
  );
}
